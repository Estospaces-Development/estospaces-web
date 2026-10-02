import assert from 'node:assert/strict';
import test from 'node:test';
import { getApplicationPropertyOptions } from './applicationPropertyOptions';

test('saved properties become title and city options', () => {
  assert.deepEqual(
    getApplicationPropertyOptions([
      { id: ' prop-1 ', title: 'Sea View Flat', city: 'Mumbai' },
      { id: 'prop-2', title: 'Garden House', location: { city: 'London' } },
    ]),
    [
      { id: 'prop-1', label: 'Sea View Flat, Mumbai' },
      { id: 'prop-2', label: 'Garden House, London' },
    ],
  );
});

test('records without an ID are skipped and missing title or city stay readable', () => {
  assert.deepEqual(
    getApplicationPropertyOptions([null, { title: 'No id' }, { id: 'prop-3' }]),
    [{ id: 'prop-3', label: 'Untitled home' }],
  );
});
