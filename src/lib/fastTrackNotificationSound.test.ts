import assert from 'node:assert/strict';
import test from 'node:test';

import {
    FAST_TRACK_ALERT_TONES,
    shouldPlayFastTrackAlertSound,
} from './fastTrackNotificationSound';

test('Fast Track alerts include the property handoff and document workflow', () => {
    assert.equal(shouldPlayFastTrackAlertSound('property_selected'), true);
    assert.equal(shouldPlayFastTrackAlertSound('fast_track_started'), true);
    assert.equal(shouldPlayFastTrackAlertSound('case_file_document_uploaded'), true);
    assert.equal(shouldPlayFastTrackAlertSound('case_file_document_reupload_requested'), true);
});

test('unrelated notifications do not trigger the Fast Track alert', () => {
    assert.equal(shouldPlayFastTrackAlertSound('message_received'), false);
    assert.equal(shouldPlayFastTrackAlertSound('payment_received'), false);
    assert.equal(shouldPlayFastTrackAlertSound('system'), false);
});

test('Fast Track alert uses a distinct rising three-tone pattern', () => {
    assert.equal(FAST_TRACK_ALERT_TONES.length, 3);
    assert.ok(FAST_TRACK_ALERT_TONES[0].frequencyHz < FAST_TRACK_ALERT_TONES[1].frequencyHz);
    assert.ok(FAST_TRACK_ALERT_TONES[1].frequencyHz < FAST_TRACK_ALERT_TONES[2].frequencyHz);
    assert.ok(FAST_TRACK_ALERT_TONES.every((tone) => tone.gain > 0 && tone.gain <= 0.3));
});
