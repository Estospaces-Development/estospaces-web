import { useEffect, useState } from 'react';

import { getPreferences } from '@/services/authService';
import { resolvePreferredSearchDefaults, type PreferredSearchDefaults } from '@/lib/preferredSearchDefaults';

const emptyDefaults: PreferredSearchDefaults = { market: null, location: '' };

export function usePreferredSearchDefaults(userId?: string | null): PreferredSearchDefaults & { ready: boolean; failed: boolean } {
  const [state, setState] = useState<PreferredSearchDefaults & { ready: boolean; failed: boolean; userId: string | null }>(() => ({
    ...emptyDefaults,
    ready: !userId,
    failed: false,
    userId: userId || null,
  }));

  useEffect(() => {
    if (!userId) {
      setState({ ...emptyDefaults, ready: true, failed: false, userId: null });
      return;
    }

    let cancelled = false;
    setState({ ...emptyDefaults, ready: false, failed: false, userId });

    void getPreferences()
      .then(({ data, error }) => {
        if (!cancelled) {
          setState(data
            ? { ...resolvePreferredSearchDefaults(data.preferred_city), ready: true, failed: false, userId }
            : { ...emptyDefaults, ready: true, failed: Boolean(error), userId });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ ...emptyDefaults, ready: true, failed: true, userId });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setState((current) => current.userId === userId ? { ...current, ready: true } : current);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!userId) {
    return { ...emptyDefaults, ready: true, failed: false };
  }

  return state.userId !== userId
    ? { ...emptyDefaults, ready: false, failed: false }
    : { market: state.market, location: state.location, ready: state.ready, failed: state.failed };
}
