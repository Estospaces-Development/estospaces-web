import assert from 'node:assert/strict';
import test from 'node:test';
import {
    ROLE_VIDEOS,
    getRoleVideoEmbedUrl,
    getRoleVideoWatchUrl,
    hasSeenWelcomeVideo,
    markWelcomeVideoSeen,
    welcomeVideoStorageKey,
} from './roleVideos';

const memoryStorage = () => {
    const data = new Map<string, string>();
    return {
        getItem: (key: string) => data.get(key) ?? null,
        setItem: (key: string, value: string) => void data.set(key, value),
    };
};

test('each role maps to its own video', () => {
    assert.equal(ROLE_VIDEOS.user.id, 'xM140AfjOBA');
    assert.equal(ROLE_VIDEOS.manager.id, 'hi-H7D164NA');
    assert.equal(getRoleVideoWatchUrl(ROLE_VIDEOS.user.id), 'https://www.youtube.com/watch?v=xM140AfjOBA');
});

test('embeds use the privacy-enhanced domain and autoplay after the viewer clicks', () => {
    const url = new URL(getRoleVideoEmbedUrl('hi-H7D164NA'));
    assert.equal(url.origin, 'https://www.youtube-nocookie.com');
    assert.equal(url.pathname, '/embed/hi-H7D164NA');
    assert.equal(url.searchParams.get('autoplay'), '1');
});

test('the welcome video shows once per user and role', () => {
    const storage = memoryStorage();
    assert.equal(hasSeenWelcomeVideo('user', 'u1', storage), false);
    markWelcomeVideoSeen('user', 'u1', storage);
    assert.equal(hasSeenWelcomeVideo('user', 'u1', storage), true);
    assert.equal(hasSeenWelcomeVideo('user', 'u2', storage), false);
    assert.equal(hasSeenWelcomeVideo('manager', 'u1', storage), false);
    assert.equal(welcomeVideoStorageKey('manager', 'u1'), 'estospaces_welcome_video_seen_manager_u1');
});

test('blocked storage never throws and just shows the video again', () => {
    const blocked = {
        getItem: () => {
            throw new Error('blocked');
        },
        setItem: () => {
            throw new Error('blocked');
        },
    };
    assert.equal(hasSeenWelcomeVideo('user', 'u1', blocked), false);
    assert.doesNotThrow(() => markWelcomeVideoSeen('user', 'u1', blocked));
    assert.equal(hasSeenWelcomeVideo('user', 'u1', null), false);
});
