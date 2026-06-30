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
const tsxCli = join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs');

if (!existsSync(tsxCommand) || !existsSync(tsxCli)) {
    console.error(`Unable to locate tsx binary at ${tsxCommand}`);
    process.exit(1);
}

function chunkFiles(files, maxLength = 24000) {
    const chunks = [];
    let current = [];
    let length = process.execPath.length + tsxCli.length + '--test'.length;

    for (const file of files) {
        const nextLength = length + file.length + 3;
        if (current.length > 0 && nextLength > maxLength) {
            chunks.push(current);
            current = [];
            length = process.execPath.length + tsxCli.length + '--test'.length;
        }

        current.push(file);
        length += file.length + 3;
    }

    if (current.length > 0) {
        chunks.push(current);
    }

    return chunks;
}

for (const chunk of chunkFiles(testFiles)) {
    const result = spawnSync(process.execPath, [tsxCli, '--test', ...chunk], {
        stdio: 'inherit',
    });

    if (result.error) {
        console.error(result.error.message);
        process.exit(1);
    }

    if (result.status !== 0) {
        process.exit(result.status ?? 1);
    }
}

process.exit(0);
