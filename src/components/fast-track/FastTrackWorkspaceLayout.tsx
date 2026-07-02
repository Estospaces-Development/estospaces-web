'use client';

import React from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  ListFilter,
  Search,
  Settings2,
} from 'lucide-react';

import PaginationBar from '@/components/ui/PaginationBar';
import { createDuplicateSafeKeyResolver } from '@/lib/reactListKeys';
import type {
  FastTrackWorkspaceModule,
  FastTrackWorkspacePreferences,
  FastTrackWorkspaceRole,
} from '@/lib/fastTrackWorkspacePreferences';
import { getFastTrackWorkspaceModuleLabel } from '@/lib/fastTrackWorkspacePreferences';
import { getJourneyChromeCopy } from '@/lib/userJourneyCopy';
import { cn } from '@/lib/utils';

type FilterMode = 'all' | 'active' | 'completed' | 'cancelled';

function activateOnEnterOrSpace(
  event: React.KeyboardEvent<HTMLButtonElement>,
  action: () => void,
) {
  if (event.key !== 'Enter' && event.key !== ' ') {
    return;
  }

  event.preventDefault();
  action();
}

const fastTrackFocusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-950';

export interface FastTrackWorkspaceStat {
  label: string;
  value: number;
}

export interface FastTrackCaseRailItem {
  caseId: string;
  title: string;
  subtitle: string;
  stageLabel: string;
  deadlineLabel: string;
  statusLabel: string;
  statusTone: string;
  selected: boolean;
}

export interface FastTrackStepperItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  complete: boolean;
  current?: boolean;
}

interface FastTrackWorkspaceHeaderProps {
  role: FastTrackWorkspaceRole;
  railCollapsed: boolean;
  showMetricsStrip: boolean;
  stats: FastTrackWorkspaceStat[];
  onBack: () => void;
  onToggleRail: () => void;
  onOpenCustomize: () => void;
}

