import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCompletedUserJourneyCopy,
  buildUserJourneyNowCopy,
  getUserJourneyPropertyDisplayTitle,
} from './userDashboardJourneySummary';

test('user dashboard journey summary hides internal fast-track timestamp titles', () => {
  assert.equal(
    getUserJourneyPropertyDisplayTitle('Codex Project5 FastTrack 2026-07-05T09-43-24-060Z'),
    'your selected home',
  );
  assert.equal(
    buildUserJourneyNowCopy('Codex Project5 FastTrack 2026-07-05T09-43-24-060Z', 'Choose your home'),
    'your selected home: ready to choose your home.',
  );
  assert.equal(
    buildCompletedUserJourneyCopy('QA Manual FT E2E 2026-06-25T18-30-15-991Z'),
    'your selected home has finished its guided journey.',
  );
});

test('user dashboard journey summary keeps human property titles', () => {
  assert.equal(getUserJourneyPropertyDisplayTitle('Canal View Apartment'), 'Canal View Apartment');
  assert.equal(
    buildUserJourneyNowCopy('Canal View Apartment', 'Share your documents'),
    'Canal View Apartment: ready to share your documents.',
  );
  assert.equal(
    buildUserJourneyNowCopy('Canal View Apartment', 'Legal, exchange, and agreement'),
    'Canal View Apartment: ready to complete legal checks, exchange, and agreement.',
  );
  assert.equal(
    buildUserJourneyNowCopy('Canal View Apartment', 'Completion and keys'),
    'Canal View Apartment: ready to complete the purchase and collect your keys.',
  );
});
