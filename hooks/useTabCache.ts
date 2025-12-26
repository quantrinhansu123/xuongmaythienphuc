import { useCallback, useState } from 'react';

/**
 * Hook đơn giản để cache data của các tabs
 * Giúp chuyển tab nhanh hơn bằng cách lưu data đã fetch
 */
export function useTabCache<T = any>() {
  const [cache, setCache] = useState<Record<string, T>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const getCachedData = useCallback((key: string) => {
    return cache[key];
  }, [cache]);

  const setCachedData = useCallback((key: string, data: T) => {
    setCache(prev => ({ ...prev, [key]: data }));
  }, []);

  const isLoading = useCallback((key: string) => {
    return loading[key] || false;
  }, [loading]);

  const setLoadingState = useCallback((key: string, state: boolean) => {
    setLoading(prev => ({ ...prev, [key]: state }));
  }, []);

  const clearCache = useCallback((key?: string) => {
    if (key) {
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache[key];
        return newCache;
      });
    } else {
      setCache({});
    }
  }, []);

  const fetchWithCache = useCallback(async (
    key: string,
    fetchFn: () => Promise<T>,
    forceRefresh = false
  ) => {
    // Nếu có cache và không force refresh, return cache
    if (!forceRefresh && cache[key]) {
      return cache[key];
    }

    setLoadingState(key, true);
    try {
      const data = await fetchFn();
      setCachedData(key, data);
      return data;
    } finally {
      setLoadingState(key, false);
    }
  }, [cache, setCachedData, setLoadingState]);

  return {
    getCachedData,
    setCachedData,
    isLoading,
    setLoadingState,
    clearCache,
    fetchWithCache,
  };
}
