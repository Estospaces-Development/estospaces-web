import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('user profile reports applications instead of manager-side leads', () => {
  const source = readSource('src/pages/user/dashboard/profile/page.tsx');
  assert.match(source, /const \{ allApplications \} = useApplications\(\)/);
  assert.match(source, /\{allApplications\.length\}/);
  assert.match(source, />Applications<\/div>/);
  assert.doesNotMatch(source, />Leads<\/div>/);
});

test('admin property registry reports the complete visible total instead of current page length', () => {
  const source = readSource('src/pages/admin/properties/page.tsx');
  assert.match(source, /hasRegistryFilters \? 'Matching' : 'Total Listed'/);
  assert.match(source, /setFilters\(serviceFilters\)/);
  assert.match(source, /\{visibleTotal\}/);
  assert.doesNotMatch(source, /Total Listed:[\s\S]{0,120}\{visibleRegistryProperties\.length\}/);
});

test('manager review history does not synthesize a system audit event', () => {
  const source = readSource('src/components/admin/ManagerReviewModal.tsx');
  assert.doesNotMatch(source, /Status imported from the approved manager profile/);
  assert.match(source, /return auditLog;/);
});

test('application card age is based on the persisted creation time', () => {
  const source = readSource('src/components/dashboard/applications/ApplicationCard.tsx');
  assert.match(source, /formatApplicationRelativeTime\(application\.createdAt \|\| application\.lastUpdated/);
  assert.doesNotMatch(source, /formatApplicationRelativeTime\(application\.lastUpdated \|\| application\.createdAt/);
  assert.match(source, /: 'Price unavailable'/);
  assert.doesNotMatch(source, /formatLaunchCurrencyForCountry\(application\.propertyPrice \|\| 0/);
});

test('legacy application hydration retains viewing snapshot context', () => {
  const source = readSource('src/contexts/ApplicationsContext.tsx');
  assert.match(source, /refreshedApplicationPropertyContextById\.get\(application\.property_id\)[\s\S]{0,100}\|\| propertyContextById\.get\(application\.property_id\)/);
});

test('application data stays idle on pages without an application consumer', () => {
  const source = readSource('src/contexts/ApplicationsContext.tsx');
  assert.match(source, /const \[consumerCount, setConsumerCount\] = useState\(0\);/);
  assert.match(source, /const registerConsumer = useCallback\(\(\) => \{[\s\S]*setConsumerCount\(\(count\) => count \+ 1\)/);
  assert.match(source, /if \(!user\) \{[\s\S]{0,160}setApplications\(\[\]\)/);
  assert.match(source, /if \(consumerCount === 0\) \{/);
  assert.match(source, /enabled: Boolean\(user\) && consumerCount > 0/);
});
