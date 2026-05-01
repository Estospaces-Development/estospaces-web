import test from 'node:test';
import assert from 'node:assert/strict';

import {
  defaultFastTrackWorkspacePreferences,
  moveFastTrackWorkspaceModule,
  normalizeFastTrackWorkspacePreferences,
  orderVisibleFastTrackWorkspaceModules,
} from './fastTrackWorkspacePreferences';

test('normalizeFastTrackWorkspacePreferences falls back to defaults', () => {
  const preferences = normalizeFastTrackWorkspacePreferences(null, 'manager');

  assert.equal(preferences.role, 'manager');
  assert.equal(preferences.layoutMode, 'balanced_compact');
  assert.equal(preferences.defaultActiveModule, 'core_files');
  assert.deepEqual(preferences.visibleModules, [
    'core_files',
    'case_chat',
    'activity',
    'preview',
    'connected_records',
  ]);
});

test('normalizeFastTrackWorkspacePreferences keeps active module visible', () => {
  const preferences = normalizeFastTrackWorkspacePreferences(
    {
      role: 'user',
      visibleModules: ['activity'],
      defaultActiveModule: 'preview',
    },
    'user',
  );

  assert.deepEqual(preferences.visibleModules, ['activity']);
  assert.equal(preferences.defaultActiveModule, 'activity');
});

test('orderVisibleFastTrackWorkspaceModules follows module order', () => {
  const preferences = normalizeFastTrackWorkspacePreferences(
    {
      role: 'admin',
      visibleModules: ['activity', 'core_files'],
      moduleOrder: ['connected_records', 'activity', 'core_files'],
    },
    'admin',
  );

  assert.deepEqual(orderVisibleFastTrackWorkspaceModules(preferences), [
    'activity',
    'core_files',
  ]);
});

test('normalizeFastTrackWorkspacePreferences backfills legacy module order', () => {
  const preferences = normalizeFastTrackWorkspacePreferences(
    {
      role: 'manager',
      visibleModules: ['core_files', 'case_chat'],
      moduleOrder: ['core_files'],
      defaultActiveModule: 'core_files',
    },
    'manager',
  );

  assert.deepEqual(preferences.moduleOrder, [
    'core_files',
    'case_chat',
    'activity',
    'preview',
    'connected_records',
  ]);
});

test('moveFastTrackWorkspaceModule reorders module positions safely', () => {
  const defaults = defaultFastTrackWorkspacePreferences('user');
  assert.deepEqual(
    moveFastTrackWorkspaceModule(defaults.moduleOrder, 'case_chat', 'up').slice(0, 2),
    ['case_chat', 'core_files'],
  );
  assert.deepEqual(
    moveFastTrackWorkspaceModule(defaults.moduleOrder, 'core_files', 'up'),
    defaults.moduleOrder,
  );
});
