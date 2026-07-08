import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import type { User } from '@/types';
import {
  ADMIN_USER_SEARCH_MAX_LENGTH,
  buildAdminLeadOptionLabel,
  buildAdminLeadReassignLabel,
  buildAdminUsersCsv,
  formatAdminLeadReassignmentLoadError,
  getAdminUsersGlobalSearchLabel,
  getAdminUsersGlobalSearchPlaceholder,
  getAdminUsersPageSubtitle,
  getAdminUsersPageTitle,
  getAdminAddUserPath,
  buildAdminUserActionLabel,
  getAdminUserEmptyStateBody,
  getAdminUserEmptyStateTitle,
  getAdminUsersRegistryTableScrollLabel,
  getAdminUserSortControlLabel,
  buildAdminUserStateDialogTitle,
  getAdminUserDisplayName,
  isAdminLeadReassignActionDisabled,
  isLeadClosedForReassignment,
  normalizeAdminUserSearch,
  normalizeAdminUserSearchInput,
  sortAdminUsers,
  validateAdminLeadReassignSelection,
  validateAdminUserStateReason,
} from './page';

const buildUser = (overrides: Partial<User>): User => ({
  id: 'user-1',
  email: 'user@example.com',
  role: 'user',
  is_active: true,
  created_at: '2026-04-20T10:00:00Z',
  first_name: '',
  last_name: '',
  full_name: '',
  ...overrides,
} as User);

test('admin user helpers normalize search and row-specific action labels', () => {
  const user = buildUser({
    email: 'ada@example.com',
    first_name: ' Ada ',
    last_name: ' Lovelace ',
  });

  assert.equal(normalizeAdminUserSearch('  ADA@EXAMPLE.COM  '), 'ada@example.com');
  assert.equal(getAdminUserDisplayName(user), 'Ada Lovelace');
  assert.equal(buildAdminUserActionLabel(user, false), 'Deactivate Ada Lovelace (ada@example.com)');
  assert.equal(buildAdminUserActionLabel(user, true), 'Deactivating Ada Lovelace (ada@example.com)');
});

test('admin user search rejects over-limit input and exposes empty-state recovery copy', () => {
  const longSearch = 'admin '.repeat(80);

  assert.equal(normalizeAdminUserSearchInput(longSearch).length, ADMIN_USER_SEARCH_MAX_LENGTH);
  assert.equal(getAdminUserEmptyStateTitle(), 'No users match your current filters');
  assert.match(getAdminUserEmptyStateBody(), /clearing the search/i);
});

test('admin user state changes require a trimmed reason before submit', () => {
  const user = buildUser({
    email: 'ada@example.com',
    first_name: ' Ada ',
    last_name: ' Lovelace ',
    is_active: true,
  });

  assert.equal(buildAdminUserStateDialogTitle(user), 'Deactivate Ada Lovelace account');
  assert.equal(validateAdminUserStateReason('   '), 'Reason is required before changing account access.');
  assert.equal(validateAdminUserStateReason(' Duplicate account clean-up '), null);
});

test('admin users sort visible result rows predictably', () => {
  const users = [
    buildUser({
      id: 'newer-inactive',
      email: 'zara@example.com',
      first_name: 'Zara',
      is_active: false,
      created_at: '2026-04-22T10:00:00Z',
    }),
    buildUser({
      id: 'older-active',
      email: 'alex@example.com',
      first_name: 'Alex',
      is_active: true,
      created_at: '2026-04-20T10:00:00Z',
    }),
  ];

  assert.deepEqual(sortAdminUsers(users, 'email_asc').map((user) => user.email), [
    'alex@example.com',
    'zara@example.com',
  ]);
  assert.deepEqual(sortAdminUsers(users, 'status').map((user) => user.id), [
    'older-active',
    'newer-inactive',
  ]);
  assert.deepEqual(sortAdminUsers(users, 'oldest').map((user) => user.id), [
    'older-active',
    'newer-inactive',
  ]);
});

test('admin users CSV export keeps visible rows safe', () => {
  const csv = buildAdminUsersCsv([
    buildUser({
      email: '@danger.example',
      first_name: '=Command',
      last_name: 'Tester, "Quoted"',
      role: 'manager',
      is_active: false,
    }),
  ]);

  assert.match(csv, /^"Name","Email","Role","Status","Joined"\n/);
  assert.match(csv, /"'=Command Tester, ""Quoted""","'@danger.example","manager","Deactivated"/);
  assert.doesNotMatch(csv, /=Command Tester, "Quoted",@danger\.example/);
});

test('admin users expose visible sort and global search control copy', () => {
  assert.equal(getAdminUserSortControlLabel(), 'Sort users');
  assert.equal(getAdminUsersGlobalSearchLabel(), 'Search users and lead reassignment leads');
  assert.equal(getAdminUsersGlobalSearchPlaceholder(), 'Search users and leads...');
});

