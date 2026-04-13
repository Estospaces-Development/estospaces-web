const path = require('node:path');
const {
  buildSelectionLabel,
  generateCatalog,
  getOutputRoot,
  summarizeCatalog,
  writeJson,
} = require('./e2e-batch-shared.cjs');

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

function main() {
  const argv = process.argv.slice(2);
  const outputRoot = getOutputRoot(process.cwd());
  const catalog = generateCatalog();
  const summary = summarizeCatalog(catalog);
  const label = buildSelectionLabel({}) || 'full-catalog';
  const outDir = parseOption(argv, '--out-dir') || path.join(outputRoot, label);
  const catalogPath = path.join(outDir, 'catalog.full.json');
  const summaryPath = path.join(outDir, 'catalog.summary.json');

  writeJson(catalogPath, catalog);
  writeJson(summaryPath, summary);

  console.log(JSON.stringify({
    catalogPath,
    summaryPath,
    scenarioCount: summary.scenario_count,
    batchCount: summary.batch_count,
  }, null, 2));
}

main();
