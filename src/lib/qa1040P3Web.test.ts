import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('checkboxes show a solid keyboard focus ring in both themes (MB-0882, MB-0894)', () => {
    const css = read('globals.css');
    assert.match(css, /input\[type="checkbox"\]:focus-visible \{\s*outline: 2px solid #c2410c;/);
    assert.match(css, /\.dark input\[type="checkbox"\]:focus-visible \{\s*outline-color: #fdba74;/);
});

test('dashboard pulse animations respect reduced motion (MB-0896)', () => {
    for (const file of ['components/dashboard/WelcomeBanner.tsx', 'components/dashboard/BrokerResponseWidget.tsx']) {
        assert.doesNotMatch(read(file), /(?<![:\w-])animate-pulse/, file);
    }
});

test('the profile heading shows the saved name, not unsaved edits (MB-0090)', () => {
    assert.match(read('pages/user/dashboard/profile/page.tsx'), /\[baselineData\.firstName, baselineData\.lastName\]\.join\(' '\)\.trim\(\) \|\| 'User'\}<\/h2>/);
});

test('opening a grouped notification marks every unread member read (MB-0992)', () => {
    assert.match(read('pages/manager/notifications/page.tsx'), /for \(const memberId of \(n\.unreadMemberIds\?\.length \? n\.unreadMemberIds : \[n\.id\]\)\)/);
});

test('failed property videos and map tiles explain themselves (MB-0251, MB-0218)', () => {
    assert.match(read('pages/user/properties/[id]/page.tsx'), /This video could not load\./);
    assert.match(read('components/dashboard/NearbyPropertiesMap.tsx'), /The map could not load\. Switch to Cards to see these homes\./);
});
