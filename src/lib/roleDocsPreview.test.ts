import assert from 'node:assert/strict';
import test from 'node:test';
import { getSectionPreview } from './roleDocsPreview';

test('getSectionPreview prefers the descriptive "What it is" paragraph', () => {
    const value = `### Who this is for
Users intending to purchase rather than rent.

### What it is
The buy journey combines discovery, broker support, property evaluation, fast-track progression, document readiness, negotiation context, contracts, and payment milestones.

### Where to do it
- Buy discovery: [/user/dashboard/discover?type=buy](/user/dashboard/discover?type=buy)`;

    assert.equal(
        getSectionPreview(value),
        'The buy journey combines discovery, broker support, property evaluation, fast-track progression, document readiness, negotiation context, contracts, and payment milestones.',
    );
});

test('getSectionPreview truncates long fallback text at a word boundary', () => {
    const value = `This section explains the full operating model for long-running journeys, document-heavy checkpoints, escalations, payments, approvals, and every follow-through task that keeps the case moving without confusion or duplicated work across the team.`;

    const preview = getSectionPreview(value);

    assert.ok(preview.endsWith('...'));
    assert.ok(!preview.includes('duplicated wor...'));
    assert.ok(preview.length <= 170);
});
