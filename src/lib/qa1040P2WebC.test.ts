import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { findLinkedFastTrackCase } from '@/lib/fastTrackCompanion';
import type { FastTrackCase } from '@/services/fastTrackService';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('a viewing with no case never borrows another client\'s case on the same property (MB-0464)', () => {
    const otherClientsCase = { caseId: 'case-other', propertyId: 'property-1', viewingId: 'viewing-other', workspaceFinalStatus: 'active' } as unknown as FastTrackCase;
    assert.equal(findLinkedFastTrackCase([otherClientsCase], { viewingId: 'viewing-mine', propertyId: 'property-1' }), null);
    const finished = { ...otherClientsCase, workspaceFinalStatus: 'completed' } as FastTrackCase;
    assert.equal(findLinkedFastTrackCase([finished], { propertyId: 'property-1' }), null);
    assert.equal(findLinkedFastTrackCase([otherClientsCase], { propertyId: 'property-1' })?.caseId, 'case-other');
});

test('finished Fast Track cases are only merged by their own ids (MB-0559)', () => {
    assert.match(read('lib/fastTrackWorkspaceLoad.ts'), /if \(status !== "active"\) \{\s*return strongKeys\.filter\(Boolean\);/);
});

test('inventory pills say they count the loaded page (MB-0719)', () => {
    assert.match(read('pages/manager/dashboard/properties/page.tsx'), /\{pagination\.totalPages > 1 && \(\s*<span[^>]*>On this page:<\/span>/);
});

test('Fast Track times carry a zone label and date-only values keep their day (MB-0451, MB-0999)', () => {
    const source = read('components/fast-track/FastTrackWorkspace.tsx');
    assert.match(source, /timeZoneName: 'short'/);
    assert.match(source, /toLocaleDateString\('en-GB', \{ timeZone: 'UTC' \}\)/);
    assert.doesNotMatch(source, /scheduledAt\)\.toLocaleString\('en-GB'\)/);
});

test('a failed image preview explains itself and offers Retry (MB-0434)', () => {
    assert.match(read('components/fast-track/FastTrackWorkspace.tsx'), /The image preview failed to load\./);
});
