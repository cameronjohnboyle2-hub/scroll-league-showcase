import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../data/api';
import { getDemoSnapshot } from '../demo/fixtures';
import type { AppSnapshot } from '../domain/types';

export function useLeagueSnapshot(demo: boolean) {
  const auth = useAuth();
  const demoSnapshot = useMemo(() => (demo ? getDemoSnapshot() : null), [demo]);
  const [snapshot, setSnapshot] = useState<AppSnapshot | null>(demoSnapshot);
  const [fetching, setFetching] = useState(!demo && Boolean(auth.session));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    await Promise.resolve();
    if (demo) {
      setSnapshot(getDemoSnapshot());
      return;
    }
    if (!auth.session) {
      setFetching(false);
      setSnapshot(null);
      return;
    }
    setFetching(true);
    setError(null);
    try {
      setSnapshot(await api.getSnapshot());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not load the league.');
    } finally {
      setFetching(false);
    }
  }, [auth.session, demo]);

  useEffect(() => {
    const timer = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  return { ...auth, snapshot, loading: demo ? false : auth.loading || fetching, error, refresh };
}
