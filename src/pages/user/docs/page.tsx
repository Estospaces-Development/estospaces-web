import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, type User } from '@/contexts/AuthContext';
import { getLoginPath, getRedirectPath } from '@/lib/authUtils';
import { UserVirtualStoragePageContent } from '@/pages/user/virtual-storage/page';

interface UserDocumentsPageContentProps {
    currentUser: User | null;
    onBack?: () => void;
}

export function UserDocumentsPageContent({ currentUser, onBack }: UserDocumentsPageContentProps) {
    return <UserVirtualStoragePageContent currentUser={currentUser} onBack={onBack} />;
}

function UserDocsWrongRoleState({ role, onOpenDashboard }: { role?: string; onOpenDashboard: () => void }) {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6 text-center dark:bg-gray-900">
            <div className="max-w-lg rounded-3xl border border-orange-100 bg-white p-8 shadow-sm dark:border-orange-900/30 dark:bg-gray-800">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orange-500">Access denied</p>
                <h1 className="mt-3 text-2xl font-black text-gray-900 dark:text-white">User documents are only available to user accounts.</h1>
                <p className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
                    You are signed in as {role || 'another role'}. Open your own dashboard to keep docs, support, and workspace URLs aligned.
                </p>
                <button
                    type="button"
                    onClick={onOpenDashboard}
                    className="mt-6 rounded-2xl bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-orange-700"
                >
                    Open my dashboard
                </button>
            </div>
        </div>
    );
}

export default function UserDocsPage() {
    const navigate = useNavigate();
    const { user: currentUser, loading: authLoading, isAuthenticated } = useAuth();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            navigate(getLoginPath(), { replace: true });
        }
    }, [authLoading, isAuthenticated, navigate]);

    if (authLoading || (isAuthenticated && !currentUser)) {
        return <BrandLoadingScreen label="Checking your document access..." />;
    }

    if (isAuthenticated && currentUser?.role !== 'user') {
        return (
            <UserDocsWrongRoleState
                role={currentUser?.role}
                onOpenDashboard={() => navigate(getRedirectPath(currentUser?.role), { replace: true })}
            />
        );
    }

    return (
        <UserDocumentsPageContent
            currentUser={currentUser}
            onBack={() => navigate('/user/dashboard')}
        />
    );
}
