import assert from 'node:assert/strict';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import ManagerRecurringConsent from './ManagerRecurringConsent';

const TEXT = 'I understand this is a monthly recurring subscription.';
const render = (overrides: Partial<Parameters<typeof ManagerRecurringConsent>[0]> = {}) => renderToStaticMarkup(createElement(ManagerRecurringConsent, {
    text: TEXT, checked: false, disabled: false, onChange: () => {}, ...overrides,
}));

test('the consent checkbox has a 44px tap area inside a fully clickable label (web-app#648)', () => {
    const markup = render();
    // The native checkbox and its text are both inside the label, so tapping anywhere on the card toggles it.
    assert.match(markup, /^<label class="[^"]*min-h-11[^"]*cursor-pointer[^"]*"><span class="[^"]*h-11 w-11[^"]*"><input type="checkbox"[^>]*\/><\/span><span[^>]*>I understand this is a monthly recurring subscription\.<\/span><\/label>$/);
    assert.match(markup, /<input type="checkbox"[^>]*class="[^"]*h-6 w-6[^"]*focus-visible:outline-2/);
});

test('disabled consent cannot be ticked and does not look tappable', () => {
    const markup = render({ disabled: true });
    assert.match(markup, /<input type="checkbox" disabled=""/);
    assert.match(markup, /cursor-not-allowed/);
    assert.doesNotMatch(markup, /cursor-pointer/);
});

test('checked state is rendered from props', () => {
    assert.match(render({ checked: true }), /<input type="checkbox"[^>]*checked=""/);
    assert.doesNotMatch(render(), /checked=""/);
});
