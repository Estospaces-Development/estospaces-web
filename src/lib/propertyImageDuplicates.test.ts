import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { findDuplicateListingImage, type UploadedImageRecord } from './propertyImageDuplicates';

const saved: UploadedImageRecord[] = [
    { name: 'front.jpg', size: 2048, url: 'https://media.test/uploads/p1/front.jpg' },
    { name: 'kitchen.png', size: 4096, url: 'https://media.test/uploads/p1/kitchen.png' },
];
const listing = ['https://media.test/uploads/p1/front.jpg', 'https://media.test/uploads/p1/kitchen.png'];

test('re-selecting an image already saved on the listing is a duplicate (QA MB-0230)', () => {
    assert.equal(
        findDuplicateListingImage({ name: 'front.jpg', size: 2048 }, saved, listing),
        'https://media.test/uploads/p1/front.jpg',
    );
});

test('a different name or a different size is a different image', () => {
    assert.equal(findDuplicateListingImage({ name: 'front.jpg', size: 2049 }, saved, listing), undefined);
    assert.equal(findDuplicateListingImage({ name: 'front-2.jpg', size: 2048 }, saved, listing), undefined);
});

test('an image the manager removed from the listing can be added again', () => {
    assert.equal(
        findDuplicateListingImage({ name: 'front.jpg', size: 2048 }, saved, ['https://media.test/uploads/p1/kitchen.png']),
        undefined,
    );
});

test('pending local files in the gallery never count as saved images', () => {
    const pending = new File([new Uint8Array(2048)], 'front.jpg', { type: 'image/jpeg' });
    assert.equal(findDuplicateListingImage({ name: 'front.jpg', size: 2048 }, saved, [pending]), undefined);
});

test('a cache-version or signature query on the stored URL does not hide the match', () => {
    assert.equal(
        findDuplicateListingImage(
            { name: 'kitchen.png', size: 4096 },
            saved,
            ['https://media.test/uploads/p1/kitchen.png?esto_media=read-context-v2'],
        ),
        'https://media.test/uploads/p1/kitchen.png',
    );
});

test('nothing is a duplicate when no uploads are known yet', () => {
    assert.equal(findDuplicateListingImage({ name: 'front.jpg', size: 2048 }, [], listing), undefined);
});

test('the add-property image picker skips duplicates of saved images before reading the file', () => {
    const source = fs.readFileSync('src/pages/manager/dashboard/properties/add/page.tsx', 'utf8');
    assert.match(source, /findDuplicateListingImage\(\s*file,\s*savedImageRecords,\s*formData\.images,?\s*\)/);
    assert.match(source, /savedImageRecords = mediaFiles\.map\(/);
    assert.match(source, /name: media\.original_name,\s*size: media\.file_size,\s*url: media\.file_url,/);
    // The duplicate check runs before the format, size and decode checks.
    assert.ok(source.indexOf('findDuplicateListingImage(') < source.indexOf('ALLOWED_IMAGE_TYPES.has(file.type)'));
});
