import { ADMIN_RESEARCH_ENABLED } from './launchFlags';

export const ADMIN_RESEARCH_PATH = '/admin/research';

export const isAdminResearchPath = (path: string) =>
    path === ADMIN_RESEARCH_PATH || path.startsWith(`${ADMIN_RESEARCH_PATH}/`);

/** Removes the Research entry from an admin navigation list while the workspace is disabled. */
export const filterAdminResearchNavItems = <T extends { path: string }>(
    items: readonly T[],
    enabled: boolean = ADMIN_RESEARCH_ENABLED,
): T[] => (enabled ? [...items] : items.filter((item) => !isAdminResearchPath(item.path)));
