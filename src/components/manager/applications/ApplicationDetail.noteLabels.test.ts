import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./ApplicationDetail.tsx', import.meta.url), 'utf8');

// A placeholder is not an accessible name: it disappears on input and many screen readers skip it.
test('every manager application note textarea has an accessible name (E2E-c)', () => {
    const matches = [...source.matchAll(/<textarea\b/g)];
    assert.ok(matches.length >= 7, 'expected the decision note plus the six review-note textareas');
    for (const match of matches) {
        const start = match.index ?? 0;
        const element = source.slice(start, source.indexOf('/>', start));
        const before = source.slice(Math.max(0, start - 600), start);
        const insideLabel = before.lastIndexOf('<label') > before.lastIndexOf('</label>');
        assert.ok(
            /aria-label=/.test(element) || insideLabel,
            `textarea at offset ${start} has neither aria-label nor an enclosing label:\n${element.slice(0, 200)}`,
        );
    }
});

test('the review-note textareas are named for what they record (E2E-c)', () => {
    for (const name of [
        'Buyer qualification review notes',
        'Anti-money-laundering review notes',
        'Offer notes',
        'Referencing review notes',
        'Right to rent review notes',
    ]) {
        assert.match(source, new RegExp(`aria-label="${name}"`));
    }
    assert.match(source, /aria-label=\{`\$\{requirement\.label\} review notes`\}/);
});
