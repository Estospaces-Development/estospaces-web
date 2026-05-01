import { getJourneyModuleLabel } from '@/lib/userJourneyCopy';

export type FastTrackWorkspaceRole = 'user' | 'manager' | 'admin';

export type FastTrackWorkspaceModule =
  | 'core_files'
  | 'preview'
  | 'case_chat'
  | 'activity'
  | 'connected_records';

export type FastTrackWorkspaceLayoutMode = 'balanced_compact';
export type FastTrackWorkspaceSecondaryDensity = 'compact' | 'comfortable';

export interface FastTrackWorkspacePreferences {
  workspaceKey: 'fast_track';
  role: FastTrackWorkspaceRole;
  layoutMode: FastTrackWorkspaceLayoutMode;
  caseRailCollapsed: boolean;
  secondaryDensity: FastTrackWorkspaceSecondaryDensity;
  showMetricsStrip: boolean;
  visibleModules: FastTrackWorkspaceModule[];
  moduleOrder: FastTrackWorkspaceModule[];
  defaultActiveModule: FastTrackWorkspaceModule;
}

export const FAST_TRACK_WORKSPACE_MODULES: FastTrackWorkspaceModule[] = [
  'core_files',
  'case_chat',
  'activity',
  'preview',
  'connected_records',
];

export const FAST_TRACK_WORKSPACE_MODULE_LABELS: Record<
  FastTrackWorkspaceModule,
  string
> = {
  core_files: 'Core files',
  preview: 'Preview',
  case_chat: 'Case chat',
  activity: 'Activity',
  connected_records: 'Connected records',
};

export const getFastTrackWorkspaceModuleLabel = (
  module: FastTrackWorkspaceModule,
  role: FastTrackWorkspaceRole,
) => getJourneyModuleLabel(module, role);

const normalizeModule = (
  value: string | null | undefined,
): FastTrackWorkspaceModule | null => {
  switch (String(value || '').trim().toLowerCase()) {
    case 'core_files':
      return 'core_files';
    case 'preview':
      return 'preview';
    case 'case_chat':
      return 'case_chat';
    case 'activity':
      return 'activity';
    case 'connected_records':
      return 'connected_records';
    default:
      return null;
  }
};

const normalizeModuleList = (
  values: Array<string | FastTrackWorkspaceModule> | null | undefined,
  fallback: FastTrackWorkspaceModule[],
): FastTrackWorkspaceModule[] => {
  const normalized: FastTrackWorkspaceModule[] = [];
  const seen = new Set<FastTrackWorkspaceModule>();

  for (const value of values || []) {
    const module = normalizeModule(value);
    if (!module || seen.has(module)) {
      continue;
    }
    seen.add(module);
    normalized.push(module);
  }

  return normalized.length > 0 ? normalized : [...fallback];
};

const normalizeModuleOrder = (
  values: Array<string | FastTrackWorkspaceModule> | null | undefined,
  fallback: FastTrackWorkspaceModule[],
): FastTrackWorkspaceModule[] => {
  const normalized = normalizeModuleList(values, fallback);
  const seen = new Set<FastTrackWorkspaceModule>(normalized);

  for (const module of fallback) {
    if (seen.has(module)) {
      continue;
    }
    normalized.push(module);
    seen.add(module);
  }

  return normalized;
};

const normalizeDensity = (
  value: string | null | undefined,
): FastTrackWorkspaceSecondaryDensity =>
  String(value || '').trim().toLowerCase() === 'comfortable'
    ? 'comfortable'
    : 'compact';

const normalizeLayoutMode = (
  value: string | null | undefined,
): FastTrackWorkspaceLayoutMode => 'balanced_compact';

const normalizeRole = (value: string | null | undefined): FastTrackWorkspaceRole => {
  switch (String(value || '').trim().toLowerCase()) {
    case 'manager':
    case 'broker':
      return 'manager';
    case 'admin':
      return 'admin';
    default:
      return 'user';
  }
};

export const defaultFastTrackWorkspacePreferences = (
  role: FastTrackWorkspaceRole,
): FastTrackWorkspacePreferences => ({
  workspaceKey: 'fast_track',
  role,
  layoutMode: 'balanced_compact',
  caseRailCollapsed: role === 'user',
  secondaryDensity: 'compact',
  showMetricsStrip: role !== 'user',
  visibleModules: role === 'user'
    ? ['core_files', 'case_chat', 'preview']
    : [...FAST_TRACK_WORKSPACE_MODULES],
  moduleOrder: [...FAST_TRACK_WORKSPACE_MODULES],
  defaultActiveModule: 'core_files',
});

export const normalizeFastTrackWorkspacePreferences = (
  raw: Partial<FastTrackWorkspacePreferences> | null | undefined,
  role: FastTrackWorkspaceRole,
): FastTrackWorkspacePreferences => {
  const defaults = defaultFastTrackWorkspacePreferences(role);
  const visibleModules = normalizeModuleList(
    raw?.visibleModules,
    defaults.visibleModules,
  );
  const moduleOrder = normalizeModuleOrder(raw?.moduleOrder, defaults.moduleOrder);
  let defaultActiveModule = normalizeModule(raw?.defaultActiveModule);

  if (!defaultActiveModule) {
    defaultActiveModule = defaults.defaultActiveModule;
  }
  if (visibleModules.length > 0 && !visibleModules.includes(defaultActiveModule)) {
    defaultActiveModule = visibleModules[0];
  }

  return {
    workspaceKey: 'fast_track',
    role: normalizeRole(raw?.role || role),
    layoutMode: normalizeLayoutMode(raw?.layoutMode),
    caseRailCollapsed: raw?.caseRailCollapsed ?? defaults.caseRailCollapsed,
    secondaryDensity: normalizeDensity(raw?.secondaryDensity),
    showMetricsStrip: raw?.showMetricsStrip ?? defaults.showMetricsStrip,
    visibleModules,
    moduleOrder,
    defaultActiveModule,
  };
};

export const orderVisibleFastTrackWorkspaceModules = (
  preferences: FastTrackWorkspacePreferences,
): FastTrackWorkspaceModule[] => {
  const visible = new Set(preferences.visibleModules);
  return preferences.moduleOrder.filter((module) => visible.has(module));
};

export const moveFastTrackWorkspaceModule = (
  modules: FastTrackWorkspaceModule[],
  module: FastTrackWorkspaceModule,
  direction: 'up' | 'down',
): FastTrackWorkspaceModule[] => {
  const currentIndex = modules.indexOf(module);
  if (currentIndex === -1) {
    return modules;
  }

  const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (targetIndex < 0 || targetIndex >= modules.length) {
    return modules;
  }

  const next = [...modules];
  const [removed] = next.splice(currentIndex, 1);
  next.splice(targetIndex, 0, removed);
  return next;
};
