import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';

const dashboardSource = readFileSync(
  resolve(process.cwd(), 'src/pages/manager/dashboard/page.tsx'),
  'utf8',
);

test('manager dashboard primary metrics are not blocked by bookings load', () => {
  assert.match(dashboardSource, /const bookingsTask = bookingsService\.getBookings/);
  assert.match(dashboardSource, /const \[analyticsRes, fastTrackRes, livePropertiesRes\] = await Promise\.allSettled\(\[/);

  const primaryLoadMatch = dashboardSource.match(
    /const \[analyticsRes, fastTrackRes, livePropertiesRes\] = await Promise\.allSettled\(\[([\s\S]*?)\]\);/,
  );
  assert.ok(primaryLoadMatch, 'primary dashboard load group should be explicit');

  const primaryLoadBlock = primaryLoadMatch[1];
  assert.match(primaryLoadBlock, /analyticsTask/);
  assert.match(primaryLoadBlock, /fastTrackTask/);
  assert.match(primaryLoadBlock, /livePropertiesTask/);
  assert.doesNotMatch(primaryLoadBlock, /bookingsTask/);
});
