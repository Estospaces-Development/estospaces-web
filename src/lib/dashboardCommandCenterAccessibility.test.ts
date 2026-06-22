import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('dashboard command-center surfaces keep discovery counters readable and filters named', () => {
  const propertyCard = readSource('src/components/dashboard/PropertyCard.tsx');
  const overseas = readSource('src/pages/user/dashboard/overseas/page.tsx');

  assert.match(propertyCard, /bg-blue-700 text-white/);
  assert.match(propertyCard, /aria-label=\{`Show previous image for \$\{displayTitle\}`\}/);
  assert.match(propertyCard, /aria-label=\{`Show next image for \$\{displayTitle\}`\}/);
  assert.match(overseas, /aria-label="Select destination country"/);
});

test('user dashboard broker request opt-in checkbox exposes an accessible name', () => {
  const brokerRequestWidget = readSource('src/components/dashboard/BrokerRequestWidget.tsx');

  assert.match(brokerRequestWidget, /aria-label=\{brokerCopy\.useDispatchTitle\}/);
});

test('manager header global search routes into the lead desk search state', () => {
  const header = readSource('src/components/layout/Header.tsx');
  const managerLeads = readSource('src/pages/manager/leads/page.tsx');

  assert.match(header, /const normalizedSearchQuery = searchQuery\.trim\(\)\.replace\(\/\\s\+\/g, ' '\);/);
  assert.match(header, /navigate\(`\/manager\/leads\?search=\$\{encodeURIComponent\(normalizedSearchQuery\)\}`\);/);
  assert.match(header, /React\.FormEvent \| React\.KeyboardEvent<HTMLInputElement>/);
  assert.match(header, /onKeyDown=\{\(e\) => \{\s*if \(e\.key === 'Enter'\) \{\s*handleSearch\(e\);\s*\}\s*\}\}/);
  assert.doesNotMatch(header, /Implement global search or redirect to search page/);
  assert.match(managerLeads, /import \{ useNavigate, useSearchParams \} from 'react-router-dom';/);
  assert.match(managerLeads, /const \[searchParams\] = useSearchParams\(\);/);
  assert.match(managerLeads, /const searchParamQuery = searchParams\.get\('search'\) \|\| '';/);
  assert.match(managerLeads, /const \[searchQuery, setSearchQuery\] = useState\(searchParamQuery\);/);
});
