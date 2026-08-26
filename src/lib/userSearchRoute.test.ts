import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPreservedUserSearchRedirect, USER_SEARCH_PATH } from './userSearchRoute';

test('canonical user search route stays inside the dashboard shell', () => {
    assert.equal(USER_SEARCH_PATH, '/user/dashboard/search');
});

test('legacy user search redirect preserves submitted filters and anchors', () => {
    assert.equal(
        buildPreservedUserSearchRedirect('?q=Chennai&market=india', '#results'),
        '/user/dashboard/search?q=Chennai&market=india#results',
    );
});
