import { useState, useEffect, useCallback, useRef } from "react";
import type React from "react";

interface UseDataFetchingOptions {
  enabled?: boolean;
}

// Interface nilai kembalian untuk hook useDataFetching
interface UseDataFetchingReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Hook kustom untuk pengambilan data asinkron beserta status pemuatan, galat, dan AbortController
export function useDataFetching<T>(
  fetchFn: (signal?: AbortSignal) => Promise<T>,
  deps: React.DependencyList = [],
  options: UseDataFetchingOptions = {},
): UseDataFetchingReturn<T> {
  const { enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(enabled);
  const [error, setError] = useState<string | null>(null);

  const fetchFnRef = useRef(fetchFn);
  useEffect(() => {
    fetchFnRef.current = fetchFn;
  }, [fetchFn]);

  const executeFetch = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchFnRef.current(signal);
      if (!signal?.aborted) {
        setData(result);
      }
    } catch (err) {
      if (
        signal?.aborted ||
        (err instanceof Error && err.name === "AbortError")
      ) {
        return;
      }
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      const timer = window.setTimeout(() => setIsLoading(false), 0);
      return () => window.clearTimeout(timer);
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void executeFetch(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, executeFetch, ...deps]);

  const refetch = useCallback(async () => {
    await executeFetch();
  }, [executeFetch]);

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
