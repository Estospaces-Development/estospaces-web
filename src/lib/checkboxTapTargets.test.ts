import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolve } from 'node:path';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

// #703 / #704: a checkbox beside a long wrapped label is a flex child and could
// be squeezed below its size; the global unlayered rule also beat the layered
// h-4 w-4 utility, so the box never reached a comfortable size.
test('the global checkbox rule never lets a checkbox shrink inside a flex row (#703, #704)', () => {
    const css = read('src/globals.css');
    const rule = css.match(/\ninput\[type="checkbox"\] \{([^}]*)\}/);
    assert.ok(rule, 'global input[type="checkbox"] rule not found');
    assert.match(rule[1], /flex-shrink:\s*0/);
});

test('billing-country review checkbox has a 24px box and a 44px tap row (#703)', () => {
    const source = read('src/components/admin/ManagerBillingMarketReview.tsx');
    assert.match(source, /<label className="[^"]*min-h-11[^"]*"><input type="checkbox"[\s\S]{0,200}?className="[^"]*size-6![^"]*"/);
    assert.doesNotMatch(source, /h-4 w-4 accent-orange-600/);
});

test('promotion offer checklist has 24px boxes, 44px tap rows and its own full-width row (#704)', () => {
    const source = read('src/pages/admin/subscriptions/AdminPromotionsSection.tsx');
    assert.match(source, /<label key=\{item\.id\} className="[^"]*min-h-11[^"]*"><input type="checkbox"[\s\S]{0,200}?className="[^"]*size-6![^"]*"/);
    assert.doesNotMatch(source, /<label key=\{item\.id\} className="flex items-start gap-2">/);
    // The checklist is no longer nested in the narrow Actions cell.
    assert.match(source, /<tr[^>]*><td colSpan=\{8\}[^>]*>\{?[\s\S]{0,40}<OfferChecklist /);
    assert.doesNotMatch(source, /<\/div>\s*\{offerCheck\?\.key === `\$\{promotion\.id\}:\$\{promotion\.version\}` \? <OfferChecklist/);
});
