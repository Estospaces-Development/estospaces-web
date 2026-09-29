const fs = require('node:fs');
const path = require('node:path');

const launchFlagsPath = path.resolve(__dirname, '..', 'src', 'lib', 'launchFlags.ts');

// Mirrors ADMIN_RESEARCH_ENABLED in src/lib/launchFlags.ts, the single switch
// for the admin Research workspace.
function isAdminResearchEnabled(source = fs.readFileSync(launchFlagsPath, 'utf8')) {
  const match = source.match(/export const ADMIN_RESEARCH_ENABLED\s*=\s*(true|false)\s*;/);
  if (!match) {
    throw new Error(`ADMIN_RESEARCH_ENABLED must be a literal true or false in ${launchFlagsPath}`);
  }
  return match[1] === 'true';
}

// Exits 0 before any browser or API work when the research route is disabled.
function skipUnlessAdminResearchEnabled(scriptName) {
  if (isAdminResearchEnabled()) return;
  console.log(`${scriptName}: skipped: research backend not deployed (ADMIN_RESEARCH_ENABLED is false in src/lib/launchFlags.ts)`);
  process.exit(0);
}

module.exports = { isAdminResearchEnabled, skipUnlessAdminResearchEnabled };
