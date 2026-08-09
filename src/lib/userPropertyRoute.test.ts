import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

import { buildUserDashboardPropertyPath } from './userPropertyRoute';

test('ticket 422 redirects a legacy property URL with the real property id', () => {
    assert.equal(
        buildUserDashboardPropertyPath('property-422'),
        '/user/dashboard/properties/property-422',
    );
});

test('ticket 422 preserves fast-track query and section hash during redirect', () => {
    assert.equal(
        buildUserDashboardPropertyPath('gurgaon apartments', '?fast-track=1', '#overview'),
        '/user/dashboard/properties/gurgaon%20apartments?fast-track=1#overview',
    );
});

test('ticket 422 rejects missing or literal placeholder property ids', () => {
    assert.equal(buildUserDashboardPropertyPath(undefined), '/user/dashboard/discover');
    assert.equal(buildUserDashboardPropertyPath(':id'), '/user/dashboard/discover');
});

test('the legacy property route uses the dynamic redirect component', () => {
    const appSource = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');

    assert.match(appSource, /path="properties\/:id" element=\{<LegacyUserPropertyRedirect \/>\}/);
    assert.doesNotMatch(appSource, /to="\/user\/dashboard\/properties\/:id"/);
});
