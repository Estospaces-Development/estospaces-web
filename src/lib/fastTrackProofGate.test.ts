import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';

const scriptPath = path.resolve('scripts/fast-track-redesign-proof.cjs');
const scriptSource = readFileSync(scriptPath, 'utf8');
const scriptRequire = createRequire(scriptPath);
const aggregateSource = readFileSync('scripts/full-platform-proof.cjs', 'utf8');
// Isolate the real aggregate function from its CLI entry point and external runs.
const aggregateFastTrack = vm.runInNewContext(
  `${aggregateSource.slice(0, aggregateSource.lastIndexOf('\nmain().catch('))}\naggregateFastTrack;`,
  { require: createRequire(path.resolve('scripts/full-platform-proof.cjs')) },
) as (target: string, artifact: string, payload: Record<string, unknown>) => Array<{
  surface: string;
  status: string;
}>;

const completeProof = () => ({
  userDesktop: {
    contentExpandedOnCollapse: true, metricsInitiallyVisible: true,
    metricsAfterReload: false, stepperPosition: 'sticky',
    defaultPanelAfterReload: 'case_chat', connectedRecordsHiddenAfterReload: true,
  },
  managerDesktop: {
    contentExpandedOnCollapse: true, metricsVisible: true,
    preferences: { show_metrics_strip: true },
  },
  adminDesktop: { loaded: true },
  userTablet: { railDrawerOpened: true, mastheadVisible: true, detailsActionVisible: true },
  dashboardCelebration: {
    celebrateRouteOverlayVisible: true, celebrateQueryCleared: true,
    plainDashboardCelebrationVisible: false,
  },
  diagnosticsOk: true, dataIntegrityOk: true,
  pageErrors: [], consoleErrors: [], networkErrors: [], unavailablePropertyUrls: [],
});

test('a complete Fast Track proof produces seven passing checks', () => {
  const result = aggregateFastTrack('dev', 'proof.json', completeProof());
  assert.equal(result.length, 7);
  assert.equal(result.filter((row) => row.status === 'passed').length, 7);
});

test('top-level skipped evidence never passes role or celebration checks', () => {
  const result = aggregateFastTrack('dev', 'proof.json', { ...completeProof(), skipped: true });
  for (const row of result) assert.equal(row.status, 'failed', row.surface);
});

const proofSections = ['userDesktop', 'managerDesktop', 'adminDesktop', 'userTablet', 'dashboardCelebration'] as const;
for (const [index, section] of proofSections.entries()) {
  test(`a skipped ${section} cannot pass even with leftover positive flags`, () => {
    const proof = completeProof();
    const payload = { ...proof, [section]: { ...proof[section], skipped: true } };
    assert.equal(aggregateFastTrack('dev', 'proof.json', payload)[index].status, 'failed');
  });
}

test('a skipped celebration is not proof that celebration works', () => {
  const result = aggregateFastTrack('dev', 'proof.json', {
    ...completeProof(), dashboardCelebration: { skipped: true, reason: 'no completed case' },
  });
  assert.equal(result.find((row) => row.surface === 'dashboard celebration')?.status, 'failed');
});

test('missing role evidence is not filled in by a successful overall flag', () => {
  const result = aggregateFastTrack('dev', 'proof.json', {
    ...completeProof(), overallOk: true, userDesktop: {},
  });
  assert.equal(result[0].status, 'failed');
});

test('a network failure invalidates the diagnostics check', () => {
  const result = aggregateFastTrack('dev', 'proof.json', {
    ...completeProof(), networkErrors: ['Controlled request failure'],
  });
  assert.equal(result.find((row) => row.surface === 'fast-track browser diagnostics')?.status, 'failed');
});

test('unavailable property references cannot be hidden by a positive integrity flag', () => {
  const result = aggregateFastTrack('dev', 'proof.json', {
    ...completeProof(), unavailablePropertyUrls: ['https://example.test/unavailable'],
  });
  assert.equal(result[6].status, 'failed');
});

interface ProofCase { id: string; final_status: string }
type RoleCases = Record<'user' | 'manager' | 'admin', ProofCase[]>;

const requiredCases = (): RoleCases => ({
  user: [{ id: 'user-active', final_status: 'active' }, { id: 'user-completed', final_status: 'completed' }],
  manager: [{ id: 'manager-active', final_status: 'active' }],
  admin: [{ id: 'admin-active', final_status: 'active' }],
});

async function runStandalone(cases: RoleCases) {
  const output = new Map<string, string>();
  let browserCloses = 0;
  let preferenceWrites = 0;
  const fakeProcess = { env: {
    E2E_USER_EMAIL: 'user@example.test', E2E_USER_PASSWORD: 'dummy-test-value',
    E2E_MANAGER_EMAIL: 'manager@example.test', E2E_MANAGER_PASSWORD: 'dummy-test-value',
    E2E_ADMIN_EMAIL: 'admin@example.test', E2E_ADMIN_PASSWORD: 'dummy-test-value',
    CORE_URL: 'https://core.example.test', BOOKING_URL: 'https://booking.example.test',
    OUTPUT_PATH: 'controlled-proof.json',
  }, exitCode: 0 };
  await vm.runInNewContext(scriptSource, {
    process: fakeProcess,
    console: { log() {}, error() {} },
    require(name: string) {
      if (name === 'fs') return {
        mkdirSync() {}, existsSync() { return false; },
        writeFileSync(file: string, data: string) { output.set(file, data); },
      };
      if (name === 'playwright') return {
        chromium: { launch: async () => ({ close: async () => { browserCloses += 1; } }) },
      };
      return scriptRequire(name);
    },
    async fetch(url: string, request: { method: string; body?: string; headers: Record<string, string> }) {
      const route = new URL(url).pathname;
      if (route === '/api/v1/auth/login') {
        const { email } = JSON.parse(request.body || '{}');
        return new Response(JSON.stringify({ data: { token: email.split('@')[0], user: { email } } }));
      }
      if (route === '/api/v1/users/workspace-preferences/fast-track' && request.method === 'PUT') {
        preferenceWrites += 1;
        return new Response(JSON.stringify({ data: JSON.parse(request.body || '{}') }));
      }
      if (route === '/api/v1/fast-track') {
        const role = request.headers.Authorization.replace('Bearer ', '') as keyof RoleCases;
        return new Response(JSON.stringify({ data: cases[role] }));
      }
      throw new Error(`Unexpected controlled request: ${request.method} ${route}`);
    },
  });
  return {
    report: JSON.parse(output.get('controlled-proof.json') || '{}'),
    exitCode: fakeProcess.exitCode, browserCloses, preferenceWrites,
  };
}

const missingCases: Array<[string, () => RoleCases]> = [
  ['all cases', () => ({ user: [], manager: [], admin: [] })],
  ['user active case', () => ({ ...requiredCases(), user: [{ id: 'completed', final_status: 'completed' }] })],
  ['user completed case', () => ({ ...requiredCases(), user: [{ id: 'active', final_status: 'active' }] })],
  ['manager case', () => ({ ...requiredCases(), manager: [] })],
  ['admin active case', () => ({ ...requiredCases(), admin: [] })],
];

for (const [name, cases] of missingCases) {
  test(`standalone proof fails before UI work or preference changes without ${name}`, async () => {
    const result = await runStandalone(cases());
    assert.equal(result.exitCode, 1);
    assert.equal(result.report.overallOk, false);
    assert.equal(result.report.functionalOk, false);
    assert.match(result.report.error, /required.*case|case.*required/i);
    assert.equal(result.browserCloses, 1);
    assert.equal(result.preferenceWrites, 0);
  });
}
