import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { Window } from 'happy-dom';

import { PropertyProvider } from '@/contexts/PropertyContext';
import { WorkspaceSyncProvider } from '@/contexts/WorkspaceSyncContext';
import ManagerPropertyCard from './ManagerPropertyCard';

const renderCard = (image_urls: unknown) => renderToStaticMarkup(
    <MemoryRouter><WorkspaceSyncProvider><PropertyProvider scope="manager" enabled={false}>
        <ManagerPropertyCard property={{ id: 'media-regression', title: 'Chennai property', status: 'draft', image_urls }} />
    </PropertyProvider></WorkspaceSyncProvider></MemoryRouter>,
);

test('manager missing media has one accessible empty state, not a placeholder image', () => {
    for (const images of [undefined, 'null', '[]', ['https://example.com/a.jpg']]) {
        const browser = new Window();
        try {
            browser.document.body.innerHTML = renderCard(images);
            assert.equal(browser.document.querySelectorAll('img').length, 0);
            const empty = browser.document.querySelectorAll('[role="img"]');
            assert.equal(empty.length, 1);
            assert.equal(empty[0].getAttribute('aria-label'), 'Chennai property media unavailable');
            assert.equal(empty[0].textContent, 'Property media unavailable');
        } finally { browser.close(); }
    }
});

test('manager card keeps a real uploaded image without also showing an empty state', () => {
    const browser = new Window();
    try {
        browser.document.body.innerHTML = renderCard(['https://media.estospaces.test/actual.jpg']);
        assert.equal(browser.document.querySelector('img')?.getAttribute('src'), 'https://media.estospaces.test/actual.jpg');
        assert.equal(browser.document.querySelectorAll('[role="img"]').length, 0);
    } finally { browser.close(); }
});
