import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');
const addProperty = read('src/pages/manager/dashboard/properties/add/page.tsx');

test('add-property phone placeholders are India/UK examples that follow the selected country (QA-E2E-20261014 B1)', () => {
    assert.doesNotMatch(addProperty, /\+1 \(555\)/);
    assert.match(addProperty, /formData\.countryCode === "GB" \? "\+44 7700 900000" : "\+91 98765 43210"/);
    assert.match(addProperty, /placeholder=\{contactPhonePlaceholder\}/);
});

test('manual lead budget placeholders use GBP/INR examples, not USD (QA-E2E-20261014 B4)', () => {
    for (const file of ['src/components/dashboard/AddLeadModal.tsx', 'src/components/ui/AddLeadModal.tsx']) {
        const source = read(file);
        assert.doesNotMatch(source, /\$2,500/);
        assert.match(source, /e\.g\., £1,250\/month or ₹25,000\/month/);
    }
});

test('add-property contact fields prefill from the signed-in manager only on create and only when empty (QA-E2E-20261014 B2)', () => {
    assert.match(addProperty, /if \(isEditMode \|\| contactPrefilledRef\.current \|\| !user\) return;/);
    assert.match(addProperty, /contactName: prev\.contactName \|\| user\.name \|\| ""/);
    assert.match(addProperty, /contactEmail: prev\.contactEmail \|\| user\.email \|\| ""/);
    assert.match(addProperty, /contactPhone: prev\.contactPhone \|\| user\.phone/);
});
