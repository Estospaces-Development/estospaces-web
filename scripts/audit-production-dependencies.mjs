import { spawnSync } from 'node:child_process';

const allowedAdvisories = new Set(['GHSA-qwww-vcr4-c8h2']);
const result = spawnSync('npm', ['audit', '--json'], {
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

if (!result.stdout) {
  process.stderr.write(result.stderr || 'npm audit returned no report.\n');
  process.exit(1);
}

const report = JSON.parse(result.stdout);
const vulnerabilities = report.vulnerabilities || {};
const allowedPackages = new Set();

for (const [packageName, vulnerability] of Object.entries(vulnerabilities)) {
  const directAdvisories = (vulnerability.via || []).filter((entry) => typeof entry === 'object');
  if (
    directAdvisories.length > 0 &&
    directAdvisories.every((entry) =>
      [...allowedAdvisories].some((ghsa) => entry.url?.endsWith(ghsa)),
    )
  ) {
    allowedPackages.add(packageName);
  }
}

const blocking = Object.entries(vulnerabilities).filter(([, vulnerability]) => {
  if (!['high', 'critical'].includes(vulnerability.severity)) return false;
  return !(vulnerability.via || []).every((entry) =>
    typeof entry === 'string' ? allowedPackages.has(entry) : allowedPackages.has(vulnerability.name),
  );
});

if (blocking.length > 0) {
  process.stderr.write(
    `Blocking dependency vulnerabilities:\n${blocking
      .map(([name, vulnerability]) => `- ${name}: ${vulnerability.severity}`)
      .join('\n')}\n`,
  );
  process.exit(1);
}

process.stdout.write(
  'Dependency audit passed. The only allowed advisory affects unstable React Router RSC APIs, which this Vite SPA does not use.\n',
);
