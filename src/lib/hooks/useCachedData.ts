/**
 * React hooks for using IndexedDB cache with data fetching
 * Zero-cost caching solution for solo dev project
 */

import { cache,cachedFetch,invalidateCachePattern } from '@/lib/cache/indexedDB';
import { useCallback,useEffect,useState } from 'react';

interface UseCachedDataOptions<T> {
  key: string;
  fetcher: () => Promise<T>;
  ttl?: number;
  enabled?: boolean;
  staleWhileRevalidate?: boolean;
}

interface UseCachedDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isStale: boolean;
  refetch: () => Promise<void>;
  invalidate: () => Promise<void>;
}

/**
 * Hook for cached data fetching with automatic refetching
 */
export function useCachedData<T>({
  key,
  fetcher,
  ttl = 15 * 60 * 1000, // 15 minutes default
  enabled = true,
  staleWhileRevalidate = true,
}: UseCachedDataOptions<T>): UseCachedDataResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isStale, setIsStale] = useState(false);

  const fetchData = useCallback(async (forceRefresh = false) => {
    if (!enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      if (forceRefresh) {
        // Force refresh - fetch new data
        const freshData = await fetcher();
        await cache.set(key, freshData, ttl);
        setData(freshData);
        setIsStale(false);
      } else if (staleWhileRevalidate) {
        // Stale-while-revalidate: return cached data immediately, refresh in background
        const cachedData = await cache.get<T>(key);
        
        if (cachedData !== null) {
          setData(cachedData);
          setIsStale(true);
          setIsLoading(false); // Don't show loading for cached data
          
          // Refresh in background
          fetcher().then(async (freshData) => {
            await cache.set(key, freshData, ttl);
            setData(freshData);
            setIsStale(false);
          }).catch(err => {
            console.warn('[useCachedData] Background refresh failed:', err);
            // Keep using cached data on error
          });
        } else {
          // No cache - fetch normally
          const freshData = await fetcher();
          await cache.set(key, freshData, ttl);
          setData(freshData);
          setIsStale(false);
        }
      } else {
        // Standard cache-first behavior
        const result = await cachedFetch(key, fetcher, ttl);
        setData(result);
        setIsStale(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [key, fetcher, ttl, enabled, staleWhileRevalidate]);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(async () => {
    await cache.delete(key);
    setData(null);
    setIsStale(false);
  }, [key]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    isLoading,
    error,
    isStale,
    refetch,
    invalidate,
  };
}

/**
 * Hook for caching paginated list data
 */
export function useCachedList<T>({
  key,
  fetcher,
  ttl = 15 * 60 * 1000,
  enabled = true,
}: Omit<UseCachedDataOptions<T[]>, 'staleWhileRevalidate'>) {
  const result = useCachedData<T[]>({
    key,
    fetcher,
    ttl,
    enabled,
    staleWhileRevalidate: false, // Lists should always be fresh
  });

  return {
    ...result,
    items: result.data || [],
    total: result.data?.length || 0,
  };
}

/**
 * Hook for invalidating cache patterns
 */
export function useCacheInvalidation() {
  const invalidatePattern = useCallback(async (pattern: string) => {
    await invalidateCachePattern(pattern);
  }, []);

  const clearAll = useCallback(async () => {
    await cache.clear();
  }, []);

  const cleanupExpired = useCallback(async () => {
    await cache.cleanup();
  }, []);

  return {
    invalidatePattern,
    clearAll,
    cleanupExpired,
  };
}

/**
 * Hook for cache statistics (useful for debugging)
 */
export function useCacheStats() {
  const [size, setSize] = useState(0);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    const updateSize = async () => {
      const cacheSize = await cache.getSize();
      setSize(cacheSize);
    };

    updateSize();
    
    // Update size periodically
    const interval = setInterval(updateSize, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  return {
    size,
    isClient,
    isAvailable: isClient && typeof indexedDB !== 'undefined',
  };
}