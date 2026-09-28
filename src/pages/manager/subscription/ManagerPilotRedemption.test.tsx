import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { PilotRedemptionAvailability } from '@/lib/managerPilotRedemption';
import ManagerPilotRedemption from './ManagerPilotRedemption';

const render = (availability: PilotRedemptionAvailability, options: { disabled?: boolean; redeeming?: boolean } = {}) => renderToStaticMarkup(createElement(ManagerPilotRedemption, {
    availability,
    disabled: options.disabled ?? false,
    redeeming: options.redeeming ?? false,
    onRedeem: async () => assert.fail('rendering must not redeem'),
    timeZone: 'UTC',
}));

test('an active pilot shows its end date and no redeem form', () => {
    const markup = render({ kind: 'active', campaign: 'launch-pilot', startsAt: '2026-09-28T10:00:00Z', endsAt: '2026-11-27T10:00:00Z' });
    assert.match(markup, /Your pilot is active/);
    assert.match(markup, /role="status"[^>]*>Pilot access is active until <strong>27 Nov 2026, 10:00<\/strong>/);
    assert.match(markup, /Campaign: launch-pilot\. Started 28 Sept? 2026, 10:00\./);
    assert.doesNotMatch(markup, /<form|<input|Redeem pilot code/);
});

test('a blocked account sees the reason instead of the form', () => {
    const markup = render({ kind: 'blocked', reason: 'A pilot cannot start while this account has a paid subscription.' });
    assert.match(markup, /role="status"[^>]*>A pilot cannot start while this account has a paid subscription\./);
    assert.doesNotMatch(markup, /<form|<input|<button/);
});

test('an available form has a labelled input, described help and an enabled submit button', () => {
    const markup = render({ kind: 'available' });
    const inputId = /<label for="([^"]+)"[^>]*>Pilot code<\/label>/.exec(markup)?.[1];
    assert.ok(inputId, 'input must have a visible label');
    assert.match(markup, new RegExp(`<input id="${inputId}"`));
    assert.match(markup, /autoComplete="off"/);
    assert.match(markup, /aria-describedby="[^"]+-help"/);
    assert.match(markup, /<button type="submit" class="[^"]*">Redeem pilot code<\/button>/);
    assert.doesNotMatch(markup, /role="alert"|disabled=""/);
});

test('unknown status and busy states disable the form and show the busy label', () => {
    const unknown = render({ kind: 'unknown', reason: 'Pilot status could not be loaded. Refresh to try again before entering a code.' });
    assert.match(unknown, /role="status"[^>]*>Pilot status could not be loaded/);
    assert.match(unknown, /<input[^>]*disabled=""/);
    assert.match(unknown, /<button type="submit" disabled=""/);
    assert.match(unknown, /aria-describedby="[^"]+-help [^"]+-reason"/);

    const busy = render({ kind: 'available' }, { redeeming: true });
    assert.match(busy, /aria-busy="true"/);
    assert.match(busy, /<button type="submit" disabled=""[^>]*>.*Starting pilot…<\/button>/);

    assert.match(render({ kind: 'available' }, { disabled: true }), /<button type="submit" disabled=""/);
});

test('the submit handler blocks double submission and sends only the normalised code', () => {
    const source = readFileSync(new URL('./ManagerPilotRedemption.tsx', import.meta.url), 'utf8');
    assert.match(source, /if \(formDisabled \|\| submitting\.current\) return;/);
    assert.match(source, /submitting\.current = true;[\s\S]*await onRedeem\(normalizePilotCode\(code\)\)[\s\S]*finally \{\s*submitting\.current = false;/);
    assert.match(source, /const inputError = getPilotCodeInputError\(code\);\s*if \(inputError\) \{\s*setMessage\(inputError\);\s*return;/);
});

test('the page shares the action lock and re-reads the server summary after every redemption attempt', () => {
    const page = readFileSync(new URL('./page.tsx', import.meta.url), 'utf8');
    assert.match(page, /const redeemPilot = async \(code: string\): Promise<string \| null> => \{\s*if \(actionLock\.current\) return/);
    assert.match(page, /await redeemManagerPilotCoupon\(code\);[\s\S]*catch \(err\) \{\s*return getPilotRedeemErrorMessage\(err\);\s*\} finally \{\s*await load\(\);\s*actionLock\.current = false;/);
    assert.match(page, /const pilotRequest = Promise\.allSettled\(\[getManagerPilotStatus\(\)\]\);/);
    assert.match(page, /<ManagerPilotRedemption availability=\{pilotAvailability\} disabled=\{busy\} redeeming=\{busyPlan === 'pilot'\} onRedeem=\{redeemPilot\} \/>/);
});
