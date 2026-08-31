import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const settingsPageSource = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');

test('renders the single launch currency as a described read-only value', () => {
    const currencyBlock = settingsPageSource.slice(
        settingsPageSource.indexOf('<span\n                                id="admin-settings-currency-label"'),
        settingsPageSource.indexOf('</p>', settingsPageSource.indexOf('admin-settings-currency-help')) + 4,
    );

    assert.match(currencyBlock, /<output/);
    assert.match(currencyBlock, /aria-labelledby="admin-settings-currency-label"/);
    assert.match(currencyBlock, /aria-describedby="admin-settings-currency-help"/);
    assert.match(currencyBlock, /Fixed to \{LAUNCH_CURRENCY_CODE\} for the current launch configuration\./);
    assert.doesNotMatch(currencyBlock, /<select/);
    assert.doesNotMatch(currencyBlock, /<option/);
});
