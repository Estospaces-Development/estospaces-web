import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const source = readFileSync(resolve(process.cwd(), 'src/pages/manager/leads/page.tsx'), 'utf8');

test('lead summary cards count every lead, not only the selected status (#694)', () => {
    assert.match(source, /getBrokerLeads\(\),/);
    assert.match(source, /summarizeManagerLeads\(allVisibleLeads, now\)/);
    assert.match(source, /statusFilter === 'all' \? allVisibleLeads : allVisibleLeads\.filter\(\(lead\) => lead\.status === statusFilter\)/);
});
