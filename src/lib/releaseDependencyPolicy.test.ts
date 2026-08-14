import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

interface LockPackage {
    license?: string;
}

interface PackageLock {
    packages: Record<string, LockPackage>;
}

const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as PackageLock;
const securityHeaders = readFileSync('nginx-security-headers.conf', 'utf8');

test('release dependencies avoid the blocked document and map package chains', () => {
    const blockedPackages = [
        'node_modules/exceljs',
        'node_modules/jszip',
        'node_modules/pdf-lib',
        'node_modules/react-leaflet',
        'node_modules/@react-leaflet/core',
    ];

    blockedPackages.forEach((packagePath) => {
        assert.equal(lock.packages[packagePath], undefined, `${packagePath} must not return to the release bundle`);
    });
    assert.equal(lock.packages['node_modules/leaflet']?.license, 'BSD-2-Clause');
    assert.equal(lock.packages['node_modules/write-excel-file']?.license, 'MIT');
    assert.equal(lock.packages['node_modules/fflate']?.license, 'MIT');
    assert.match(
        securityHeaders,
        /worker-src 'self' blob:/,
        'production CSP must permit the isolated XLSX compression worker for large exports',
    );
});
