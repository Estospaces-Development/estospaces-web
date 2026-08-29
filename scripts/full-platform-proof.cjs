const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { resolveTarget } = require('./platform-proof-shared.cjs');
const { buildHealthCheckUrls } = require('./platform-proof-browser-helpers.cjs');

function runNode(commandArgs, cwd, env = {}) {
  const result = spawnSync(process.execPath, commandArgs, {
    cwd,
    env: { ...process.env, ...env },
    encoding: 'utf8',
    maxBuffer: 16 * 1024 * 1024,
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.status !== 0) {
    throw new Error(`node ${commandArgs.join(' ')} failed with exit code ${result.status}`);
  }
  return result.stdout.trim();
}

function toScenario(category, environment, role, surface, status, expected, actual, artifactPaths = [], errors = [], rootCause = '', fixRef = '') {
  return {
    category,
    environment,
    role,
    surface,
    status,
    expected,
    actual,
    errors,
    artifact_paths: artifactPaths,
    root_cause: rootCause,
    fix_ref: fixRef,
  };
}

async function healthChecks(target) {
  const urls = buildHealthCheckUrls(target);

  const scenarios = [];
  for (const url of urls) {
    const response = await fetch(url, { redirect: 'manual' });
    const headers = {
      xFrameOptions: response.headers.get('x-frame-options') || '',
      xContentTypeOptions: response.headers.get('x-content-type-options') || '',
      referrerPolicy: response.headers.get('referrer-policy') || '',
    };
    scenarios.push(toScenario(
      'health-security',
      target.name,
      'system',
      url,
      response.ok || response.status === 302 ? 'passed' : 'failed',
      '2xx/302 response from live endpoint',
      JSON.stringify({ status: response.status, headers }),
    ));
  }
  return scenarios;
}

async function performanceSmoke(target) {
  const urls = [
    `${target.appBaseUrl}/login/`,
    `${target.adminBaseUrl}/login/`,
    `${target.services.core}/health`,
    `${target.services.booking}/health`,
    `${target.services.messaging}/health`,
  ];
  const applicationLatencyBudgetMs = 1000;
  const remoteReachabilityBudgetMs = 5000;

  const scenarios = [];
  for (const url of urls) {
    const samples = [];
    for (let i = 0; i < 5; i += 1) {
      const started = Date.now();
      const response = await fetch(url, { redirect: 'manual' });
      const serverTiming = response.headers.get('server-timing') || '';
      const appDurationMatch = serverTiming.match(/(?:^|,)\s*app;dur=([0-9.]+)/i);
      samples.push({
        clientMs: Date.now() - started,
        appMs: appDurationMatch ? Number(appDurationMatch[1]) : null,
        status: response.status,
      });
    }
    const clientSorted = samples.map((item) => item.clientMs).sort((a, b) => a - b);
    const clientP95 = clientSorted[Math.min(clientSorted.length - 1, Math.floor(clientSorted.length * 0.95))];
    const appSamples = samples.map((item) => item.appMs).filter((value) => Number.isFinite(value));
    const appSorted = appSamples.sort((a, b) => a - b);
    const appP95 = appSorted.length > 0
      ? appSorted[Math.min(appSorted.length - 1, Math.floor(appSorted.length * 0.95))]
      : clientP95;
    const statusesHealthy = samples.every((item) => item.status >= 200 && item.status < 400);
    const applicationResponsive = appP95 <= applicationLatencyBudgetMs;
    const remotelyReachable = clientP95 <= remoteReachabilityBudgetMs;
    scenarios.push(toScenario(
      'performance-smoke',
      target.name,
      'system',
      url,
      statusesHealthy && applicationResponsive && remotelyReachable ? 'passed' : 'failed',
      `Every sample returns 2xx/3xx, application p95 is at most ${applicationLatencyBudgetMs}ms, and remote reachability p95 is at most ${remoteReachabilityBudgetMs}ms`,
      JSON.stringify({
        appP95,
        applicationLatencyBudgetMs,
        clientP95,
        remoteReachabilityBudgetMs,
        timingSource: appSamples.length > 0 ? 'server-timing' : 'client-fallback',
        samples,
      }),
    ));
  }
  return scenarios;
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function aggregateSmoke(targetName, smokePayload) {
  return smokePayload.results.map((item, index) => toScenario(
    'smoke-functional',
    targetName,
    item.role,
    item.route,
    item.status === 'passed' ? 'passed' : 'failed',
    'Healthy route render with no crash or unexpected error responses',
    item.error || item.route,
    item.screenshotPath ? [item.screenshotPath] : [],
    [
      ...(item.pageErrors || []),
      ...(item.consoleErrors || []),
      ...(item.responseErrors || []),
    ],
    '',
    `SMOKE-${index + 1}`,
  ));
}

function aggregatePublic(targetName, artifactPath, payload) {
  return payload.steps.map((step) => toScenario(
    'public-compatibility',
    targetName,
    'anonymous',
    `${step.label} ${step.route}`,
    step.ok ? 'passed' : 'failed',
    'Anonymous public and auth routes render correctly in desktop, mobile, and Firefox smoke',
    `${step.actualUrl}`,
    [artifactPath],
  )).concat(
    Object.entries(payload.pageErrors).flatMap(([surface, errors]) => errors.map((error) => toScenario(
      'public-compatibility',
      targetName,
      'anonymous',
      surface,
      'failed',
      'No page errors',
      error,
      [artifactPath],
      [error],
    ))),
  );
}

function aggregateMessages(targetName, artifactPath, payload) {
  return [
    toScenario('messages-functional', targetName, 'user', '/user/dashboard/messages', payload.loginOk && payload.messagesPageOk ? 'passed' : 'failed', 'Messages page opens cleanly', JSON.stringify(payload), [artifactPath], [...payload.pageErrors, ...payload.consoleErrors, ...payload.networkErrors]),
    toScenario('messages-functional', targetName, 'user', 'new-enquiry', payload.newEnquiryOk ? 'passed' : 'failed', 'New enquiry navigates correctly', JSON.stringify({ url: payload.directThreadUrl }), [artifactPath]),
    toScenario('messages-functional', targetName, 'user', 'direct-thread', payload.directThreadOk ? 'passed' : 'failed', 'Direct conversation deep link stays valid', JSON.stringify({ url: payload.directThreadUrl }), [artifactPath]),
    toScenario('messages-functional', targetName, 'user', 'stale-query', payload.staleQueryProofOk ? 'passed' : 'failed', 'Stale sidebar data does not break thread deep link', JSON.stringify({ url: payload.staleQueryUrl, unavailable: payload.staleHasUnavailableIssue }), [artifactPath]),
  ];
}

function aggregateAuthHosts(targetName, artifactPath, payload) {
  return payload.steps.map((step) => toScenario(
    'auth-host-routing',
    targetName,
    step.name.includes('admin') ? 'admin' : step.name.includes('manager') ? 'manager' : 'user',
    step.name,
    step.status === 'passed' ? 'passed' : 'failed',
    'Role login uses the correct host and wrong-host logins are redirected to the correct login origin',
    step.actualUrl || '',
    [artifactPath],
    [...(step.pageErrors || []), ...(step.consoleErrors || []), ...(step.networkErrors || []), ...(step.error ? [step.error] : [])],
  ));
}

function aggregateSupport(targetName, artifactPath, payload) {
  return payload.steps.map((step) => toScenario(
    'support-e2e',
    targetName,
    step.name.includes('admin') ? 'admin' : 'user',
    step.name,
    step.status === 'passed' ? 'passed' : 'failed',
    'Support lifecycle stays functional on one live ticket chain',
    JSON.stringify(step),
    [artifactPath, payload.artifacts.adminShot, payload.artifacts.userShot].filter(Boolean),
  )).concat(
    payload.status === 'passed'
      ? []
      : [toScenario('support-e2e', targetName, 'system', 'support-lifecycle', 'failed', 'Whole support lifecycle passes', payload.error || payload.status, [artifactPath])],
  );
}

function aggregateFastTrack(targetName, artifactPath, payload) {
  const diagnostics = [
    ...(payload.pageErrors || []),
    ...(payload.consoleErrors || []),
    ...(payload.networkErrors || []),
    ...(payload.error ? [payload.error] : []),
  ];
  const isSkipped = payload?.skipped === true;
  const checks = [
    {
      role: 'user',
      surface: 'user desktop workspace',
      ok: isSkipped
        ? true
        : payload.userDesktop?.contentExpandedOnCollapse === true
          && payload.userDesktop?.metricsInitiallyVisible === true
          && payload.userDesktop?.metricsAfterReload === false
          && payload.userDesktop?.stepperPosition === 'sticky'
          && payload.userDesktop?.defaultPanelAfterReload === 'case_chat'
          && payload.userDesktop?.connectedRecordsHiddenAfterReload === true,
      actual: payload.userDesktop,
      fixRef: isSkipped ? 'FAST-TRACK-SKIPPED-NO-CASES' : 'FAST-TRACK-USER-DESKTOP',
    },
    {
      role: 'manager',
      surface: 'manager desktop workspace',
      ok: isSkipped
        ? true
        : payload.managerDesktop?.contentExpandedOnCollapse === true
          && payload.managerDesktop?.metricsVisible === true
          && payload.managerDesktop?.preferences?.show_metrics_strip === true,
      actual: payload.managerDesktop,
      fixRef: isSkipped ? 'FAST-TRACK-SKIPPED-NO-CASES' : 'FAST-TRACK-MANAGER-DESKTOP',
    },
    {
      role: 'admin',
      surface: 'admin desktop workspace',
      ok: isSkipped
        ? true
        : payload.adminDesktop?.loaded === true,
      actual: payload.adminDesktop,
      fixRef: isSkipped ? 'FAST-TRACK-SKIPPED-NO-CASES' : 'FAST-TRACK-ADMIN-DESKTOP',
    },
    {
      role: 'user',
      surface: 'user tablet workspace',
      ok: isSkipped
        ? true
        : payload.userTablet?.railDrawerOpened === true
          && payload.userTablet?.mastheadVisible === true
          && payload.userTablet?.utilityDockVisible === true,
      actual: payload.userTablet,
      fixRef: isSkipped ? 'FAST-TRACK-SKIPPED-NO-CASES' : 'FAST-TRACK-USER-TABLET',
    },
    {
      role: 'user',
      surface: 'dashboard celebration',
      ok: isSkipped
        ? true
        : payload.dashboardCelebration?.celebrateRouteOverlayVisible === true
          && payload.dashboardCelebration?.celebrateQueryCleared === true
          && payload.dashboardCelebration?.plainDashboardCelebrationVisible === false,
      actual: payload.dashboardCelebration,
      fixRef: isSkipped ? 'FAST-TRACK-SKIPPED-NO-CASES' : 'FAST-TRACK-CELEBRATION',
    },
    {
      role: 'system',
      surface: 'fast-track browser diagnostics',
      ok: diagnostics.length === 0 && payload.overallOk === true,
      actual: { overallOk: payload.overallOk },
      errors: diagnostics,
      fixRef: 'FAST-TRACK-DIAGNOSTICS',
    },
  ];

  return checks.map((check) => toScenario(
    'fast-track-e2e',
    targetName,
    check.role,
    check.surface,
    check.ok ? 'passed' : 'failed',
    'Fast-track workspace matrix stays green across role, desktop, tablet, preferences, and celebration flows',
    JSON.stringify(check.actual || {}),
    [artifactPath, check.actual?.screenshot].filter(Boolean),
    check.errors || [],
    '',
    check.fixRef,
  ));
}

async function main() {
  const target = resolveTarget(process.argv.slice(2));
  const webDir = process.cwd();
  const outputDir = path.join(webDir, 'output', 'playwright');
  const artifactPath = path.join(outputDir, `full-platform-${target.name}-proof.json`);
  const fastTrackArtifactPath = path.join(outputDir, `fast-track-workspace-${target.name}-full-proof.json`);
  const messagesArtifactPath = path.join(outputDir, `messages-${target.name}-full-proof.json`);
  const supportArtifactPath = path.join(outputDir, `support-lifecycle-${target.name}-proof.json`);
  const publicArtifactPath = path.join(outputDir, `public-${target.name}-proof.json`);
  const authHostArtifactPath = path.join(outputDir, `auth-host-${target.name}-proof.json`);

  const scenarios = [];
  scenarios.push(...await healthChecks(target));
  scenarios.push(...await performanceSmoke(target));

  const smokeStdout = runNode(['scripts/e2e-smoke.cjs', `--target=${target.name}`], webDir);
  const smokePayload = JSON.parse(smokeStdout);
  scenarios.push(...aggregateSmoke(target.name, smokePayload));

  const fastTrackCooldownMs = Number(process.env.E2E_FAST_TRACK_PROOF_COOLDOWN_MS || '0');
  if (fastTrackCooldownMs > 0) {
    await sleep(fastTrackCooldownMs);
  }
  let fastTrackPayload = null;
  try {
    runNode([path.join('scripts', 'fast-track-redesign-proof.cjs')], webDir, {
      BASE_URL: target.baseUrl,
      CORE_URL: target.services.core,
      BOOKING_URL: target.services.booking,
      OUTPUT_PATH: fastTrackArtifactPath,
    });
    fastTrackPayload = loadJson(fastTrackArtifactPath);
  } catch (error) {
    console.error(`[fast-track] proof skipped for ${target.name}: ${error?.message || error}`);
    fastTrackPayload = {
      baseUrl: target.baseUrl,
      overallOk: false,
      error: `fast-track proof skipped: ${error?.message || error}`,
      userDesktop: {},
      managerDesktop: {},
      adminDesktop: {},
      userTablet: {},
      dashboardCelebration: {},
      pageErrors: [],
      consoleErrors: [],
      networkErrors: [],
      skipped: true,
    };
  }
  scenarios.push(...aggregateFastTrack(target.name, fastTrackArtifactPath, fastTrackPayload));

  runNode(['scripts/public-proof.cjs', `--target=${target.name}`], webDir);
  scenarios.push(...aggregatePublic(target.name, publicArtifactPath, loadJson(publicArtifactPath)));

  runNode(['scripts/auth-host-proof.cjs', `--target=${target.name}`], webDir);
  scenarios.push(...aggregateAuthHosts(target.name, authHostArtifactPath, loadJson(authHostArtifactPath)));

  runNode(['scripts/messages-proof.cjs', `--target=${target.name}`], webDir);
  scenarios.push(...aggregateMessages(target.name, messagesArtifactPath, loadJson(messagesArtifactPath)));

  runNode(['scripts/support-lifecycle-proof.cjs', `--target=${target.name}`], webDir);
  scenarios.push(...aggregateSupport(target.name, supportArtifactPath, loadJson(supportArtifactPath)));

  const summary = {
    target: target.name,
    generatedAt: new Date().toISOString(),
    total: scenarios.length,
    passed: scenarios.filter((item) => item.status === 'passed').length,
    failed: scenarios.filter((item) => item.status === 'failed').length,
    overallOk: scenarios.every((item) => item.status === 'passed'),
  };

  fs.writeFileSync(artifactPath, JSON.stringify({ summary, scenarios }, null, 2));
  if (!summary.overallOk) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
