import assert from 'node:assert/strict';
import test from 'node:test';

import { getRouteTitle } from './routeTitle';

test('route titles name the page and never expose ids', () => {
    assert.equal(getRouteTitle('/manager/leads'), 'Leads | Estospaces');
    assert.equal(getRouteTitle('/user/dashboard/fast-track'), 'Fast Track | Estospaces');
    assert.equal(getRouteTitle('/manager/dashboard'), 'Dashboard | Estospaces');
    assert.equal(getRouteTitle('/faq'), 'Faq | Estospaces');
    assert.equal(getRouteTitle('/manager/contracts/3f2b8c1e-9d4a-4e6b-8a1c-2d3e4f5a6b7c'), 'Contracts | Estospaces');
    assert.equal(getRouteTitle('/'), 'Estospaces');
    assert.equal(getRouteTitle('/manager/dashboard/properties/add'), 'Add property | Estospaces');
    assert.equal(getRouteTitle('/manager/dashboard/properties/edit/3f2b8c1e-9d4a-4e6b-8a1c-2d3e4f5a6b7c'), 'Edit property | Estospaces');
    assert.equal(getRouteTitle('/manager/dashboard/properties/3f2b8c1e-9d4a-4e6b-8a1c-2d3e4f5a6b7c'), 'Property | Estospaces');
    assert.equal(getRouteTitle('/manager/dashboard/properties'), 'Properties | Estospaces');
});
