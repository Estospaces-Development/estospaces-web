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
    assert.match(markup, /h-10 w-10/);
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

    assert.match(markup, /disabled=""/);
    assert.match(markup, /aria-label="Publish Draft Home before sharing"/);
    assert.match(markup, /title="Publish this property before sharing"/);
});

test('user and manager cards share one top-card action without the old green application control', () => {
    const userCard = readFileSync(resolve(process.cwd(), 'src/components/dashboard/PropertyCard.tsx'), 'utf8');
    const managerCard = readFileSync(resolve(process.cwd(), 'src/components/dashboard/ManagerPropertyCard.tsx'), 'utf8');

    assert.match(userCard, /absolute top-3 right-3[\s\S]*<PropertyShareAction/);
    assert.match(managerCard, /absolute right-3 top-3[\s\S]*<PropertyShareAction/);
    assert.doesNotMatch(userCard, /aria-label="Already applied"/);
    assert.doesNotMatch(userCard, /bg-green-500 text-white shadow-lg/);
    assert.equal((userCard.match(/<PropertyShareAction/g) || []).length, 1);
    assert.equal((managerCard.match(/<PropertyShareAction/g) || []).length, 1);
});
