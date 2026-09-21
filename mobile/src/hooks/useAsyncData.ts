import { useCallback, useEffect, useRef, useState } from 'react';

interface AsyncState<T> {
  data?: T;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Runs an async load on mount (and whenever `deps` change), exposing
 * loading/error/data plus a manual `reload`.
 */
export function useAsyncData<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const latestFn = useRef(fn);

  useEffect(() => {
    latestFn.current = fn;
  }, [fn]);

  const load = useCallback(
    async (initial: boolean) => {
      if (initial) {
        setLoading(true);
        setError(null);
      }
      try {
        const result = await latestFn.current();
        setData(result);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong.');
      } finally {
        if (initial) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    deps,
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  const reload = useCallback(() => load(false), [load]);

  return { data, loading, error, reload };
}