import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import ProductAnalyticsProvider from '@/components/analytics/ProductAnalyticsProvider';
import QueryCacheAccountBoundary from '@/components/providers/QueryCacheAccountBoundary';
import { ApplicationsProvider } from '@/contexts/ApplicationsContext';
import { SavedPropertiesProvider } from '@/contexts/SavedPropertiesContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { UserProfileSummaryProvider } from '@/contexts/UserProfileSummaryContext';
import { WorkspaceSyncProvider } from '@/contexts/WorkspaceSyncContext';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
        },
    },
});

interface AppProvidersProps {
    children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
    return (
        <QueryClientProvider client={queryClient}>
            <QueryCacheAccountBoundary>
            <ProductAnalyticsProvider>
                <WorkspaceSyncProvider>
                    <UserProfileSummaryProvider>
                        <SavedPropertiesProvider>
                            <ApplicationsProvider>
                                <ToastProvider>{children}</ToastProvider>
                            </ApplicationsProvider>
                        </SavedPropertiesProvider>
                    </UserProfileSummaryProvider>
                </WorkspaceSyncProvider>
            </ProductAnalyticsProvider>
            </QueryCacheAccountBoundary>
        </QueryClientProvider>
    );
}
