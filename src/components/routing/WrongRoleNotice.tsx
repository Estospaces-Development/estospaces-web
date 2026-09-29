import { Link } from 'react-router-dom';

import AuthBrand from '@/components/auth/AuthBrand';
import { getRedirectPath } from '@/lib/authUtils';
import { getWorkspaceRoleLabel, type WorkspaceRole } from '@/lib/workspaceAccess';

interface WrongRoleNoticeProps {
    requiredRole: WorkspaceRole;
    currentRole: WorkspaceRole;
}

/**
 * Shown instead of silently redirecting when a confirmed session opens a page
 * that belongs to another workspace, so the requested URL stays visible and
 * the caller understands why the page did not open.
 */
export default function WrongRoleNotice({ requiredRole, currentRole }: WrongRoleNoticeProps) {
    const requiredLabel = getWorkspaceRoleLabel(requiredRole);
    const currentLabel = getWorkspaceRoleLabel(currentRole);

    return (
        <main
            className="flex min-h-screen w-full items-center justify-center bg-gray-50 px-4 py-12"
            data-wrong-role-notice={requiredRole}
        >
            <section
                className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 text-center shadow-sm sm:p-8"
                aria-labelledby="wrong-role-heading"
            >
                <AuthBrand className="!mb-6" />
                <h1 id="wrong-role-heading" className="text-xl font-semibold text-gray-900">
                    This page is for {requiredLabel} accounts
                </h1>
                <p className="mt-3 text-sm text-gray-600">
                    You are signed in with a {currentLabel} account, so this page is not available here.
                    Nothing has been changed.
                </p>
                <Link
                    to={getRedirectPath(currentRole)}
                    replace
                    className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-md bg-primary px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all hover:bg-opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2"
                >
                    Go to your {currentLabel} dashboard
                </Link>
            </section>
        </main>
    );
}
