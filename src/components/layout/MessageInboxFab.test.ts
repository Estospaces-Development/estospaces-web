import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldHideMessageInboxFab } from './MessageInboxFab';

test('message inbox shortcut does not cover the user support composer', () => {
    assert.equal(shouldHideMessageInboxFab('/user/dashboard/help'), true);
});
