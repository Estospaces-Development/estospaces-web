const { execSync } = require('child_process');
const path = require('path');

const webDir = path.join(process.env.USERPROFILE || process.env.HOME, 'Estospaces', 'esto-app-projects', 'estospaces-web');

try {
  // TypeScript check
  console.log('=== TypeScript Check ===');
  const tsc = execSync('npx tsc --noEmit 2>&1', { cwd: webDir, encoding: 'utf8', timeout: 60000 });
  console.log(tsc);
} catch(e) {
  console.log('TSC Error:', e.stdout || e.message);
}
