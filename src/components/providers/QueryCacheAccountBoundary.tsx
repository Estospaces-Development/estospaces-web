import { useEffect, useRef, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/contexts/AuthContext';

// Cached server data belongs to one signed-in account. Leaving that account
// (sign-out, or another account signing in on the same tab) must drop it.
export const shouldClearQueryCache = (previousAccountId: string, nextAccountId: string) =>
    Boolean(previousAccountId) && previousAccountId !== nextAccountId;

export default function QueryCacheAccountBoundary({ children }: { children: ReactNode }) {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const accountId = user?.id || '';
    const previousAccountId = useRef(accountId);

    useEffect(() => {
        if (shouldClearQueryCache(previousAccountId.current, accountId)) {
            queryClient.clear();
        }
        previousAccountId.current = accountId;
    }, [accountId, queryClient]);

    return <>{children}</>;
}
