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
import type {
  FastTrackWorkspaceModule,
  FastTrackWorkspacePreferences,
  FastTrackWorkspaceRole,
} from '@/lib/fastTrackWorkspacePreferences';
import { FAST_TRACK_WORKSPACE_MODULE_LABELS } from '@/lib/fastTrackWorkspacePreferences';
import { cn } from '@/lib/utils';

type FilterMode = 'all' | 'active' | 'completed' | 'cancelled';

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
  return (
    <div className="flex flex-col gap-4" data-fast-track-header>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex flex-wrap items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-600 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:border-orange-800 dark:hover:bg-orange-950/20 dark:hover:text-orange-300"
            aria-label="Back to dashboard"
            title="Back to dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#FF6B35_0%,#E55A2B_100%)] text-white shadow-lg shadow-orange-500/20">
            <LayoutGrid size={20} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[30px] font-bold tracking-[-0.03em] text-gray-900 dark:text-white">
                Fast-track workspace
              </h1>
              <span className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                {role}
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
              One calm workspace from property selection to handover. The workflow stays visible; the secondary tools stay customizable.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onToggleRail}
            data-fast-track-toggle-rail
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-orange-800 dark:hover:bg-orange-950/20 dark:hover:text-orange-300"
          >
            {railCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {railCollapsed ? 'Show cases' : 'Collapse cases'}
          </button>
          <button
            type="button"
            onClick={onOpenCustomize}
            data-fast-track-customize-open
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-200 dark:hover:border-orange-800 dark:hover:bg-orange-950/20 dark:hover:text-orange-300"
          >
            <Settings2 size={16} />
            Customize
          </button>
        </div>
      </div>

      {showMetricsStrip ? (
        <div className="grid gap-3 sm:grid-cols-3" data-fast-track-metrics-strip>
          {stats.map((item) => (
            <div
              key={item.label}
              className="rounded-[26px] border border-gray-100 bg-white px-5 py-4 shadow-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-300">
                {item.label}
              </p>
              <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-gray-900 dark:text-white">
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
  query: string;
  filter: FilterMode;
  filters: Array<{ value: FilterMode; label: string }>;
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  paginatedCount: number;
  items: FastTrackCaseRailItem[];
  onQueryChange: (value: string) => void;
  onFilterChange: (value: FilterMode) => void;
  onSelectCase: (caseId: string) => void;
  onPageChange: (page: number) => void;
  className?: string;
}

export function FastTrackCaseRail({
  query,
  filter,
  filters,
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  paginatedCount,
  items,
  onQueryChange,
  onFilterChange,
  onSelectCase,
  onPageChange,
  className,
}: FastTrackCaseRailProps) {
  return (
    <aside
      className={cn(
        'space-y-4 rounded-[32px] border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950',
        className,
      )}
      data-fast-track-case-rail
      aria-label="Fast-track case list"
    >
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-300">
              Cases
            </p>
            <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
              {totalItems} matching {totalItems === 1 ? 'case' : 'cases'}
            </p>
          </div>
          <span className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
            {currentPage}/{totalPages}
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
            placeholder="Search property or client"
            className="h-12 w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-700 outline-none transition-colors focus:border-orange-400 focus:bg-white dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-200"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {filters.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => onFilterChange(item.value)}
              className={cn(
                'inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold transition-colors',
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

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-gray-300 bg-gray-50 px-5 py-12 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400">
            No fast-track cases match this filter.
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.caseId}
              type="button"
              data-fast-track-case-card={item.caseId}
              onClick={() => onSelectCase(item.caseId)}
              className={cn(
                'w-full rounded-[26px] border px-4 py-4 text-left transition-colors',
                item.selected
                  ? 'border-orange-300 bg-orange-50 shadow-[0_12px_28px_-16px_rgba(234,88,12,0.35)] dark:border-orange-800 dark:bg-orange-950/20'
                  : 'border-gray-100 bg-white hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:hover:bg-gray-900',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                    {item.title}
                  </p>
                  <p className="mt-1 truncate text-sm text-gray-500 dark:text-gray-400">
                    {item.subtitle}
                  </p>
                </div>
                <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-semibold', item.statusTone)}>
                  {item.statusLabel}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between gap-4 text-xs text-gray-600 dark:text-gray-300">
                <span>{item.stageLabel}</span>
                <span>{item.deadlineLabel}</span>
              </div>
            </button>
          ))
        )}
      </div>

      {totalItems > pageSize ? (
        <PaginationBar
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          totalItems={totalItems}
          pageSize={pageSize}
          currentItemCount={paginatedCount}
          itemLabel="cases"
          stacked
        />
      ) : null}
    </aside>
  );
}

interface FastTrackCaseMastheadProps {
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
  return (
    <section className="overflow-hidden rounded-[34px] border border-orange-100 bg-[radial-gradient(circle_at_top_left,_rgba(255,237,213,0.9),_rgba(255,255,255,1)_52%)] p-6 shadow-[0_24px_44px_-28px_rgba(234,88,12,0.25)] dark:border-orange-900/30 dark:bg-[radial-gradient(circle_at_top_left,_rgba(124,45,18,0.34),_rgba(3,7,18,1)_56%)]" data-fast-track-masthead>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[28px] font-bold tracking-[-0.03em] text-gray-900 dark:text-white">
              {title}
            </h2>
            <span className={cn('rounded-full border px-3 py-1 text-xs font-semibold', statusTone)}>
              {statusLabel}
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">{subtitle}</p>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-700 dark:text-gray-200">
            {statusSummary}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[430px]">
          <MastheadInfoCard label="24h" value={deadlineLabel} />
          <MastheadInfoCard label="Current stage" value={currentStage} />
          <MastheadInfoCard label="Focus" value={focus} />
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onOpenCustomize}
          data-fast-track-customize-open-inline
          className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/70 bg-white/80 px-4 text-sm font-semibold text-gray-700 backdrop-blur transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-white/10 dark:bg-white/5 dark:text-gray-200 dark:hover:border-orange-800 dark:hover:bg-orange-950/20 dark:hover:text-orange-300"
        >
          <ListFilter size={16} />
          Tune layout
        </button>
      </div>
    </section>
  );
}

function MastheadInfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[26px] border border-white/70 bg-white/80 px-4 py-4 backdrop-blur dark:border-white/10 dark:bg-white/5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-300">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold tracking-[-0.02em] text-gray-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}

interface FastTrackStageStepperProps {
  items: FastTrackStepperItem[];
}

export function FastTrackStageStepper({ items }: FastTrackStageStepperProps) {
  return (
    <section className="sticky top-20 z-20 rounded-[28px] border border-gray-100 bg-white/92 px-4 py-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-950/92" data-fast-track-stepper>
      <div
        className="flex gap-2 overflow-x-auto pb-1"
        tabIndex={0}
        aria-label="Fast-track stage progress"
      >
        {items.map((item, index) => (
          <React.Fragment key={item.key}>
            <div
              className={cn(
                'inline-flex min-w-[112px] items-center gap-2 rounded-2xl border px-3 py-2.5',
                item.active
                  ? 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-300'
                  : item.complete
                    ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-950/20 dark:text-green-300'
                    : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400',
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="text-sm font-semibold">{item.label}</span>
            </div>
            {index < items.length - 1 ? (
              <div
                className={cn(
                  'mt-5 hidden h-px min-w-6 flex-1 sm:block',
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
  density: FastTrackWorkspacePreferences['secondaryDensity'];
  modules: FastTrackWorkspaceModule[];
  activeModule: FastTrackWorkspaceModule;
  onActiveModuleChange: (module: FastTrackWorkspaceModule) => void;
  renderModule: (module: FastTrackWorkspaceModule) => React.ReactNode;
}

export function FastTrackUtilityDock({
  density,
  modules,
  activeModule,
  onActiveModuleChange,
  renderModule,
}: FastTrackUtilityDockProps) {
  if (modules.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[30px] border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950" data-fast-track-utility-dock>
      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-300">
            Utility dock
          </p>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Keep the supporting tools close without crowding the workflow.
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
                'inline-flex h-9 items-center rounded-full px-3 text-xs font-semibold transition-colors',
                activeModule === module
                  ? 'bg-orange-700 text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800',
              )}
            >
              {FAST_TRACK_WORKSPACE_MODULE_LABELS[module]}
            </button>
          ))}
        </div>

        <div
          className={cn(
            'rounded-[26px] border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40',
            density === 'comfortable' ? 'min-h-[360px]' : 'min-h-[300px]',
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
              Customize workspace
            </p>
            <h3 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-gray-900 dark:text-white">
              Tune the secondary layout
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Mandatory workflow areas stay visible. These controls only change the supporting layout.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-gray-200 bg-white text-gray-500 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-orange-800 dark:hover:bg-orange-950/20 dark:hover:text-orange-300"
          >
            <ChevronRight className="rotate-180" size={16} />
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <CustomizationToggleRow
            testId="metrics-strip"
            title="Metrics strip"
            description="Show the active/completed/cancelled summary at the top."
            checked={preferences.showMetricsStrip}
            onChange={onToggleMetrics}
          />
          <CustomizationToggleRow
            testId="case-rail-collapsed"
            title="Start with case rail collapsed"
            description="Keep the main workspace in focus and open the case rail on demand."
            checked={preferences.caseRailCollapsed}
            onChange={onToggleCaseRailCollapsed}
          />

          <section className="rounded-[28px] border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Secondary density</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Balance between more breathing room and more information on screen.
            </p>
            <div className="mt-4 flex gap-2">
              {(['compact', 'comfortable'] as const).map((density) => (
                <button
                  key={density}
                  type="button"
                  onClick={() => onDensityChange(density)}
                  data-fast-track-density={density}
                  className={cn(
                    'inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold transition-colors',
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
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Utility modules</p>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Hide or reorder the supporting dock modules. Workflow panels cannot be removed here.
            </p>
            <div className="mt-4 space-y-3">
              {orderedModules.map((module, index) => {
                const visible = preferences.visibleModules.includes(module);
                return (
                  <div
                    key={module}
                    data-fast-track-module-row={module}
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-950"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">
                          {FAST_TRACK_WORKSPACE_MODULE_LABELS[module]}
                        </p>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {preferences.defaultActiveModule === module
                            ? 'Opens by default'
                            : 'Available in the utility dock'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onToggleModule(module)}
                        data-fast-track-module-toggle={module}
                        className={cn(
                          'inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold transition-colors',
                          visible
                            ? 'bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-300'
                            : 'border border-gray-200 bg-white text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300',
                        )}
                      >
                        {visible ? 'Visible' : 'Hidden'}
                      </button>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => onSetDefaultModule(module)}
                        data-fast-track-module-default={module}
                        disabled={!visible}
                        className="inline-flex h-8 items-center rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        Make default
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveModule(module, 'up')}
                        data-fast-track-module-up={module}
                        disabled={index === 0}
                        className="inline-flex h-8 items-center rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        Move up
                      </button>
                      <button
                        type="button"
                        onClick={() => onMoveModule(module, 'down')}
                        data-fast-track-module-down={module}
                        disabled={index === orderedModules.length - 1}
                        className="inline-flex h-8 items-center rounded-full border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
                      >
                        Move down
                      </button>
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
              className="inline-flex h-11 items-center rounded-2xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-orange-800 dark:hover:bg-orange-950/20 dark:hover:text-orange-300"
            >
              Reset layout
            </button>
            <button
              type="button"
              onClick={onClose}
              data-fast-track-customization-done
              className="inline-flex h-11 items-center rounded-2xl bg-orange-700 px-5 text-sm font-semibold text-white hover:bg-orange-800"
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
          onClick={onChange}
          data-fast-track-toggle={testId}
          className={cn(
            'relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300',
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
