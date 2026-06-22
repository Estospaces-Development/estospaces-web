import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const readSource = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('manager workflow surfaces keep compact status labels and actions readable', () => {
  const appointments = readSource('src/pages/manager/appointments/page.tsx');
  const applicationCard = readSource('src/components/manager/applications/ApplicationCard.tsx');
  const contracts = readSource('src/pages/manager/contracts/page.tsx');
  const verificationQueue = readSource('src/components/verification/UserVerificationQueue.tsx');
  const managerVerification = readSource('src/pages/manager/verification/page.tsx');
  const analytics = readSource('src/pages/manager/analytics/page.tsx');

  assert.match(appointments, /bg-green-700 px-4 py-3 text-sm font-semibold text-white/);
  assert.match(applicationCard, /bg-emerald-50 text-emerald-700 dark:bg-emerald-900\/30 dark:text-emerald-300/);
  assert.match(contracts, /<span className="ml-1 text-white">/);
  assert.match(contracts, /<span className="ml-1 text-gray-700 dark:text-gray-200">/);
  assert.match(contracts, /text-green-700 dark:text-green-300/);
  assert.match(verificationQueue, /badgeClass: 'bg-blue-700 shadow-blue-700\/20'/);
  assert.match(managerVerification, /case 'verification_required': return 'bg-amber-700';/);
  assert.match(analytics, /text-green-700 text-xs font-bold bg-green-100/);
  assert.match(analytics, /text-xs text-orange-800 dark:text-orange-200/);
});

test('manager lead-intake navigation labels match their leads destination', () => {
  const applications = readSource('src/pages/manager/applications/page.tsx');
  const clients = readSource('src/pages/manager/clients/page.tsx');

  assert.doesNotMatch(applications, /navigate\('\/manager\/leads'\)[\s\S]{0,260}New Application/);
  assert.match(applications, /<Plus size=\{18\} \/> Open Lead Intake/);
  assert.doesNotMatch(clients, /navigate\('\/manager\/leads'\)[\s\S]{0,260}Add Client/);
  assert.match(clients, /<Plus className="w-4 h-4" \/> Add Lead/);
});

test('manager live response options button controls a visible menu', () => {
  const brokerResponseWidget = readSource('src/components/dashboard/BrokerResponseWidget.tsx');

  assert.match(brokerResponseWidget, /const \[liveResponseOptionsOpen, setLiveResponseOptionsOpen\] = useState\(false\);/);
  assert.match(brokerResponseWidget, /aria-expanded=\{liveResponseOptionsOpen\}/);
  assert.match(brokerResponseWidget, /aria-controls=\{LIVE_RESPONSE_OPTIONS_MENU_ID\}/);
  assert.match(brokerResponseWidget, /id=\{LIVE_RESPONSE_OPTIONS_MENU_ID\}/);
  assert.match(brokerResponseWidget, /role="menu"/);
  assert.equal((brokerResponseWidget.match(/role="menuitem"/g) || []).length, 3);
});
