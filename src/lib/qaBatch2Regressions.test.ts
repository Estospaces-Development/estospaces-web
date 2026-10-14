import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

// Source-level guards for the 14 Oct 2026 QA batch 2 UI fixes (QA-E2E-20261014).
const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('B6: purpose toggles expose aria-pressed', () => {
    const searchBar = read('src/components/ui/SearchBar.tsx');
    assert.match(searchBar, /aria-pressed=\{filters\.listingType === option\.value\}/);
    const widget = read('src/components/dashboard/BrokerRequestWidget.tsx');
    assert.match(widget, /aria-pressed=\{requestType === type\}/);
});

test('B8: no user-visible "pilot" wording in the user Settings and Payments pages', () => {
    for (const path of ['src/pages/user/dashboard/settings/page.tsx', 'src/pages/user/dashboard/payments/page.tsx']) {
        assert.doesNotMatch(read(path), /pilot/i, path);
    }
    assert.match(read('src/pages/user/dashboard/settings/page.tsx'), /Contact Estospaces Support/);
});

test('B10: no third-party texture URL (blocked by the CSP)', () => {
    assert.doesNotMatch(read('src/pages/user/dashboard/overseas/page.tsx'), /transparenttextures/);
});

test('B12/B13: the request widget hides broadcasting and progress for an unavailable request and passes the market to its copy', () => {
    const widget = read('src/components/dashboard/BrokerRequestWidget.tsx');
    assert.match(widget, /requestIsActive && !requestHasNoAgent/);
    assert.match(widget, /getBrokerRequestCopy\(requestType, locationMarket\)/);
    assert.match(widget, /placeholder=\{getBrokerRequestBudgetPlaceholder\(/);
});

test('B14: the manager dashboard counts active leads with the Leads page summary', () => {
    const dashboard = read('src/pages/manager/dashboard/page.tsx');
    assert.match(dashboard, /summarizeManagerLeads\(/);
    assert.match(dashboard, /activeLeadCount=\{activeLeadCount\}/);
});
