import assert from 'node:assert/strict';
import test from 'node:test';

import { getFastTrackConnectedRecordPath } from './fastTrackConnectedRecords';

const CASE_ID = 'case-1';

test('manager connected records link to manager pages', () => {
    assert.equal(getFastTrackConnectedRecordPath('manager', 'application', 'app-1', CASE_ID), '/manager/applications?application=app-1');
    assert.equal(getFastTrackConnectedRecordPath('manager', 'property', 'prop-1', CASE_ID), '/manager/dashboard/properties/prop-1');
    assert.equal(getFastTrackConnectedRecordPath('manager', 'lead', 'lead-1', CASE_ID), '/manager/leads?search=lead-1');
    assert.equal(getFastTrackConnectedRecordPath('manager', 'viewing', 'view-1', CASE_ID), '/manager/appointments?case=case-1');
    assert.equal(getFastTrackConnectedRecordPath('manager', 'contract', 'con-1', CASE_ID), '/manager/contracts?contract=con-1');
    assert.equal(getFastTrackConnectedRecordPath('manager', 'payment', 'pay-1', CASE_ID), null);
});

test('user connected records link to user pages and keep leads as text', () => {
    assert.equal(getFastTrackConnectedRecordPath('user', 'application', 'app-1', CASE_ID), '/user/dashboard/applications?application=app-1');
    assert.equal(getFastTrackConnectedRecordPath('user', 'property', 'prop-1', CASE_ID), '/user/properties/prop-1');
    assert.equal(getFastTrackConnectedRecordPath('user', 'viewing', 'view-1', CASE_ID), '/user/dashboard/viewings?case=case-1');
    assert.equal(getFastTrackConnectedRecordPath('user', 'contract', 'con-1', CASE_ID), '/user/dashboard/contracts?contract=con-1');
    assert.equal(getFastTrackConnectedRecordPath('user', 'lead', 'lead-1', CASE_ID), null);
});

test('admin only links properties', () => {
    assert.equal(getFastTrackConnectedRecordPath('admin', 'property', 'prop-1', CASE_ID), '/admin/properties/prop-1');
    assert.equal(getFastTrackConnectedRecordPath('admin', 'application', 'app-1', CASE_ID), null);
});

test('record ids are URL-encoded', () => {
    assert.equal(getFastTrackConnectedRecordPath('manager', 'property', 'a/b', CASE_ID), '/manager/dashboard/properties/a%2Fb');
    assert.equal(getFastTrackConnectedRecordPath('manager', 'lead', 'a&b', CASE_ID), '/manager/leads?search=a%26b');
});
