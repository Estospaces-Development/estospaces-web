import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ADMIN_LISTING_OWNER_NOT_SET_LABEL, resolveAdminListingOwner } from './adminListingOwner';

const currentDir = path.dirname(fileURLToPath(import.meta.url));

test('listing owner prefers the owning manager account over the listing contact', () => {
    assert.deepEqual(
        resolveAdminListingOwner({ managerName: 'Priya Sharma', contactName: 'Front Desk' }),
        { label: 'Priya Sharma', initials: 'PS', isSet: true },
    );
    assert.deepEqual(
        resolveAdminListingOwner({ manager_name: '  Priya   Sharma ', agent_name: 'Front Desk' }),
        { label: 'Priya Sharma', initials: 'PS', isSet: true },
    );
});

test('title-only draft with no contact still shows its owning manager', () => {
    assert.deepEqual(
        resolveAdminListingOwner({ managerName: 'Priya Sharma', contactName: '' }),
        { label: 'Priya Sharma', initials: 'PS', isSet: true },
    );
});

test('a listing contact never stands in for the owner, so card and detail agree', () => {
    assert.deepEqual(
        resolveAdminListingOwner({ managerName: '   ', contactName: 'Alex' }),
        { label: 'Owner not set', initials: '--', isSet: false },
    );
});

test('listing owner is plainly not set instead of an unknown user', () => {
    for (const source of [undefined, null, {}, { managerName: '', contactName: '  ' }, { manager_name: null, agent_name: null }]) {
        const owner = resolveAdminListingOwner(source);
        assert.equal(owner.label, ADMIN_LISTING_OWNER_NOT_SET_LABEL);
        assert.equal(owner.isSet, false);
        assert.notEqual(owner.label, 'Unknown Owner');
    }
});

test('admin registry card and detail page render the resolved listing owner', () => {
    const cardSource = readFileSync(path.resolve(currentDir, '../pages/admin/properties/page.tsx'), 'utf8');
    assert.match(cardSource, /resolveAdminListingOwner\(property\)/);
    assert.doesNotMatch(cardSource, /Unknown Owner/);

    const detailSource = readFileSync(path.resolve(currentDir, '../pages/admin/properties/[id]/page.tsx'), 'utf8');
    assert.match(detailSource, /resolveAdminListingOwner\(\{ manager_name: property\.manager_name \}\)/);
});

test('property context maps the admin manager_name wire field to managerName', () => {
    const contextSource = readFileSync(path.resolve(currentDir, '../contexts/PropertyContext.tsx'), 'utf8');
    assert.match(contextSource, /managerName: p\.manager_name\?\.trim\(\) \|\| undefined/);
});
