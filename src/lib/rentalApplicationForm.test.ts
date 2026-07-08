import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const propertyDetailSource = readFileSync(
  resolve(process.cwd(), 'src/pages/user/properties/[id]/page.tsx'),
  'utf8',
);

test('rental application employment status placeholder is not selectable', () => {
  assert.match(propertyDetailSource, /<option value="" disabled>Select status<\/option>/);
  assert.doesNotMatch(propertyDetailSource, /<option value="">Select status<\/option>/);
  assert.match(propertyDetailSource, /errors\.employmentStatus = 'Choose an employment status\.'/);
});