test('admin users page title matches the admin navigation label', () => {
  assert.equal(getAdminUsersPageTitle(), 'User Management');
  assert.equal(getAdminUsersPageSubtitle(), 'Global Registry');
});

test('admin users registry table stays contained on mobile', async () => {
  const source = await readFile(new URL('./page.tsx', import.meta.url), 'utf8');

  assert.equal(getAdminUsersRegistryTableScrollLabel(), 'Scrollable user registry table');
  assert.match(source, /aria-label=\{getAdminUsersRegistryTableScrollLabel\(\)\}/);
  assert.match(source, /aria-label="Scrollable lead reassignment table"/);
  assert.match(source, /className="relative max-w-full overflow-x-auto overflow-y-hidden \[contain:paint\]"/);
  assert.match(source, /className="w-full min-w-\[980px\] text-left"/);
  assert.match(source, /className="min-w-0 bg-white dark:bg-gray-800 rounded-\[2rem\]/);
});

test('admin users page keeps reassignment refresh manual or event driven', async () => {
  const source = await readFile(new URL('./page.tsx', import.meta.url), 'utf8');

  assert.match(source, /useWorkspaceRefresh\(\{/);
  assert.doesNotMatch(source, /useDashboardWorkspaceRefresh/);
});

test('admin users global search also drives lead reassignment filtering', async () => {
  const source = await readFile(new URL('./page.tsx', import.meta.url), 'utf8');

  assert.match(source, /aria-label=\{getAdminUsersGlobalSearchLabel\(\)\}/);
  assert.match(source, /placeholder=\{getAdminUsersGlobalSearchPlaceholder\(\)\}/);
  assert.match(source, /const normalizedValue = normalizeAdminUserSearchInput\(value\);[\s\S]*setLeadPage\(1\);[\s\S]*setSearchQuery\(normalizedValue\);[\s\S]*setLeadSearchQuery\(normalizedValue\);/);
});

test('admin add user path opens the registration form while signed in', () => {
  assert.equal(getAdminAddUserPath(), '/register?switch=true');
});

test('admin lead reassignment helpers expose safe labels and closed-state guards', () => {
  const openLead = {
    id: 'lead-1',
    lead_number: 'LD-1',
    broker_id: 'broker-current',
    status: 'pending_broker_response',
    stage: 'matching',
    property: {
      title: 'A very long property title that still needs to stay bounded inside the admin reassignment surface',
      address_line_1: '1 Test Street',
      city: 'London',
    },
    user_id: 'user-1',
  } as any;

  const closedLead = {
    ...openLead,
    status: 'closed_won',
    stage: 'completed',
    outcome: 'completed',
    closed_at: '2026-04-20T10:00:00Z',
  } as any;

  assert.equal(buildAdminLeadOptionLabel(openLead), 'LD-1 - A very long property title that still needs to stay bounded inside the admin reassignment surface');
  assert.equal(buildAdminLeadReassignLabel(openLead, 'North Broker', false), 'Reassign LD-1 to North Broker');
  assert.equal(buildAdminLeadReassignLabel(openLead, 'North Broker', true), 'Reassigning LD-1 to North Broker');
  assert.equal(isLeadClosedForReassignment(openLead), false);
  assert.equal(isLeadClosedForReassignment(closedLead), true);
  assert.equal(validateAdminLeadReassignSelection(openLead, ''), 'Choose a broker before reassigning this lead.');
  assert.equal(validateAdminLeadReassignSelection(openLead, 'broker-current'), 'This lead is already assigned to that broker.');
  assert.equal(validateAdminLeadReassignSelection(closedLead, 'broker-new'), 'Closed leads cannot be reassigned.');
  assert.equal(validateAdminLeadReassignSelection(openLead, 'broker-new'), null);
  assert.equal(isAdminLeadReassignActionDisabled(openLead, '', 1, false), true);
  assert.equal(isAdminLeadReassignActionDisabled(openLead, 'broker-current', 1, false), true);
  assert.equal(isAdminLeadReassignActionDisabled(openLead, 'broker-new', 0, false), true);
  assert.equal(isAdminLeadReassignActionDisabled(openLead, 'broker-new', 1, true), true);
  assert.equal(isAdminLeadReassignActionDisabled(openLead, 'broker-new', 1, false), false);
});

test('admin lead reassignment load errors stay scoped to the reassignment queue', () => {
  const message = formatAdminLeadReassignmentLoadError('Internal server error');

  assert.match(message, /Lead reassignment data could not refresh for the current filters\./);
  assert.match(message, /Existing rows may be stale/);
  assert.doesNotMatch(message, /^Internal server error$/);
});
