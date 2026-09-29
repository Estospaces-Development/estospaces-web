import {
    getRedirectPath,
    isPublicUserPropertyDetailPath,
    normalizeRole,
    resolveProtectedRedirect,
    shouldAwaitSessionResolution,
} from '@/lib/authUtils';

export type WorkspaceRole = 'admin' | 'manager' | 'user';

export interface WorkspaceAccessInput {
    pathname: string;
    search?: string | null;
    hash?: string | null;
    loading: boolean;
    isAuthenticated: boolean;
    role?: string | null;
}

export type WorkspaceAccessDecision =
    | { kind: 'allow' }
    | { kind: 'await-session' }
    | { kind: 'login' }
    | { kind: 'redirect'; to: string }
    | { kind: 'wrong-role'; requiredRole: WorkspaceRole; currentRole: WorkspaceRole; dashboardPath: string };

const WORKSPACE_PREFIXES: ReadonlyArray<{ prefix: string; role: WorkspaceRole }> = [
    { prefix: '/admin', role: 'admin' },
    { prefix: '/manager', role: 'manager' },
    { prefix: '/user', role: 'user' },
];

/**
 * Case- and thread-scoped pages that exist in more than one workspace. A
 * cross-role link to one of these (typically a notification target built for
 * another role) is remapped to the caller's own workspace with its query and
 * hash intact; the backend still decides whether the caller may see the record.
 */
const ROLE_EQUIVALENT_PATHS: ReadonlyArray<Partial<Record<WorkspaceRole, string>> & { aliases?: string[] }> = [
    { user: '/user/dashboard/fast-track', manager: '/manager/fast-track', admin: '/admin/fast-track' },
    { user: '/user/dashboard/case-file', manager: '/manager/case-files' },
    { user: '/user/dashboard/messages', manager: '/manager/messages' },
    { user: '/user/dashboard/notifications', manager: '/manager/notifications', admin: '/admin/notifications' },
    { user: '/user/dashboard/contracts', manager: '/manager/contracts' },
    { user: '/user/dashboard/applications', manager: '/manager/applications', aliases: ['/user/applications'] },
    { user: '/user/dashboard/viewings', manager: '/manager/appointments' },
    { user: '/user/dashboard/help', manager: '/manager/help', admin: '/admin/help' },
];

const normalizePath = (pathname: string) => {
    const trimmed = pathname.trim() || '/';
    const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
};

export function getWorkspaceRoleForPath(pathname: string): WorkspaceRole | null {
    const normalizedPath = normalizePath(pathname);
    if (isPublicUserPropertyDetailPath(normalizedPath)) {
        return null;
    }

    const match = WORKSPACE_PREFIXES.find(({ prefix }) => (
        normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
    ));
    return match?.role ?? null;
}

export function resolveRoleEquivalentPath(
    pathname: string,
    search: string | null | undefined,
    hash: string | null | undefined,
    role: WorkspaceRole,
): string | null {
    const normalizedPath = normalizePath(pathname);
    const entry = ROLE_EQUIVALENT_PATHS.find((candidate) => (
        Object.entries(candidate).some(([key, value]) => key !== 'aliases' && value === normalizedPath)
        || candidate.aliases?.includes(normalizedPath)
    ));
    const target = entry?.[role];
    if (!target || target === normalizedPath) {
        return null;
    }

    return `${target}${search || ''}${hash || ''}`;
}

export function getWorkspaceRoleLabel(role: WorkspaceRole): string {
    switch (role) {
        case 'admin':
            return 'Admin';
        case 'manager':
            return 'Manager';
        default:
            return 'User';
    }
}

/**
 * Single decision for every protected workspace route. It never sends a
 * signed-in caller to their dashboard: a wrong-role URL either remaps to the
 * same page in the caller's own workspace or produces a truthful wrong-role
 * state, so the requested URL is never silently replaced.
 */
export function resolveWorkspaceAccess(input: WorkspaceAccessInput): WorkspaceAccessDecision {
    const requiredRole = getWorkspaceRoleForPath(input.pathname);
    if (!requiredRole) {
        return { kind: 'allow' };
    }

    if (shouldAwaitSessionResolution(input.loading)) {
        return { kind: 'await-session' };
    }

    if (!input.isAuthenticated) {
        return { kind: 'login' };
    }

    const currentRole = normalizeRole(input.role || undefined);
    if (currentRole !== requiredRole) {
        const equivalentPath = resolveRoleEquivalentPath(input.pathname, input.search, input.hash, currentRole);
        if (equivalentPath) {
            return { kind: 'redirect', to: equivalentPath };
        }

        return {
            kind: 'wrong-role',
            requiredRole,
            currentRole,
            dashboardPath: getRedirectPath(currentRole),
        };
    }

    const launchHiddenRedirect = resolveProtectedRedirect(input.pathname, true, currentRole);
    if (launchHiddenRedirect) {
        return { kind: 'redirect', to: launchHiddenRedirect };
    }

    return { kind: 'allow' };
}
