import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(
    new URL('../components/manager/LeadActionMap.tsx', import.meta.url),
    'utf8',
);

test('manager lead map never repeats the world or renders unverified locations', () => {
    assert.match(source, /noWrap/);
    assert.match(source, /worldCopyJump/);
    assert.match(source, /minZoom=\{2\}/);
    assert.match(source, /No verified lead locations/);
    assert.match(source, /not placed at an approximate or incorrect location/);
});

test('manager lead map reports overlapping leads as verified locations', () => {
    assert.match(source, /uniqueLocationCount/);
    assert.match(source, /Across \{uniqueLocationCount\} verified location/);
});

test('#672 lead map selection covers live leads that have no verified location yet', () => {
    assert.match(source, /leads\.find\(\(lead\) => lead\.id === selectedLeadID\)/);
    assert.match(source, /pickDefaultManagerLead\(leads, now\)/);
    assert.match(source, /Not on the map yet/);
});

const css = readFileSync(new URL('../globals.css', import.meta.url), 'utf8');

test('#713 same-location leads share a badged marker and a switcher in the popup', () => {
    assert.match(source, /groupLeadsByLocation/);
    assert.match(source, /leads at this location/);
});

test('#714 popup opens above its marker, compact and auto-panned', () => {
    assert.match(source, /popupAnchor: \[0, -\(size \+ 6\)\]/);
    assert.match(source, /maxHeight: 240/);
    assert.match(source, /autoPan: true/);
});

test('#715/#718 summary card clears the zoom control and the map stays under the sticky header', () => {
    assert.match(source, /absolute left-14 top-3/);
    assert.match(source, /relative isolate h-\[460px\]/);
    assert.match(source, /scroll-mt-\[calc\(var\(--workspace-header-height/);
});

test('#716 popup close button has a 44px tap target on touch/mobile', () => {
    assert.match(css, /lead-map-popup a\.leaflet-popup-close-button \{\s*width: 44px;\s*height: 44px;/);
});

test('#717 countdown pill stacks below the description on narrow screens', () => {
    assert.match(source, /flex-col gap-3[^"]*sm:flex-row/);
    assert.match(source, /w-fit shrink-0 rounded-full/);
});

test('#719 popup text meets WCAG AA on its white background', () => {
    const popup = source.slice(source.indexOf('<Popup options'), source.indexOf('</Popup>'));
    assert.doesNotMatch(popup, /text-(gray|slate)-(300|400|500)/);
});

test('#720 popup and panel render the same shared action list', () => {
    assert.match(source, /renderLeadActions\(activeLead, 'popup'\)/);
    assert.match(source, /renderLeadActions\(selectedLead, 'panel'\)/);
});
