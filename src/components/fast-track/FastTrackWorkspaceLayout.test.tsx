import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { FastTrackWorkspaceCustomizationDrawer } from './FastTrackWorkspaceLayout';
import {
  FastTrackCaseRail,
  FastTrackStageStepper,
  type FastTrackCaseRailItem,
} from './FastTrackWorkspaceLayout';
import {
  FAST_TRACK_WORKSPACE_MODULES,
  defaultFastTrackWorkspacePreferences,
} from '@/lib/fastTrackWorkspacePreferences';

test('fast-track customization drawer exposes named switches, radios, and status', () => {
  const preferences = defaultFastTrackWorkspacePreferences('user');
  const markup = renderToStaticMarkup(
    <FastTrackWorkspaceCustomizationDrawer
      role="user"
      open
      preferences={{
        ...preferences,
        secondaryDensity: 'compact',
        showMetricsStrip: false,
      }}
      orderedModules={FAST_TRACK_WORKSPACE_MODULES}
      onClose={() => {}}
      onReset={() => {}}
      onToggleMetrics={() => {}}
      onToggleCaseRailCollapsed={() => {}}
      onDensityChange={() => {}}
      onToggleModule={() => {}}
      onMoveModule={() => {}}
      onSetDefaultModule={() => {}}
    />,
  );

  assert.match(markup, /role="switch" aria-checked="false" aria-label="Metrics strip"/);
  assert.match(markup, /role="switch" aria-checked="true" aria-label="Start with journeys hidden"/);
  assert.match(markup, /role="radiogroup" aria-label="Secondary density"/);
  assert.match(markup, /role="radio" aria-checked="true" aria-label="Use compact secondary density"/);
  assert.match(markup, /role="radio" aria-checked="false" aria-label="Use comfortable secondary density"/);
  assert.match(markup, /role="status" aria-live="polite" aria-label="Workspace preferences status"/);
  assert.match(markup, /Metrics strip hidden/);
  assert.match(markup, /Journey list hidden/);
});

test('fast-track journey rail exposes visible focus and pagination controls', () => {
  const items: FastTrackCaseRailItem[] = Array.from({ length: 13 }, (_, index) => ({
    caseId: `case-${index + 1}`,
    title: `Journey ${index + 1}`,
    subtitle: 'Selected property',
    stageLabel: 'Documents',
    deadlineLabel: '20h left',
    statusLabel: 'Active',
    statusTone: 'border-orange-200 bg-orange-50 text-orange-700',
    selected: index === 0,
  }));

  const markup = renderToStaticMarkup(
    <FastTrackCaseRail
      role="user"
      query=""
      filter="all"
      filters={[
        { value: 'all', label: 'All' },
        { value: 'active', label: 'In progress' },
      ]}
      currentPage={1}
      totalPages={2}
      totalItems={13}
      pageSize={12}
      paginatedCount={12}
      items={items.slice(0, 12)}
      onQueryChange={() => {}}
      onFilterChange={() => {}}
      onSelectCase={() => {}}
      onPageChange={() => {}}
    />,
  );

  assert.match(markup, /data-fast-track-case-card="case-1"/);
  assert.match(markup, /focus-visible:ring-2/);
  assert.match(markup, /First page/);
  assert.match(markup, /Last page/);
});

test('fast-track journey rail hides final empty copy while cases are loading', () => {
  const markup = renderToStaticMarkup(
    <FastTrackCaseRail
      role="user"
      query=""
      filter="all"
      filters={[{ value: 'all', label: 'All' }]}
      currentPage={1}
      totalPages={1}
      totalItems={0}
      pageSize={12}
      paginatedCount={0}
      items={[]}
      isLoading
      onQueryChange={() => {}}
      onFilterChange={() => {}}
      onSelectCase={() => {}}
      onPageChange={() => {}}
    />,
  );

  assert.match(markup, /Loading your journeys/);
  assert.doesNotMatch(markup, /0 matching journeys/);
  assert.doesNotMatch(markup, /No journeys match this filter/);
});

test('fast-track stage controls expose visible focus for keyboard users', () => {
  const markup = renderToStaticMarkup(
    <FastTrackStageStepper
      items={[
        { key: 'selected', label: 'Selected', icon: <span />, active: true, complete: true },
        { key: 'documents', label: 'Documents', icon: <span />, active: false, complete: false, current: true },
      ]}
      onSelect={() => {}}
    />,
  );

  assert.match(markup, /data-fast-track-stage-tab="selected"/);
  assert.match(markup, /focus-visible:ring-2/);
});
