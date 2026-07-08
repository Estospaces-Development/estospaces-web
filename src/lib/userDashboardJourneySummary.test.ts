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
    'your selected home is at choose your home.',
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
    'Canal View Apartment is at share your documents.',
  );
});
