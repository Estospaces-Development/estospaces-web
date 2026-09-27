import { AlertCircle, ArrowLeft, Home, RefreshCw, ShieldAlert } from 'lucide-react';

import ActionSpinner from '@/components/ui/ActionSpinner';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import type { ManagerPropertyLoadFailureKind } from '@/lib/managerPropertyDetail';

type ManagerPropertyLoadStateKind = 'loading' | ManagerPropertyLoadFailureKind;

interface ManagerPropertyLoadStateProps {
    kind: ManagerPropertyLoadStateKind;
    /** Distinguishes the detail and edit copy. */
    purpose?: 'view' | 'edit';
    errorMessage?: string;
    onBack: () => void;
    onRetry?: () => void;
    retrying?: boolean;
}

const COPY: Record<ManagerPropertyLoadFailureKind, { title: string; view: string; edit: string }> = {
    not_found: {
        title: 'Property not found',
        view: "This property doesn't exist or has been removed from your inventory.",
        edit: "The property you're trying to edit doesn't exist or has been removed from your inventory.",
    },
    forbidden: {
        title: "You don't have access to this property",
        view: 'This listing is not part of your inventory, so it cannot be managed from this account.',
        edit: 'This listing is not part of your inventory, so it cannot be edited from this account.',
    },
    error: {
        title: "Couldn't load this property",
        view: '',
        edit: '',
    },
};

export default function ManagerPropertyLoadState({
    kind,
    purpose = 'view',
    errorMessage,
    onBack,
    onRetry,
    retrying = false,
}: ManagerPropertyLoadStateProps) {
    if (kind === 'loading') {
        return (
            <BrandLoadingScreen
                variant="section"
                label={purpose === 'edit' ? 'Loading property details...' : 'Loading property...'}
            />
        );
    }

    const copy = COPY[kind];
    const Icon = kind === 'forbidden' ? ShieldAlert : kind === 'error' ? AlertCircle : Home;
    const description = kind === 'error' ? errorMessage || '' : copy[purpose];

    return (
        <div
            className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center"
            data-manager-property-state={kind}
            role={kind === 'error' ? 'alert' : undefined}
        >
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-6">
                <Icon className="w-10 h-10 text-gray-400" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">{copy.title}</h2>
            {description && (
                <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md break-words">{description}</p>
            )}
            <div className="flex flex-wrap items-center justify-center gap-3">
                {kind === 'error' && onRetry && (
                    <button
                        type="button"
                        onClick={onRetry}
                        disabled={retrying}
                        className="flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        {retrying
                            ? <ActionSpinner size="md" aria-hidden />
                            : <RefreshCw className="w-5 h-5" aria-hidden="true" />}
                        {retrying ? 'Retrying...' : 'Try again'}
                    </button>
                )}
                <button
                    type="button"
                    onClick={onBack}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                    Back to Properties
                </button>
            </div>
        </div>
    );
}
