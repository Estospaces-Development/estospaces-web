import { getErrorMessage, getServiceUrl, apiFetch } from '@/lib/apiUtils';
import type {
  FastTrackWorkspacePreferences,
  FastTrackWorkspaceRole,
} from '@/lib/fastTrackWorkspacePreferences';
import { normalizeFastTrackWorkspacePreferences } from '@/lib/fastTrackWorkspacePreferences';

const CORE_URL = () => getServiceUrl('core');

interface BackendWorkspacePreferences {
  workspace_key?: string;
  role?: string;
  layout_mode?: string;
  case_rail_collapsed?: boolean;
  secondary_density?: string;
  show_metrics_strip?: boolean;
  visible_modules?: string[];
  module_order?: string[];
  default_active_module?: string;
}

const toWorkspacePreferences = (
  raw: BackendWorkspacePreferences | null | undefined,
  role: FastTrackWorkspaceRole,
): FastTrackWorkspacePreferences =>
  normalizeFastTrackWorkspacePreferences(
    raw
      ? {
          workspaceKey: 'fast_track',
          role,
          layoutMode: raw.layout_mode as FastTrackWorkspacePreferences['layoutMode'],
          caseRailCollapsed: raw.case_rail_collapsed,
          secondaryDensity: raw.secondary_density as FastTrackWorkspacePreferences['secondaryDensity'],
          showMetricsStrip: raw.show_metrics_strip,
          visibleModules: raw.visible_modules as FastTrackWorkspacePreferences['visibleModules'],
          moduleOrder: raw.module_order as FastTrackWorkspacePreferences['moduleOrder'],
          defaultActiveModule: raw.default_active_module as FastTrackWorkspacePreferences['defaultActiveModule'],
        }
      : null,
    role,
  );

export const getFastTrackWorkspacePreferences = async (
  role: FastTrackWorkspaceRole,
) => {
  try {
    const data = await apiFetch<BackendWorkspacePreferences>(
      `${CORE_URL()}/api/v1/users/workspace-preferences/fast-track?role=${role}`,
    );
    return { data: toWorkspacePreferences(data, role), error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

export const updateFastTrackWorkspacePreferences = async (
  role: FastTrackWorkspaceRole,
  preferences: FastTrackWorkspacePreferences,
) => {
  try {
    const payload = {
      layout_mode: preferences.layoutMode,
      case_rail_collapsed: preferences.caseRailCollapsed,
      secondary_density: preferences.secondaryDensity,
      show_metrics_strip: preferences.showMetricsStrip,
      visible_modules: preferences.visibleModules,
      module_order: preferences.moduleOrder,
      default_active_module: preferences.defaultActiveModule,
    };
    const data = await apiFetch<BackendWorkspacePreferences>(
      `${CORE_URL()}/api/v1/users/workspace-preferences/fast-track?role=${role}`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      },
    );
    return { data: toWorkspacePreferences(data, role), error: null };
  } catch (error: any) {
    return { data: null, error: getErrorMessage(error) };
  }
};

