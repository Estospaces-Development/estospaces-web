import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tenancyComplianceLabel } from './tenancyComplianceLabel';

test('only England (and a rental with no country) asks for Right to Rent', () => {
    assert.equal(tenancyComplianceLabel('england'), 'Right to Rent');
    assert.equal(tenancyComplianceLabel('UK'), 'Right to Rent');
    assert.equal(tenancyComplianceLabel(undefined), 'Right to Rent');
});

test('India and other jurisdictions get their own label, never Right to Rent', () => {
    assert.equal(tenancyComplianceLabel('india'), 'Jurisdiction-specific tenancy compliance');
    assert.equal(tenancyComplianceLabel('wales'), 'Occupation contract / written statement');
    assert.equal(tenancyComplianceLabel('scotland'), 'PRT / registration readiness');
    assert.equal(tenancyComplianceLabel('northern_ireland'), 'Tenancy information notice');
});

test('the manager application detail no longer hard-codes right-to-rent', () => {
    const source = readFileSync(new URL('../components/manager/applications/ApplicationDetail.tsx', import.meta.url), 'utf8');
    assert.doesNotMatch(source, /right-to-rent/i);
    assert.match(source, /tenancyComplianceLabel\(\s*rightToRentCheck\?\.jurisdiction \|\| application\?\.jurisdictionProfile/);
});
