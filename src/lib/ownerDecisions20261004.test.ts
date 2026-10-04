import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

test('#520: the agent request card defers to a different live 24-hour journey', () => {
  const widget = read('src/components/dashboard/BrokerRequestWidget.tsx');
  const dashboard = read('src/pages/user/dashboard/DashboardClient.tsx');
  assert.match(dashboard, /<BrokerRequestWidget[\s\S]*?activeJourney=\{activeJourney\}/);
  assert.match(widget, /activeJourney && activeJourney\.brokerRequestId !== activeRequest\?\.id/);
  assert.match(widget, /On hold while your 24-hour journey for \$\{journeyElsewhereTitle\} is active/);
  assert.equal((widget.match(/: waitingForHomesLabel\}/g) || []).length, 2, 'both waiting labels use the journey-aware copy');
});

test('#515/#516: mobile dashboard shows the same next step and search as desktop', () => {
  const dashboard = read('src/pages/user/dashboard/DashboardClient.tsx');
  assert.match(dashboard, /data-mobile-primary-task[\s\S]*?nextStepSummary\.next[\s\S]*?data-dashboard-search/);
  assert.match(dashboard, /data-dashboard-search>\s*<div className="min-w-0 max-w-full">\s*<SearchBar/);
});
