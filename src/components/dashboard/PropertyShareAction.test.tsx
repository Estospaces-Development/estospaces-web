import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import PropertyShareAction from './PropertyShareAction';

test('property share action is a persistent accessible touch target that opens a dialog', () => {
    const markup = renderToStaticMarkup(
        <PropertyShareAction
            propertyTitle="Anna Nagar"
            expanded
            onClick={() => {}}
        />,
    );

    assert.match(markup, /type="button"/);
    assert.match(markup, /aria-label="Share Anna Nagar on social media"/);
    assert.match(markup, /aria-haspopup="dialog"/);
    assert.match(markup, /aria-expanded="true"/);
    assert.match(markup, /h-11 w-11/);
    assert.match(markup, /focus-visible:ring-2/);
});

test('unpublished manager properties explain why social sharing is unavailable', () => {
    const markup = renderToStaticMarkup(
        <PropertyShareAction
            propertyTitle="Draft Home"
            disabled
            onClick={() => {}}
        />,
    );

    // aria-disabled (not disabled) so a tap still fires onClick and the parent can say why.
    assert.match(markup, /aria-disabled="true"/);
    assert.doesNotMatch(markup, /sdisabled=""/);
    assert.match(markup, /aria-label="Draft Home: Publish this property before sharing"/);
    assert.match(markup, /title="Publish this property before sharing"/);
});

test('blocked share action states the real reason for rented and pending-approval listings (#687)', () => {
    const rented = renderToStaticMarkup(
        <PropertyShareAction propertyTitle="Let Flat" status="rented" disabled onClick={() => {}} />,
    );
    assert.match(rented, /title="Rented properties can(?:'|&#x27;)t be shared"/);
    assert.doesNotMatch(rented, /Publish this property before sharing/);

    const pending = renderToStaticMarkup(
        <PropertyShareAction propertyTitle="Queued Flat" status="pending_approval" disabled onClick={() => {}} />,
    );
    assert.match(pending, /title="Waiting for admin approval"/);
    assert.match(pending, /aria-label="Queued Flat: Waiting for admin approval"/);
});

test('draft listings explain that drafts cannot be shared (#739)', () => {
    const markup = renderToStaticMarkup(
        <PropertyShareAction propertyTitle="Draft Home" status="draft" disabled onClick={() => {}} />,
    );
    assert.match(markup, /title="Draft properties can(?:'|&#x27;)t be shared"/);
});

test('disabled share action reads as disabled over a photo: grey fill, no shadow (#688)', () => {
    const markup = renderToStaticMarkup(
        <PropertyShareAction propertyTitle="Draft Home" disabled onClick={() => {}} />,
    );
    assert.match(markup, /aria-disabled:bg-gray-300/);
    assert.match(markup, /aria-disabled:shadow-none/);
    assert.doesNotMatch(markup, /aria-disabled:opacity-50/);
});

test('user and manager cards share one top-card action without the old green application control', () => {
    const userCard = readFileSync(resolve(process.cwd(), 'src/components/dashboard/PropertyCard.tsx'), 'utf8');
    const managerCard = readFileSync(resolve(process.cwd(), 'src/components/dashboard/ManagerPropertyCard.tsx'), 'utf8');

    assert.match(userCard, /pointer-events-none absolute inset-x-3 top-3[\s\S]*pointer-events-auto ml-auto[\s\S]*<PropertyShareAction/);
    assert.match(managerCard, /absolute right-3 top-3[\s\S]*<PropertyShareAction/);
    assert.doesNotMatch(userCard, /aria-label="Already applied"/);
    assert.doesNotMatch(userCard, /bg-green-500 text-white shadow-lg/);
    assert.equal((userCard.match(/<PropertyShareAction/g) || []).length, 1);
    assert.equal((managerCard.match(/<PropertyShareAction/g) || []).length, 1);
});
