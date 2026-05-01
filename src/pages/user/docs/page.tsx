import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, FileText, Loader2 } from 'lucide-react';
import VerificationSection from '@/components/dashboard/VerificationSection';
import { useAuth, type User } from '@/contexts/AuthContext';
import { getRedirectPath } from '@/lib/authUtils';

interface UserDocumentsPageContentProps {
    currentUser: User | null;
    onBack?: () => void;
}

export function UserDocumentsPageContent({ currentUser, onBack }: UserDocumentsPageContentProps) {
    return (
        <div className="min-h-screen bg-gray-50 pb-20 dark:bg-gray-900">
            <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                <button
                    type="button"
                    onClick={onBack}
                    className="mb-8 flex items-center gap-2 text-gray-400 transition-all hover:text-orange-500"
                >
                    <span className="rounded-xl p-2 transition-all hover:bg-orange-50 dark:hover:bg-orange-900/20">
                        <ArrowLeft size={18} />
                    </span>
                    <span className="text-sm font-bold">Dashboard</span>
                </button>

                <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">
                            My Documents
                        </h1>
                        <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-gray-500 dark:text-gray-400">
                            Upload and track the identity and address documents used for account verification.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 shadow-sm dark:bg-gray-800 dark:text-gray-300">
                        <FileText size={16} className="text-orange-500" />
                        Verification files
                    </div>
                </div>

                <div className="mb-8 rounded-3xl border border-orange-100 bg-white p-5 shadow-sm dark:border-orange-900/30 dark:bg-gray-800">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-orange-500">Booking guidance</p>
                            <h2 className="mt-2 text-lg font-black text-gray-900 dark:text-white">
                                Viewings, bookings, documents, contracts, and support
                            </h2>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                                Use the dashboard guide when a document upload is tied to a viewing, booking, contract, payment, or support recovery step.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => window.location.assign('/user/dashboard/docs#bookings-viewings-documents-and-support')}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200 px-4 py-3 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-50 dark:border-orange-500/20 dark:text-orange-200 dark:hover:bg-orange-950/30"
                        >
                            <BookOpen className="h-4 w-4" />
                            Open guide
                        </button>
                    </div>
                </div>

                <VerificationSection userId={currentUser?.id} currentUser={currentUser} />
            </div>
        </div>
    );
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
            navigate('/login', { replace: true });
        }
    }, [authLoading, isAuthenticated, navigate]);

    if (authLoading || (isAuthenticated && !currentUser)) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
                <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
            </div>
        );
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
