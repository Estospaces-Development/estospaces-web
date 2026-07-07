import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('manager support copy does not advertise inactive billing work', () => {
    const source = readFileSync(
        resolve(process.cwd(), 'src/components/support/SupportCenter.tsx'),
        'utf8',
    );
    const managerRoleCopy = source.match(/manager:\s*{[\s\S]*?},\s*admin:/)?.[0] || '';

    assert.ok(managerRoleCopy.includes('Manager Help & Support'));
    assert.doesNotMatch(managerRoleCopy, /billing/i);
    assert.doesNotMatch(managerRoleCopy, /['"]Billing['"]/);
});

test('user support copy does not advertise inactive payment workspaces', () => {
    const source = readFileSync(
        resolve(process.cwd(), 'src/components/support/SupportCenter.tsx'),
        'utf8',
    );
    const userRoleCopy = source.match(/user:\s*{[\s\S]*?},\s*manager:/)?.[0] || '';

    assert.ok(userRoleCopy.includes('User Help & Support'));
    assert.doesNotMatch(userRoleCopy, /['"]Payments['"]/);
});

test('user settings support shortcut does not mention inactive billing state', () => {
    const source = readFileSync(
        resolve(process.cwd(), 'src/pages/user/dashboard/settings/page.tsx'),
        'utf8',
    );

    assert.doesNotMatch(source, /billing state/i);
});

test('support search helper does not show an ambiguous 0/120 counter before typing', () => {
    const source = readFileSync(
        resolve(process.cwd(), 'src/components/support/SupportFilters.tsx'),
        'utf8',
    );

    assert.doesNotMatch(source, /\{filters\.search\.length\}\/\{SUPPORT_SEARCH_MAX_LENGTH\}/);
    assert.match(source, /Filter by subject, requester, module, or ticket text\./);
    assert.match(source, /characters used/);
});
