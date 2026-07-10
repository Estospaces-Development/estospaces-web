import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getFastTrackDisplayTitle,
  getFastTrackWorkspaceDisplayTitle,
  isInternalFastTrackTitle,
} from './fastTrackDisplayTitle';

test('fast-track display titles hide internal QA artifact labels', () => {
  const generatedTitles = [
    'Codex Project5 FastTrack 2026-07-05T09-43-24-060Z',
    'QA Manual FT E2E 2026-06-25T18-30-15-991Z',
    'QA LIVE 24H CANCELLED 2026-05-05T19-15-46-962Z',
    'Dev validation proof 1775036317781',
    'QA FT Dashboard Workspace 20260701195308',
    'Issue209 Persist Proof 20260701213805',
    'Round896 Issue228 Fresh Assignment 1783610503279',
  ];

  for (const title of generatedTitles) {
    assert.equal(isInternalFastTrackTitle(title), true, title);
    assert.equal(
      getFastTrackDisplayTitle(title, 'Selected fast-track case'),
      'Selected fast-track case',
      title,
    );
  }
});

test('fast-track display titles keep real property titles', () => {
  assert.equal(isInternalFastTrackTitle('Canal View Apartment'), false);
  assert.equal(getFastTrackDisplayTitle('Canal View Apartment', 'Selected fast-track case'), 'Canal View Apartment');
});

test('fast-track workspace titles use role-aware fallbacks for internal labels', () => {
  const fastTrackCase = {
    propertyTitle: 'Round896 Issue228 Fresh Assignment 1783610503279',
    clientName: 'Test User',
  };

  assert.equal(getFastTrackWorkspaceDisplayTitle(fastTrackCase, 'user'), 'your selected home');
  assert.equal(getFastTrackWorkspaceDisplayTitle(fastTrackCase, 'manager'), "Test User's fast-track case");
  assert.equal(getFastTrackWorkspaceDisplayTitle(fastTrackCase, 'admin'), "Test User's fast-track case");
  assert.equal(
    getFastTrackWorkspaceDisplayTitle({ ...fastTrackCase, propertyTitle: 'Canal View Apartment' }, 'manager'),
    'Canal View Apartment',
  );
});
