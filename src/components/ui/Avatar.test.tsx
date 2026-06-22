import test from 'node:test';
import assert from 'node:assert/strict';
import { isRenderableAvatarSrc } from './Avatar';

test('avatar source guard blocks private GCS media bucket objects', () => {
    assert.equal(
        isRenderableAvatarSrc('https://storage.googleapis.com/estospaces-media-dev/user/user-1/avatar.jpg'),
        false,
    );
    assert.equal(
        isRenderableAvatarSrc('https://storage.cloud.google.com/estospaces-media-prod/user/user-1/avatar.jpg'),
        false,
    );
});

test('avatar source guard allows signed media and normal public image URLs', () => {
    assert.equal(
        isRenderableAvatarSrc('https://estospaces-media-service-dev-zaryfkxmeq-nw.a.run.app/api/v1/media/access/file-1'),
        true,
    );
    assert.equal(isRenderableAvatarSrc('https://images.example.test/avatar.jpg'), true);
});
