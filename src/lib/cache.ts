/**
 * Robust in-memory and local storage caching layer with in-flight promise deduplication.
 * Prevents redundant HTTP requests, stops Google Sheets rate-limiting, and speeds up data fetching.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// In-memory cache
const memoryCache = new Map<string, CacheEntry<unknown>>();

// In-flight promise pool for request deduplication
const inFlightPromises = new Map<string, Promise<unknown>>();

// Resolved tab cache to avoid probing candidate tab names repeatedly
const resolvedTabCache = new Map<string, string>();

const STORAGE_PREFIX = "wt_cache_";

/**
 * Deduplicate concurrent asynchronous calls. If a promise for `key` is already in flight,
 * returns that same promise instead of executing `fn` again.
 */
export async function dedupPromise<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (inFlightPromises.has(key)) {
    return inFlightPromises.get(key) as Promise<T>;
  }

  const promise = (async () => {
    try {
      return await fn();
    } finally {
      inFlightPromises.delete(key);
    }
  })();

  inFlightPromises.set(key, promise);
  return promise;
}

/**
 * Fetch with TTL caching and request deduplication.
 * @param key Cache key identifier
 * @param fetcher Async function to fetch data if cache misses or expires
 * @param ttlMs Time-to-live in milliseconds (defaults to 3 minutes)
 * @param forceRefresh If true, bypasses the cache and forces fresh fetch
 */
export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs = 180000,
  forceRefresh = false
): Promise<T> {
  const now = Date.now();

  if (!forceRefresh) {
    // 1. Check in-memory cache
    const memEntry = memoryCache.get(key) as CacheEntry<T> | undefined;
    if (memEntry && now - memEntry.timestamp < memEntry.ttl) {
      return memEntry.data;
    }

    // 2. Check localStorage (for persistence across navigation)
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_PREFIX + key);
        if (stored) {
          const parsed = JSON.parse(stored) as CacheEntry<T>;
          if (now - parsed.timestamp < parsed.ttl) {
            memoryCache.set(key, parsed as CacheEntry<unknown>);
            return parsed.data;
          }
        }
      } catch {
        // Ignore localStorage errors
      }
    }
  }

  // 3. Deduplicate in-flight fetch
  return dedupPromise<T>(key, async () => {
    const freshData = await fetcher();
    const entry: CacheEntry<T> = {
      data: freshData,
      timestamp: Date.now(),
      ttl: ttlMs,
    };

    memoryCache.set(key, entry as CacheEntry<unknown>);

    if (typeof window !== "undefined") {
      try {
        // Only persist JSON-serializable payloads
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(entry));
      } catch {
        // Ignore storage quota limits
      }
    }

    return freshData;
  });
}

/**
 * Invalidate a specific cache key or all cache keys matching a pattern.
 */
export function invalidateCache(keyOrPattern?: string | RegExp) {
  if (!keyOrPattern) {
    memoryCache.clear();
    if (typeof window !== "undefined") {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(STORAGE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {
        // Ignore
      }
    }
    return;
  }

  if (typeof keyOrPattern === "string") {
    memoryCache.delete(keyOrPattern);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_PREFIX + keyOrPattern);
    }
    return;
  }

  // RegExp pattern
  for (const k of memoryCache.keys()) {
    if (keyOrPattern.test(k)) {
      memoryCache.delete(k);
    }
  }
  if (typeof window !== "undefined") {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(STORAGE_PREFIX) && keyOrPattern.test(k.slice(STORAGE_PREFIX.length))) {
          keysToRemove.push(k);
        }
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // Ignore
    }
  }
}

/**
 * Remembers a verified working sheet tab name so we don't probe 8 candidate names sequentially every time.
 */
export function getRememberedTab(sheetUrl: string, candidateGroupKey: string): string | undefined {
  const compositeKey = `${sheetUrl}::${candidateGroupKey}`;
  if (resolvedTabCache.has(compositeKey)) {
    return resolvedTabCache.get(compositeKey);
  }
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem("wt_tab_" + compositeKey);
      if (stored) {
        resolvedTabCache.set(compositeKey, stored);
        return stored;
      }
    } catch {
      // Ignore
    }
  }
  return undefined;
}

export function setRememberedTab(sheetUrl: string, candidateGroupKey: string, tabName: string) {
  const compositeKey = `${sheetUrl}::${candidateGroupKey}`;
  resolvedTabCache.set(compositeKey, tabName);
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem("wt_tab_" + compositeKey, tabName);
    } catch {
      // Ignore
    }
  }
}
