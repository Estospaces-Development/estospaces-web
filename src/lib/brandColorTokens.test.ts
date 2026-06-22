import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const globalsCss = readFileSync(resolve(process.cwd(), 'src/globals.css'), 'utf8');
const brokerResponseWidget = readFileSync(resolve(process.cwd(), 'src/components/dashboard/BrokerResponseWidget.tsx'), 'utf8');
const applicationTimelineWidget = readFileSync(resolve(process.cwd(), 'src/components/dashboard/ApplicationTimelineWidget.tsx'), 'utf8');
const nearbyAgenciesList = readFileSync(resolve(process.cwd(), 'src/components/dashboard/NearbyAgenciesList.tsx'), 'utf8');

const extractRule = (selector: string) => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = globalsCss.match(new RegExp(`${escapedSelector}\\s*\\{([^}]+)\\}`, 'm'));
  assert.ok(match, `${selector} rule should exist`);
  return match[1];
};

test('primary button color tokens use contrast-safe Estospaces orange', () => {
  assert.match(globalsCss, /--color-primary:\s*#c2410c;/i);
  assert.match(globalsCss, /--color-primary-light:\s*#ff8c61;/i);
  assert.match(globalsCss, /--color-primary-dark:\s*#9a3412;/i);

  assert.match(extractRule('.bg-primary'), /background-color:\s*#c2410c;/i);
  assert.match(extractRule('.hover\\:bg-primary-dark:hover'), /background-color:\s*#9a3412;/i);
  assert.match(extractRule('.bg-orange-500'), /background-color:\s*#c2410c;/i);
  assert.match(extractRule('.hover\\:bg-orange-600:hover'), /background-color:\s*#9a3412;/i);
  assert.match(extractRule('.bg-orange-600'), /background-color:\s*#c2410c;/i);
  assert.match(extractRule('.hover\\:bg-orange-700:hover'), /background-color:\s*#9a3412;/i);
  assert.match(extractRule('.bg-orange-700'), /background-color:\s*#c2410c;/i);
  assert.match(extractRule('.hover\\:bg-orange-800:hover'), /background-color:\s*#9a3412;/i);
  assert.match(extractRule('.active\\:bg-orange-700:active'), /background-color:\s*#9a3412;/i);
  assert.match(globalsCss, /\.text-orange-500,\s*\.text-orange-600\s*\{[^}]*color:\s*#c2410c;/i);
  assert.match(extractRule('.brand-orange-action'), /background-color:\s*#c2410c;/i);
  assert.match(extractRule('.brand-orange-action:hover'), /background-color:\s*#9a3412;/i);

  assert.doesNotMatch(extractRule('.btn-primary'), /#ff6b35/i);
  assert.doesNotMatch(extractRule('.btn-primary'), /#e55a2b/i);
});

test('manager dashboard workflow CTAs are pinned to the brand orange palette', () => {
  assert.match(brokerResponseWidget, /brand-orange-action/);
  assert.doesNotMatch(
    brokerResponseWidget,
    /Open property workflow[\s\S]{0,500}bg-orange-500|bg-orange-500[\s\S]{0,500}Open property workflow/,
  );
});

test('user dashboard journey badges use contrast-safe small-text colors', () => {
  assert.match(applicationTimelineWidget, /item\.type === 'buy' \? 'bg-blue-700'/);
  assert.match(applicationTimelineWidget, /item\.type === 'rent' \? 'bg-purple-700'/);
  assert.match(applicationTimelineWidget, /: 'bg-green-700'\} text-white/);
  assert.doesNotMatch(
    applicationTimelineWidget,
    /absolute -bottom-1 -left-1[\s\S]{0,180}bg-(blue|purple|green)-500[\s\S]{0,80}text-white/,
  );
});

test('user dashboard nearby agent request eyebrow avoids low-contrast blue text', () => {
  assert.match(nearbyAgenciesList, /Agent request/);
  assert.match(nearbyAgenciesList, /text-blue-700 dark:text-blue-200/);
  assert.doesNotMatch(
    nearbyAgenciesList,
    /Agent request[\s\S]{0,140}text-blue-500|text-blue-500[\s\S]{0,140}Agent request/,
  );
});
