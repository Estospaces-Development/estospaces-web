import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('applications timeline filters QA records, deduplicates requests, and merges selected homes', () => {
  const source = read('../components/dashboard/ApplicationTimelineWidget.tsx');
  assert.match(source, /dedupeBrokerRequestsForTimeline/);
  assert.match(source, /isUserVisibleBrokerRequest/);
  assert.match(source, /selected-home-/);
  assert.match(source, /id: `selected-home-\$\{request\.property\.id\}`,[\s\S]*?source: 'broker_request'/);
  assert.doesNotMatch(source, /Property agent request for \$\{request\.location\}/);
});

test('broker shortlist card uses human timing and mobile-safe no-wrap layout', () => {
  const source = read('../components/dashboard/BrokerRequestWidget.tsx');
  assert.match(source, /getBrokerShortlistTimingCopy/);
  assert.match(source, /getBrokerShortlistDueValue/);
  assert.match(source, /sm:shrink-0 sm:whitespace-nowrap/);
});

test('manager search offers destinations instead of forcing the leads route', () => {
  const source = read('../components/layout/Header.tsx');
  const fastTrack = read('../components/fast-track/FastTrackWorkspace.tsx');
  const properties = read('../pages/manager/dashboard/properties/page.tsx');
  assert.match(source, /getManagerSearchDestinations/);
  assert.match(source, /Choose where to search/);
  assert.doesNotMatch(source, /navigate\(`\/manager\/leads\?search=/);
  assert.match(fastTrack, /setQuery\(searchParamQuery\)/);
  assert.match(fastTrack, /\[searchParamQuery\]/);
  assert.match(properties, /nextSearchParams\.delete\('search'\)/);
});

test('support cards, country selects, and preference switches retain mobile-safe shared styling', () => {
  const support = read('../components/support/SupportTicketList.tsx');
  const settings = read('../pages/user/settings/page.tsx');
  const register = read('../pages/auth/register/page.tsx');
  const address = read('../components/ui/AddressSection.tsx');

  assert.match(support, /w-full min-w-0 overflow-hidden/);
  assert.equal((settings.match(/<Toggle/g) || []).length, 3);
  assert.doesNotMatch(settings, /inline-flex h-6 w-11/);
  assert.match(register, /w-full min-w-0 truncate/);
  assert.match(address, /w-full min-w-0 truncate/);
});
