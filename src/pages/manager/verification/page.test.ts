import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.resolve(testDir, 'page.tsx'), 'utf8');

test('manager verification opens previewable image documents inside the current workspace', () => {
    assert.match(source, /interface ManagerDocumentPreview/);
    assert.match(source, /selectedDocumentPreview/);
    assert.match(source, /setSelectedDocumentPreview\(\{/);
    assert.match(source, /role="dialog"/);
    assert.match(source, /Close manager verification document preview/);
    assert.match(source, /void handleOpenDocument\(doc, step\.title, previewUrl\)/);
    assert.match(source, /isPreviewableImageDocument\(document\.mime_type, document\.document_url\)/);
    assert.match(source, /openDocumentAccessUrl\(document\.id\)/);
    assert.doesNotMatch(source, /handleOpenDocument\(doc\.id\)/);
});

test('manager verification lets uploaded documents be replaced from every review state', () => {
    assert.match(source, /\['not_uploaded', 'pending', 'under_review', 'approved', 'rejected', 'reupload_required'\]\.includes\(status\)/);
    assert.match(source, /hasDocument \? 'Replace File' : 'Upload File'/);
    assert.match(source, /aria-label=\{`Upload \$\{step\.title\}`\}/);
    assert.match(source, /void handleDocumentUpload\(step\.id, file\)/);
});
