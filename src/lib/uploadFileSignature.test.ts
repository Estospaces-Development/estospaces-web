import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import {
    EMPTY_FILE_MESSAGE,
    getImageFileProblem,
    getLocalFileFingerprint,
    getVideoFileProblem,
    readFileHead,
} from './uploadFileSignature';

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (value: string) => new TextEncoder().encode(value);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0x10);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
const MP4 = bytes(0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d);
const WEBM = bytes(0x1a, 0x45, 0xdf, 0xa3, 1, 2);

test('images must be non-empty and match their declared type', () => {
    assert.equal(getImageFileProblem({ size: 6, type: 'image/jpeg' }, JPEG), null);
    assert.equal(getImageFileProblem({ size: 6, type: 'image/jpg' }, JPEG), null);
    assert.equal(getImageFileProblem({ size: 8, type: 'image/png' }, PNG), null);
    assert.equal(getImageFileProblem({ size: 12, type: 'image/webp' }, text('RIFF\u0000\u0000\u0000\u0000WEBPVP8 ')), null);
    assert.equal(getImageFileProblem({ size: 6, type: 'image/gif' }, text('GIF89a')), null);
    assert.equal(getImageFileProblem({ size: 0, type: 'image/jpeg' }, bytes()), EMPTY_FILE_MESSAGE);
    assert.match(getImageFileProblem({ size: 20, type: 'image/jpeg' }, text('just some text here')) || '', /do not match/);
    assert.match(getImageFileProblem({ size: 6, type: 'image/png' }, JPEG) || '', /do not match/);
});

test('videos must be a real MP4/MOV or WebM container', () => {
    assert.equal(getVideoFileProblem({ size: 12 }, MP4), null);
    assert.equal(getVideoFileProblem({ size: 6 }, WEBM), null);
    assert.equal(getVideoFileProblem({ size: 0 }, bytes()), EMPTY_FILE_MESSAGE);
    assert.match(getVideoFileProblem({ size: 38 }, text('not a video, only text bytes')) || '', /do not match/);
    assert.match(getVideoFileProblem({ size: 6 }, JPEG) || '', /do not match/);
});

test('file heads are read from the start of the blob', async () => {
    assert.deepEqual(await readFileHead(new Blob([PNG]), 4), bytes(0x89, 0x50, 0x4e, 0x47));
});

test('the same selected file has one fingerprint', () => {
    const a = new File([JPEG], 'home.jpg', { type: 'image/jpeg', lastModified: 1 });
    const b = new File([JPEG], 'home.jpg', { type: 'image/jpeg', lastModified: 1 });
    const c = new File([JPEG], 'other.jpg', { type: 'image/jpeg', lastModified: 1 });
    assert.equal(getLocalFileFingerprint(a), getLocalFileFingerprint(b));
    assert.notEqual(getLocalFileFingerprint(a), getLocalFileFingerprint(c));
});

test('property editor and Fast Track documents use the byte checks', () => {
    const editor = readFileSync(resolve(process.cwd(), 'src/pages/manager/dashboard/properties/add/page.tsx'), 'utf8');
    assert.ok(editor.includes('getImageFileProblem(file, await readFileHead(file))'));
    assert.ok(editor.includes('getVideoFileProblem(file, await readFileHead(file))'));
    assert.ok(editor.includes('seenImageFingerprints.has(fingerprint)'));
    const leads = readFileSync(resolve(process.cwd(), 'src/services/leadsService.ts'), 'utf8');
    assert.ok(leads.includes('if (file.size === 0) throw new Error(EMPTY_FILE_MESSAGE);'));
});
