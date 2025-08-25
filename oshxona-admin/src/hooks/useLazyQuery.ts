import { useState, useEffect, useRef } from 'react';

interface LazyQueryOptions<T> {
  enabled?: boolean;
  refetchOnWindowFocus?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

interface LazyQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Custom hook for lazy loading data with caching
 */
export function useLazyQuery<T>(
  queryFn: () => Promise<T>,
  options: LazyQueryOptions<T> = {}
): LazyQueryResult<T> {
  const {
    enabled = true,
    refetchOnWindowFocus = false,
    staleTime = 5 * 60 * 1000, // 5 minutes
    cacheTime = 10 * 60 * 1000, // 10 minutes
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const cacheRef = useRef<{
    data: T;
    timestamp: number;
  } | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = async () => {
    // Check cache first
    if (cacheRef.current) {
      const age = Date.now() - cacheRef.current.timestamp;
      if (age < staleTime) {
        setData(cacheRef.current.data);
        return;
      }
    }

    // Abort previous request if still running
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    
    try {
      setLoading(true);
      setError(null);
      
      const result = await queryFn();
      
      // Update cache
      cacheRef.current = {
        data: result,
        timestamp: Date.now(),
      };
      
      setData(result);
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    // Clear cache and fetch fresh data
    cacheRef.current = null;
    await fetchData();
  };

  useEffect(() => {
    if (enabled) {
      fetchData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (refetchOnWindowFocus) {
      const handleFocus = () => {
        if (enabled && document.visibilityState === 'visible') {
          fetchData();
        }
      };

      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleFocus);

      return () => {
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleFocus);
      };
    }
  }, [enabled, refetchOnWindowFocus]);

  // Clean up cache after cacheTime
  useEffect(() => {
    const interval = setInterval(() => {
      if (cacheRef.current) {
        const age = Date.now() - cacheRef.current.timestamp;
        if (age > cacheTime) {
          cacheRef.current = null;
        }
      }
    }, cacheTime);

    return () => clearInterval(interval);
  }, [cacheTime]);

  return { data, loading, error, refetch };
}