export function FastTrackWorkspaceHeader({
  role,
  railCollapsed,
  showMetricsStrip,
  stats,
  onBack,
  onToggleRail,
  onOpenCustomize,
}: FastTrackWorkspaceHeaderProps) {
  const copy = getJourneyChromeCopy(role);

  return (
    <div className="flex flex-col gap-3" data-fast-track-header>
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex flex-wrap items-start gap-2.5">
          <button
            type="button"
            onClick={onBack}
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-orange-800 dark:hover:bg-orange-950/20 dark:hover:text-orange-300',
              fastTrackFocusRing,
            )}
            aria-label="Back to dashboard"
            title="Back to dashboard"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#FF6B35_0%,#E55A2B_100%)] text-white shadow-lg shadow-orange-500/20">
            <LayoutGrid size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[26px] font-bold tracking-[-0.03em] text-gray-900 dark:text-white">
                {copy.headerTitle}
              </h1>
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                {role}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-[13px] text-gray-600 dark:text-gray-300">
              {copy.headerSubtitle}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onToggleRail}
            data-fast-track-toggle-rail
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-orange-800 dark:hover:bg-orange-950/20 dark:hover:text-orange-300',
              fastTrackFocusRing,
            )}
          >
            {railCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {railCollapsed ? copy.showRailLabel : copy.hideRailLabel}
          </button>
          <button
            type="button"
            onClick={onOpenCustomize}
            data-fast-track-customize-open
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-orange-800 dark:hover:bg-orange-950/20 dark:hover:text-orange-300',
              fastTrackFocusRing,
            )}
          >
            <Settings2 size={16} />
            {copy.pageOptionsLabel}
          </button>
        </div>
      </div>

      {showMetricsStrip ? (
        <div className="flex flex-wrap gap-2.5" data-fast-track-metrics-strip>
          {stats.map((item) => (
            <div
              key={item.label}
              className="inline-flex items-center gap-3 rounded-full border border-gray-100 bg-white px-4 py-2.5 shadow-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-300">
                {item.label}
              </p>
              <p className="text-lg font-bold tracking-[-0.03em] text-gray-900 dark:text-white">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

interface FastTrackCaseRailProps {
  role: FastTrackWorkspaceRole;
  query: string;
  filter: FilterMode;
  filters: Array<{ value: FilterMode; label: string }>;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  paginatedCount: number;
  items: FastTrackCaseRailItem[];
  isLoading?: boolean;
  onQueryChange: (value: string) => void;
  onFilterChange: (value: FilterMode) => void;
  onSelectCase: (caseId: string) => void;
  onPageChange: (page: number) => void;
  className?: string;
}

export function FastTrackCaseRail({
  role,
  query,
  filter,
  filters,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  paginatedCount,
  items,
  isLoading = false,
  onQueryChange,
  onFilterChange,
  onSelectCase,
  onPageChange,
  className,
}: FastTrackCaseRailProps) {
  const copy = getJourneyChromeCopy(role);
  const railItemKeyFor = createDuplicateSafeKeyResolver('fast-track-rail-case');
  const railSummary = isLoading
    ? role === 'user'
      ? 'Loading your journeys'
      : 'Loading fast-track cases'
    : `${totalItems} matching ${totalItems === 1 ? copy.caseSingular : copy.casePlural}`;
  const railPaginationLabel = isLoading ? 'Loading' : `${currentPage}/${totalPages}`;
  const emptyRailCopy = isLoading
    ? role === 'user'
      ? 'Loading your journeys...'
      : 'Loading fast-track cases...'
    : copy.emptyCaseList;

  return (
    <aside
      className={cn(
        'space-y-3 rounded-[26px] border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-950',
        className,
      )}
      data-fast-track-case-rail
      aria-label={role === 'user' ? 'Journey list' : 'Fast-track case list'}
    >
      <div className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-300">
              {copy.caseRailTitle}
            </p>
            <p className="mt-1 text-xs font-semibold text-gray-900 dark:text-white">
              {railSummary}
            </p>
          </div>
          <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            {railPaginationLabel}
          </span>
        </div>

        <div className="relative">
          <Search
            size={18}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={copy.searchPlaceholder}
            className={cn(
              'h-10 w-full rounded-2xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-950 caret-gray-900 outline-none transition-colors placeholder:text-gray-500 focus:border-orange-400 focus:bg-white dark:border-gray-700 dark:bg-gray-900/60 dark:text-white dark:caret-white dark:placeholder:text-gray-500',
              fastTrackFocusRing,
            )}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onFilterChange(item.value)}
              className={cn(
                'inline-flex h-8 items-center rounded-full px-3 text-[11px] font-semibold transition-colors',
                fastTrackFocusRing,
                filter === item.value
                  ? 'bg-orange-700 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {items.length === 0 ? (
          <div
            role={isLoading ? 'status' : undefined}
            aria-live={isLoading ? 'polite' : undefined}
            className="rounded-[28px] border border-dashed border-gray-300 bg-gray-50 px-5 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400"
          >
            {emptyRailCopy}
          </div>
        ) : (
          items.map((item, itemIndex) => (
            <button
              key={railItemKeyFor(item.caseId, itemIndex)}
              type="button"
              data-fast-track-case-card={item.caseId}
              onClick={() => onSelectCase(item.caseId)}
              className={cn(
                'w-full rounded-[20px] border px-3 py-3 text-left transition-colors',
                fastTrackFocusRing,
                item.selected
                  ? 'border-orange-300 bg-orange-50 shadow-[0_12px_28px_-16px_rgba(234,88,12,0.35)] dark:border-orange-800 dark:bg-orange-950/20'
                  : 'border-gray-100 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-gray-900 dark:text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-gray-500 dark:text-gray-400">
                    {item.subtitle}
                  </p>
                </div>
                <span className={cn('rounded-full border px-2 py-1 text-[9px] font-semibold', item.statusTone)}>
                  {item.statusLabel}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-[10px] text-gray-600 dark:text-gray-300">
                <span>{item.stageLabel}</span>
                <span>{item.deadlineLabel}</span>
              </div>
            </button>
          ))
        )}
      </div>

      {totalItems > 0 ? (
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          totalItems={totalItems}
          pageSize={pageSize}
          currentItemCount={paginatedCount}
          itemLabel={totalItems === 1 ? copy.caseSingular : copy.casePlural}
          stacked
          showWhenSinglePage
        />
      ) : null}
    </aside>
  );
}

interface FastTrackCaseMastheadProps {
  role: FastTrackWorkspaceRole;
  title: string;
  subtitle: string;
  statusLabel: string;
  statusTone: string;
  deadlineLabel: string;
  currentStage: string;
  focus: string;
  statusSummary: string;
  onOpenCustomize: () => void;
}

export function FastTrackCaseMasthead({
  role,
  title,
  subtitle,
  statusLabel,
  statusTone,
  deadlineLabel,
  currentStage,
  focus,
  statusSummary,
  onOpenCustomize,
}: FastTrackCaseMastheadProps) {
  const copy = getJourneyChromeCopy(role);

  return (
    <section className="overflow-hidden rounded-[30px] border border-orange-100 bg-[radial-gradient(circle_at_top_left,_rgba(255,243,232,0.95),_rgba(255,255,255,1)_55%)] p-4 shadow-[0_18px_36px_-28px_rgba(234,88,12,0.28)] dark:border-orange-900/30 dark:bg-[radial-gradient(circle_at_top_left,_rgba(124,45,18,0.28),_rgba(3,7,18,1)_58%)]" data-fast-track-masthead>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="min-w-0 max-w-full break-words text-[24px] font-bold tracking-[-0.03em] text-gray-900 dark:text-white">
                {title}
              </h2>
              <span className={cn('max-w-full shrink-0 rounded-full border px-3 py-1 text-[11px] font-semibold', statusTone)}>
                {statusLabel}
              </span>
            </div>
            <p className="mt-1 max-w-full break-words text-sm text-gray-600 dark:text-gray-300">{subtitle}</p>
            <p className="mt-3 max-w-2xl break-words text-[13px] leading-6 text-gray-700 dark:text-gray-200">
              {statusSummary}
            </p>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onOpenCustomize}
              data-fast-track-customize-open-inline
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-3.5 text-sm font-semibold text-gray-700 backdrop-blur transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:border-orange-800 dark:hover:bg-orange-950/20 dark:hover:text-orange-300',
                fastTrackFocusRing,
              )}
            >
              <ListFilter size={15} />
              {copy.mastheadLayoutLabel}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <MastheadInfoCard label={copy.mastheadDeadlineLabel} value={deadlineLabel} />
          <MastheadInfoCard label={copy.mastheadStageLabel} value={currentStage} />
          <MastheadInfoCard label={copy.mastheadNextLabel} value={focus} />
        </div>
      </div>
    </section>
  );
}

function MastheadInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="flex min-w-0 max-w-full flex-wrap items-center gap-2.5 rounded-2xl border border-white/70 bg-white/85 px-3.5 py-2 backdrop-blur dark:border-white/10 dark:bg-white/5"
      data-fast-track-masthead-info-card={label}
    >
      <p className="min-w-0 max-w-full break-words text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-300">
        {label}
      </p>
      <p className="min-w-0 max-w-full break-words text-sm font-semibold tracking-[-0.02em] text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

interface FastTrackStageStepperProps {
  items: FastTrackStepperItem[];
  onSelect?: (stage: string) => void;
}

export function FastTrackStageStepper({ items, onSelect }: FastTrackStageStepperProps) {
  return (
    <section className="sticky top-20 z-20 rounded-[24px] border border-gray-100 bg-white/92 px-3 py-3 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/92" data-fast-track-stepper>
      <div
        className="flex gap-1.5 overflow-x-auto pb-1"
        tabIndex={0}
        aria-label="Fast-track stage progress"
      >
        {items.map((item, index) => (
          <React.Fragment key={item.key}>
            <button
              type="button"
              data-fast-track-stage-tab={item.key}
              onClick={() => onSelect?.(item.key)}
              aria-pressed={item.active}
              title={item.current && !item.active ? 'Current workflow stage' : undefined}
              className={cn(
                'inline-flex min-w-[96px] items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-colors',
                fastTrackFocusRing,
                onSelect ? 'cursor-pointer hover:border-orange-200 hover:bg-orange-50/70' : 'cursor-default',
                item.active
                  ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-300'
                  : item.complete
                    ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300'
                    : item.current
                      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300'
                    : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="min-w-0 break-words text-xs font-semibold">{item.label}</span>
            </button>
            {index < items.length - 1 ? (
              <div
                className={cn(
                  'mt-4 hidden h-px min-w-4 flex-1 sm:block',
                  item.complete ? 'bg-green-300 dark:bg-green-700' : 'bg-gray-200 dark:bg-gray-700',
                )}
              />
            ) : null}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
}

interface FastTrackUtilityDockProps {
  role: FastTrackWorkspaceRole;
  density: FastTrackWorkspacePreferences['secondaryDensity'];
  modules: FastTrackWorkspaceModule[];
  activeModule: FastTrackWorkspaceModule;
  onActiveModuleChange: (module: FastTrackWorkspaceModule) => void;
  renderModule: (module: FastTrackWorkspaceModule) => React.ReactNode;
}

export function FastTrackUtilityDock({
  role,
  density,
  modules,
  activeModule,
  onActiveModuleChange,
  renderModule,
}: FastTrackUtilityDockProps) {
  if (modules.length === 0) {
    return null;
  }

  const copy = getJourneyChromeCopy(role);

  return (
    <section className="rounded-[28px] border border-gray-100 bg-white p-3.5 shadow-sm dark:border-gray-800 dark:bg-gray-950" data-fast-track-utility-dock>
      <div className="space-y-3.5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-300">
            {copy.utilityDockTitle}
          </p>
          <p className="mt-1 text-[13px] text-gray-600 dark:text-gray-300">
            {copy.utilityDockDescription}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {modules.map((module) => (
            <button
              key={module}
              type="button"
              onClick={() => onActiveModuleChange(module)}
              data-fast-track-utility-tab={module}
              className={cn(
                'inline-flex h-8 items-center rounded-full px-3 text-[11px] font-semibold transition-colors',
                fastTrackFocusRing,
                activeModule === module
                  ? 'bg-orange-700 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
              )}
            >
              {getFastTrackWorkspaceModuleLabel(module, role)}
            </button>
          ))}
        </div>

        <div
          className={cn(
            'rounded-[22px] border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-900/40',
            density === 'comfortable' ? 'min-h-[320px]' : 'min-h-[248px]',
          )}
          data-fast-track-utility-panel={activeModule}
        >
          {renderModule(activeModule)}
        </div>
      </div>
    </section>
  );
}

interface FastTrackWorkspaceCustomizationDrawerProps {
  role: FastTrackWorkspaceRole;
  open: boolean;
  preferences: FastTrackWorkspacePreferences;
  orderedModules: FastTrackWorkspaceModule[];
  onClose: () => void;
  onReset: () => void;
  onToggleMetrics: () => void;
  onToggleCaseRailCollapsed: () => void;
  onDensityChange: (density: FastTrackWorkspacePreferences['secondaryDensity']) => void;
  onToggleModule: (module: FastTrackWorkspaceModule) => void;
  onMoveModule: (module: FastTrackWorkspaceModule, direction: 'up' | 'down') => void;
  onSetDefaultModule: (module: FastTrackWorkspaceModule) => void;
}

export function FastTrackWorkspaceCustomizationDrawer({
  role,
  open,
  preferences,
  orderedModules,
  onClose,
  onReset,
  onToggleMetrics,
  onToggleCaseRailCollapsed,
  onDensityChange,
  onToggleModule,
  onMoveModule,
  onSetDefaultModule,
}: FastTrackWorkspaceCustomizationDrawerProps) {
  if (!open) {
    return null;
  }

  const copy = getJourneyChromeCopy(role);
  const caseRailTitle = role === 'user' ? 'Start with journeys hidden' : 'Start with case rail collapsed';
  const statusMessage = [
    `Metrics strip ${preferences.showMetricsStrip ? 'visible' : 'hidden'}`,
    role === 'user'
      ? `Journey list ${preferences.caseRailCollapsed ? 'hidden' : 'visible'}`
      : `Case rail ${preferences.caseRailCollapsed ? 'collapsed' : 'visible'}`,
    `Secondary density ${preferences.secondaryDensity}`,
  ].join('. ');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-sm" data-fast-track-customization-drawer>
      <button
        type="button"
        onClick={onClose}
        className="flex-1 cursor-default"
        aria-label="Close workspace customization drawer"
      />
      <aside className="h-full w-full max-w-md overflow-y-auto border-l border-gray-200 bg-white px-5 py-6 shadow-2xl dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-300">
              {copy.drawerEyebrow}
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-gray-900 dark:text-white">
              {copy.drawerTitle}
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              {copy.drawerDescription}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close workspace customization drawer"
            className={cn(
              'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-orange-800 dark:hover:bg-orange-950/20 dark:hover:text-orange-300',
              fastTrackFocusRing,
            )}
          >
            <ChevronRight className="rotate-180" size={16} />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <p
            role="status"
            aria-live="polite"
            aria-label="Workspace preferences status"
            className="sr-only"
            data-fast-track-preferences-status
          >
            {statusMessage}
          </p>

          <CustomizationToggleRow
            testId="metrics-strip"
            title="Metrics strip"
            description={copy.metricsDescription}
            checked={preferences.showMetricsStrip}
            onChange={onToggleMetrics}
          />
          <CustomizationToggleRow
            testId="case-rail-collapsed"
            title={caseRailTitle}
            description={copy.caseRailDescription}
            checked={preferences.caseRailCollapsed}
            onChange={onToggleCaseRailCollapsed}
          />

          <section className="rounded-[28px] border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Secondary density</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Balance between more breathing room and more information on screen.
            </p>
            <div
              className="mt-4 flex gap-2"
              role="radiogroup"
              aria-label="Secondary density"
            >
              {(['compact', 'comfortable'] as const).map((density) => (
                <button
                  key={density}
                  type="button"
                  role="radio"
                  aria-checked={preferences.secondaryDensity === density}
                  aria-label={`Use ${density} secondary density`}
                  onClick={() => onDensityChange(density)}
                  onKeyDown={(event) => activateOnEnterOrSpace(event, () => onDensityChange(density))}
                  data-fast-track-density={density}
                  className={cn(
                    'inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors',
                    fastTrackFocusRing,
                    preferences.secondaryDensity === density
                      ? 'bg-orange-700 text-white'
                      : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
                  )}
                >
                  {density === 'compact' ? 'Compact' : 'Comfortable'}
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {role === 'user' ? 'Helpful tools' : 'Utility modules'}
            </p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {role === 'user'
                ? 'Hide or reorder the extra help panels. Your main journey cannot be removed here.'
                : 'Hide or reorder the supporting dock modules. Workflow panels cannot be removed here.'}
            </p>
            <div className="mt-4 space-y-3">
              {orderedModules.map((module, index) => {
                const visible = preferences.visibleModules.includes(module);
                const moduleLabel = getFastTrackWorkspaceModuleLabel(module, role);
                return (
                  <div
                    key={module}
                    data-fast-track-module-row={module}
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {moduleLabel}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {preferences.defaultActiveModule === module
                            ? copy.moduleDefaultDescription
                            : copy.moduleAvailableDescription}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={visible}
                        aria-label={`${moduleLabel} module`}
                        onClick={() => onToggleModule(module)}
                        data-fast-track-module-toggle={module}
                        className={cn(
                          'inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold transition-colors',
                          fastTrackFocusRing,
                          visible
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300'
                            : 'border border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
                        )}
                      >
                        {visible ? copy.moduleVisibleLabel : copy.moduleHiddenLabel}
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        aria-label={`Open ${moduleLabel} first`}
                        onClick={() => onSetDefaultModule(module)}
                        data-fast-track-module-default={module}
                        disabled={!visible}
                        className={cn(
                          'inline-flex h-8 items-center rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
                          fastTrackFocusRing,
                        )}
                      >
                        {copy.makeDefaultLabel}
                      </button>
                      {role !== 'user' ? (
                        <>
                          <button
                            type="button"
                            aria-label={`Move ${moduleLabel} up`}
                            onClick={() => onMoveModule(module, 'up')}
                            data-fast-track-module-up={module}
                            disabled={index === 0}
                            className={cn(
                              'inline-flex h-8 items-center rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
                              fastTrackFocusRing,
                            )}
                          >
                            Move up
                          </button>
                          <button
                            type="button"
                            aria-label={`Move ${moduleLabel} down`}
                            onClick={() => onMoveModule(module, 'down')}
                            data-fast-track-module-down={module}
                            disabled={index === orderedModules.length - 1}
                            className={cn(
                              'inline-flex h-8 items-center rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
                              fastTrackFocusRing,
                            )}
                          >
                            Move down
                          </button>
                        </>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onReset}
              data-fast-track-reset-layout
              className={cn(
                'inline-flex h-11 items-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-orange-800 dark:hover:bg-orange-950/20 dark:hover:text-orange-300',
                fastTrackFocusRing,
              )}
            >
              Reset layout
            </button>
            <button
              type="button"
              onClick={onClose}
              data-fast-track-customization-done
              className={cn(
                'inline-flex h-11 items-center rounded-2xl bg-orange-700 px-5 text-sm font-semibold text-white hover:bg-orange-800',
                fastTrackFocusRing,
              )}
            >
              Done
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function CustomizationToggleRow({
  testId,
  title,
  description,
  checked,
  onChange,
}: {
  testId: string;
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <section className="rounded-[28px] border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40" data-fast-track-toggle-row={testId}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white">{title}</p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={title}
          onClick={onChange}
          data-fast-track-toggle={testId}
          className={cn(
            'relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300',
            fastTrackFocusRing,
            checked
              ? 'bg-orange-500 shadow-lg shadow-orange-500/30'
              : 'bg-gray-200 dark:bg-gray-700',
          )}
        >
          <span
            className={cn(
              'inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-all duration-300',
              checked ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
      </div>
    </section>
  );
}
