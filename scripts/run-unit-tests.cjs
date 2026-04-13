const { spawnSync } = require('node:child_process');
const { existsSync, readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');
function collectTestFiles(dir, acc = []) {
    for (const entry of readdirSync(dir)) {
        const fullPath = join(dir, entry);
        const stats = statSync(fullPath);
        if (stats.isDirectory()) {
            collectTestFiles(fullPath, acc);
            continue;
        }

        if (/\.test\.tsx?$/.test(entry)) {
            acc.push(fullPath);
        }
    }

    return acc;
}

const testFiles = collectTestFiles(join(process.cwd(), 'src')).sort();
if (testFiles.length === 0) {
    console.error('No test files found under src.');
    process.exit(1);
}

const tsxCommand = join(
    process.cwd(),
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'tsx.cmd' : 'tsx',
);

if (!existsSync(tsxCommand)) {
    console.error(`Unable to locate tsx binary at ${tsxCommand}`);
    process.exit(1);
}

const windowsCommand = `"${tsxCommand}" --test ${testFiles.map((file) => `"${file}"`).join(' ')}`;
const result = process.platform === 'win32'
    ? spawnSync(windowsCommand, {
        stdio: 'inherit',
        shell: true,
    })
    : spawnSync(tsxCommand, ['--test', ...testFiles], {
        stdio: 'inherit',
    });

if (result.error) {
    console.error(result.error.message);
    process.exit(1);
}

process.exit(result.status ?? 1);
