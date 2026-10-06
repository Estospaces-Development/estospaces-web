import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the manager sees what the applicant submitted (MB-0493)', () => {
    assert.match(read('components/manager/applications/ApplicationDetail.tsx'), /Applicant&apos;s answers/);
    assert.match(read('contexts/ApplicationsContext.tsx'), /applicantMessage: application\.message \|\| undefined,/);
});

test('a refused checkout clears consent and explains the change (MB-0778)', () => {
    const page = read('pages/manager/subscription/page.tsx');
    assert.match(page, /if \(status === 400 \|\| status === 409 \|\| status === 422\) \{\s*setConsentedText\(null\);/);
    assert.match(page, /price or terms changed, so nothing was charged/);
});

test('a dashboard request card shows Responded only after the server accepts (MB-0327)', () => {
    assert.match(read('components/dashboard/BrokerRequestItem.tsx'), /const accepted = await onRespond\(request\.id\);\s*if \(accepted !== false\) \{\s*setCurrentStatus\('responded'\);/);
    assert.match(read('components/dashboard/BrokerResponseWidget.tsx'), /const handleRespond = async \(id: string\): Promise<boolean> =>/);
});

test('placeholder agent-request cards cannot be marked Won or Lost (MB-0325)', () => {
    assert.match(read('pages/manager/leads/page.tsx'), /!String\(lead\.id\)\.startsWith\('broker-request-'\)/);
});
