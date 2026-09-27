import assert from 'node:assert/strict';
import test from 'node:test';

import { getFastTrackPreviewSourceKey } from './fastTrackWorkspace';

test('document preview key ignores polled object identity but tracks the previewed file', () => {
    const polledA = { id: 'identity', documentRecordId: 'doc-1', fileUrl: 'https://files.test/a.pdf', status: 'uploaded' };
    const polledB = { ...polledA, note: 'refreshed by poll' };
    assert.equal(getFastTrackPreviewSourceKey(polledA, false), getFastTrackPreviewSourceKey(polledB, false));
    assert.notEqual(getFastTrackPreviewSourceKey(polledA, false), getFastTrackPreviewSourceKey({ ...polledA, documentRecordId: 'doc-2' }, false));
    assert.notEqual(getFastTrackPreviewSourceKey(polledA, false), getFastTrackPreviewSourceKey({ ...polledA, fileUrl: 'https://files.test/b.pdf' }, false));
    assert.notEqual(getFastTrackPreviewSourceKey(polledA, false), getFastTrackPreviewSourceKey(polledA, true));
    assert.equal(getFastTrackPreviewSourceKey(null, false), '');
});

test('the workspace re-resolves previews by file identity, not by polled object', async () => {
    const { readFileSync } = await import('node:fs');
    const source = readFileSync(new URL('../components/fast-track/FastTrackWorkspace.tsx', import.meta.url), 'utf8');
    assert.match(source, /\}, \[previewSourceKey, releasePreviewObjectUrl\]\);/);
    assert.doesNotMatch(source, /\}, \[ensureDocumentPreview, previewItem, previewItemId, releasePreviewObjectUrl, selectedFiles\]\);/);
});
