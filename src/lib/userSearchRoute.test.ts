import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPreservedUserSearchRedirect, USER_SEARCH_PATH } from './userSearchRoute';

test('canonical user search route uses the single discover experience', () => {
    assert.equal(USER_SEARCH_PATH, '/user/dashboard/discover');
});

test('legacy user search redirect preserves submitted filters and anchors', () => {
    assert.equal(
        buildPreservedUserSearchRedirect('?q=Chennai&market=india', '#results'),
        '/user/dashboard/discover?q=Chennai&market=india#results',
    );
});
