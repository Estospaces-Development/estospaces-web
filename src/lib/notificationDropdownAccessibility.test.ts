import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

test('notification trigger always identifies the controlled dialog', () => {
    const source = readFileSync(
        resolve(process.cwd(), 'src/components/dashboard/NotificationDropdown.tsx'),
        'utf8',
    );

    assert.match(source, /aria-controls="notification-dropdown-panel"/);
    assert.doesNotMatch(source, /aria-controls=\{isOpen \? 'notification-dropdown-panel'/);
});
