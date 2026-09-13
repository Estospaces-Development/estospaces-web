import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import type { RoleDocsConfig, RoleDocsDocument } from '@/lib/roleDocs';

import RoleDocsPage from './RoleDocsPage';

const config: RoleDocsConfig = {
    role: 'manager',
    label: 'Manager Docs',
    title: 'Manager guide',
    subtitle: 'Test guide',
    audience: [],
    searchPlaceholder: 'Search this guide',
    supportTitle: 'Support',
    supportDescription: 'Support description',
    supportHref: '/manager/help',
    supportCta: 'Get support',
    quickActions: [],
    faqs: [],
    glossary: [],
    markdown: '',
};

const docsDocument: RoleDocsDocument = {
    intro: 'Test guide',
    sections: [{ title: 'Overview', slug: 'overview', body: 'Test section' }],
};

test('docs search keeps a dedicated leading gutter for its search icon', () => {
    const markup = renderToStaticMarkup(
        <MemoryRouter>
            <RoleDocsPage config={config} docsDocument={docsDocument} />
        </MemoryRouter>,
    );

    assert.match(markup, /aria-label="Search Manager Docs"/);
    assert.match(markup, /!pl-11/);
});
