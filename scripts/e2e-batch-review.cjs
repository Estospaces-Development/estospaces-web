const fs = require('node:fs');
const path = require('node:path');
const { getReviewPath } = require('./e2e-batch-shared.cjs');

const START_MARKER = '<!-- codex-batch-progress:start -->';
const END_MARKER = '<!-- codex-batch-progress:end -->';

function parseOption(argv, name) {
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === name && argv[index + 1]) {
      return argv[index + 1];
    }
    if (arg.startsWith(`${name}=`)) {
      return arg.slice(name.length + 1);
    }
  }
  return '';
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function summarizeFailures(results, status) {
  return results
    .filter((item) => item.status === status)
    .slice(0, 8)
    .map((item) => {
      const note = Array.isArray(item.notes) && item.notes.length > 0 ? item.notes[0] : 'no note captured';
      return `- ${item.scenario_id} | ${item.family} | ${item.role} | ${item.auth_state} | ${note}`;
    });
}

function renderProgress(summary, resultPath) {
  const failed = summarizeFailures(summary.results || [], 'failed');
  const blocked = summarizeFailures(summary.results || [], 'blocked');
  const cleanupIssues = (summary.results || []).filter((item) => item.cleanup_status && item.cleanup_status !== 'not_required' && item.cleanup_status !== 'passed');
  const selection = summary.selection || {};
  const filters = summary.filters || {};
  const scenarioCount = selection.scenarioCount || selection.scenario_count || (summary.results || []).length || 0;
  const batchIds = selection.batchIds
    || (Array.isArray(selection.batches) ? selection.batches.map((item) => item.batch_id) : [])
    || [];

  const lines = [
    '## Batch Gate Progress',
    '',
    START_MARKER,
    `Last Batch Update: ${summary.generated_at || new Date().toISOString()}`,
    '',
    `- Batch ID: \`${batchIds.join(', ') || filters.batch || 'ad-hoc'}\``,
    `- Environment: \`${summary.env}\``,
    `- Base URL: \`${summary.base_url}\``,
    `- Selection Size: \`${scenarioCount}\` scenarios`,
    `- Executed: \`${summary.counts?.executed || 0}\``,
    `- Passed: \`${summary.counts?.passed || 0}\``,
    `- Failed: \`${summary.counts?.failed || 0}\``,
    `- Blocked: \`${summary.counts?.blocked || 0}\``,
    `- Cleanup Status: \`${cleanupIssues.length === 0 ? 'clean' : 'attention-needed'}\``,
    `- Result Artifact: \`${resultPath}\``,
    '',
    '### New Findings',
  ];

  if (failed.length === 0) {
    lines.push('- none in this batch');
  } else {
    lines.push(...failed);
  }

  lines.push('', '### Carry-over Blockers');
  if (blocked.length === 0) {
    lines.push('- none in this batch');
  } else {
    lines.push(...blocked);
  }

  lines.push('', '### Current Readiness Decision');
  lines.push(`- ${summary.counts?.failed > 0 || summary.counts?.blocked > 0 ? 'not ready' : 'ready for this executed batch only'}`);
  lines.push(END_MARKER, '');
  return lines.join('\n');
}

function spliceSection(reviewText, progressSection) {
  if (reviewText.includes(START_MARKER) && reviewText.includes(END_MARKER)) {
    const fullSectionPattern = /## Batch Gate Progress[\s\S]*?<!-- codex-batch-progress:end -->\n?/m;
    if (fullSectionPattern.test(reviewText)) {
      return reviewText.replace(fullSectionPattern, `${progressSection}\n`);
    }

    const markerPattern = new RegExp(`${START_MARKER}[\\s\\S]*?${END_MARKER}\\n?`, 'm');
    const markerBlock = progressSection
      .split('\n')
      .slice(2)
      .join('\n');
    return reviewText.replace(markerPattern, `${markerBlock}\n`);
  }

  const actionableIndex = reviewText.indexOf('## Actionable findings');
  if (actionableIndex >= 0) {
    return `${reviewText.slice(0, actionableIndex)}${progressSection}\n${reviewText.slice(actionableIndex)}`;
  }

  return `${reviewText.trimEnd()}\n\n${progressSection}`;
}

function main() {
  const argv = process.argv.slice(2);
  const resultPath = parseOption(argv, '--result');
  if (!resultPath) {
    throw new Error('Missing required --result path');
  }

  const reviewPath = parseOption(argv, '--review') || getReviewPath(process.cwd());
  const summary = loadJson(resultPath);
  const reviewText = fs.readFileSync(reviewPath, 'utf8');
  const progressSection = renderProgress(summary, path.resolve(resultPath));
  const nextReview = spliceSection(reviewText, progressSection);
  fs.writeFileSync(reviewPath, nextReview);

  console.log(JSON.stringify({ reviewPath, resultPath: path.resolve(resultPath) }, null, 2));
}

main();
