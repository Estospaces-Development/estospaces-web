import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';

import { ManagerTrialBannerView } from './ManagerTrialBanner';

const render = (element: ReturnType<typeof createElement>) => renderToStaticMarkup(createElement(MemoryRouter, null, element));

test('warning banner is announced and links to the subscription page', () => {
    const markup = render(createElement(ManagerTrialBannerView, {
        banner: { kind: 'ending_soon', tone: 'warning', title: 'Your Growth plan ends in 3 days.', detail: 'Subscribe to keep your limits.', action: { label: 'Subscribe' } },
    }));
    assert.match(markup, /role="alert"/);
    assert.match(markup, /data-trial-banner="ending_soon"/);
    assert.match(markup, /href="\/manager\/subscription"[^>]*>Subscribe<\/a>/);
});

test('active banner is a status without an action, and in-page anchors stay on the page', () => {
    const active = render(createElement(ManagerTrialBannerView, { banner: { kind: 'active', tone: 'info', title: 'Growth plan active until 27 November 2026' } }));
    assert.match(active, /role="status"/);
    assert.doesNotMatch(active, /<a /);
    const ended = render(createElement(ManagerTrialBannerView, {
        banner: { kind: 'ended', tone: 'neutral', title: 'Your Growth trial ended.', action: { label: 'See plans' } }, actionHref: '#compare-plans',
    }));
    assert.match(ended, /href="#compare-plans"/);
});
