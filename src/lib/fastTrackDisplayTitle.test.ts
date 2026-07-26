import assert from 'node:assert/strict';
import test from 'node:test';
import { getFastTrackDisplayTitle } from './fastTrackDisplayTitle';

test('fast-track display titles hide internal QA artifact labels', () => {
  assert.equal(
    getFastTrackDisplayTitle('Codex Project5 FastTrack 2026-07-05T09-43-24-060Z', 'Test User fast-track case'),
    'Test User fast-track case',
  );
  assert.equal(
    getFastTrackDisplayTitle('QA Manual FT E2E 2026-06-25T18-30-15-991Z', 'Selected fast-track case'),
    'Selected fast-track case',
  );
});

test('fast-track display titles keep real property titles', () => {
  assert.equal(getFastTrackDisplayTitle('Canal View Apartment', 'Selected fast-track case'), 'Canal View Apartment');
});
