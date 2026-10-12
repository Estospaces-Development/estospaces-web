import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = readFileSync(resolve(process.cwd(), 'src/pages/user/dashboard/contracts/page.tsx'), 'utf8');

test('contract card actions wrap instead of squeezing and clipping SIGN CONTRACT (#710)', () => {
    const row = source.slice(source.indexOf('<div className="mt-6 flex flex-wrap'), source.indexOf('<Eye size={14} /> View Document'));
    assert.match(row, /mt-6 flex flex-wrap items-center gap-3/);
    assert.equal((row.match(/basis-40 flex-1 whitespace-nowrap/g) || []).length, 2);
    assert.doesNotMatch(row, /\$\{needsSignature \? "" : "flex-1"\}/);
});

test('linked contract header close button is a 44px, visible, non-shrinking control (#711)', () => {
    const header = source.slice(source.indexOf('id="user-contract-detail-title"'), source.indexOf('Contract ID {viewContract.id}'));
    assert.match(source, /rounded-\[2rem\] bg-white p-5 shadow-2xl dark:bg-gray-800 sm:p-8/);
    const button = source.slice(source.indexOf('aria-label="Close contract detail"'), source.indexOf('<X size={18} />'));
    assert.match(button, /h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-300/);
    assert.ok(header.length > 0);
});
