import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { getPropertyVideos } from './propertyImages';

test('property videos resolve media-service uploads through the configured proxy', () => {
    const videos = getPropertyVideos({
        video_urls: [
            'https://estospaces-media-service-dev-zaryfkxmeq-nw.a.run.app/uploads/property/property-1/tour.mp4',
        ],
    });

    assert.equal(videos.length, 1);
    assert.match(videos[0], /\/uploads\/property\/property-1\/tour\.mp4(?:\?|$)/);
});

test('property videos accept persisted JSON and contextual media shapes without duplicates', () => {
    const videos = getPropertyVideos({
        video_urls: '["/uploads/property/property-1/tour.webm"]',
        media: { videos: [{ url: '/uploads/property/property-1/tour.webm' }] },
    });

    assert.deepEqual(videos, [videos[0]]);
    assert.match(videos[0], /tour\.webm(?:\?|$)/);
});

test('property create and both role detail pages share the supported video contract', () => {
    const createPage = readFileSync('src/pages/manager/dashboard/properties/add/page.tsx', 'utf8');
    const managerPage = readFileSync('src/pages/manager/dashboard/properties/[id]/page.tsx', 'utf8');
    const userPage = readFileSync('src/pages/user/properties/[id]/page.tsx', 'utf8');

    assert.match(createPage, /accept="video\/mp4,video\/webm,video\/quicktime,\.mp4,\.webm,\.mov"/);
    assert.match(managerPage, /getPropertyVideos\(property\)/);
    assert.match(userPage, /getPropertyVideos\(property\)/);
    assert.match(userPage, /<video[\s\S]*?<source src=\{videoUrl\}/);
});
