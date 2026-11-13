/**
 * Browser-side caching using IndexedDB with in-memory fallback for offline capability and performance.
 * Zero-cost solution for solo dev project - no external services required.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  key: string;
}

const MAX_MEMORY_ENTRIES = 250;
const MAX_IDB_ENTRIES = 1000;

class IndexedDBCache {
  private db: IDBDatabase | null = null;
  private dbName = 'newsstudio-cache';
  private dbVersion = 1;
  private storeName = 'cache';
  private initPromise: Promise<void> | null = null;
  private isAvailable: boolean | null = null;
  private memoryCache = new Map<string, CacheEntry<unknown>>();

  /**
   * Initialize IndexedDB database with seamless in-memory fallback
   */
  private async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      this.isAvailable = false;
      this.initPromise = Promise.resolve();
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(this.dbName, this.dbVersion);

        request.onerror = () => {
          console.warn('[IndexedDB Cache] IndexedDB unavailable (e.g. private browsing or security restrictions). Falling back to in-memory cache.');
          this.isAvailable = false;
          resolve();
        };

        request.onsuccess = () => {
          this.db = request.result;
          this.isAvailable = true;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          
          if (!db.objectStoreNames.contains(this.storeName)) {
            const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('ttl', 'ttl', { unique: false });
          }
        };
      } catch (err) {
        console.warn('[IndexedDB Cache] Exception opening IndexedDB. Using in-memory fallback.', err);
        this.isAvailable = false;
        resolve();
      }
    });

    return this.initPromise;
  }

  /**
   * Store data in cache with TTL and LRU memory cap
   */
  async set<T>(key: string, data: T, ttl: number = 15 * 60 * 1000): Promise<void> {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      key,
    };

    // Evict oldest entry from memory cache if capacity reached
    if (this.memoryCache.size >= MAX_MEMORY_ENTRIES) {
      const oldestKey = this.memoryCache.keys().next().value;
      if (oldestKey) {
        this.memoryCache.delete(oldestKey);
      }
    }

    // Refresh LRU position in memory cache
    this.memoryCache.delete(key);
    this.memoryCache.set(key, entry as CacheEntry<unknown>);

    try {
      await this.init();
      if (!this.isAvailable || !this.db) {
        return;
      }

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.put(entry);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('[IndexedDB Cache] Failed to persist entry to IndexedDB, stored in memory:', error);
    }
  }

  /**
   * Retrieve data from cache if not expired, refreshing LRU position
   */
  async get<T>(key: string): Promise<T | null> {
    const now = Date.now();

    // Check memory cache first
    const memEntry = this.memoryCache.get(key) as CacheEntry<T> | undefined;
    if (memEntry) {
      if (now - memEntry.timestamp > memEntry.ttl) {
        this.memoryCache.delete(key);
      } else {
        // Refresh LRU position
        this.memoryCache.delete(key);
        this.memoryCache.set(key, memEntry as CacheEntry<unknown>);
        return memEntry.data;
      }
    }

    try {
      await this.init();
      if (!this.isAvailable || !this.db) {
        return null;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.get(key);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const entry = request.result as CacheEntry<T> | undefined;
          
          if (!entry) {
            resolve(null);
            return;
          }

          if (now - entry.timestamp > entry.ttl) {
            this.delete(key).catch(() => {});
            resolve(null);
            return;
          }

          // Populate memory cache with LRU refresh
          if (this.memoryCache.size >= MAX_MEMORY_ENTRIES) {
            const oldestKey = this.memoryCache.keys().next().value;
            if (oldestKey) {
              this.memoryCache.delete(oldestKey);
            }
          }
          this.memoryCache.delete(key);
          this.memoryCache.set(key, entry as CacheEntry<unknown>);
          resolve(entry.data);
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('[IndexedDB Cache] Failed to read from IndexedDB:', error);
      return null;
    }
  }

  /**
   * Delete specific entry from cache
   */
  async delete(key: string): Promise<void> {
    this.memoryCache.delete(key);

    try {
      await this.init();
      if (!this.isAvailable || !this.db) return;

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.delete(key);

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('[IndexedDB Cache] Failed to delete cache entry:', error);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    this.memoryCache.clear();

    try {
      await this.init();
      if (!this.isAvailable || !this.db) return;

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('[IndexedDB Cache] Failed to clear cache:', error);
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
      }
    }

    try {
      await this.init();
      if (!this.isAvailable || !this.db) return;

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.openCursor();

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;

          if (cursor) {
            const key = cursor.key as string;
            if (key.includes(pattern)) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('[IndexedDB Cache] Failed to invalidate pattern:', error);
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
      }
    }

    try {
      await this.init();
      if (!this.isAvailable || !this.db) return;

      const transaction = this.db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');

      // Cursor opens in ascending timestamp order (oldest first)
      const request = index.openCursor();
      let liveRecords = 0;

      return new Promise((resolve, reject) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          
          if (cursor) {
            const entry = cursor.value as CacheEntry<unknown>;
            const isExpired = now - entry.timestamp > entry.ttl;
            liveRecords++;

            if (isExpired || liveRecords > MAX_IDB_ENTRIES) {
              cursor.delete();
            }
            cursor.continue();
          } else {
            resolve();
          }
        };

        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('[IndexedDB Cache] Failed to cleanup cache:', error);
    }
  }

  /**
   * Get cache size estimate
   */
  async getSize(): Promise<number> {
    try {
      await this.init();
      if (!this.isAvailable || !this.db) {
        return this.memoryCache.size;
      }

      const transaction = this.db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const request = store.count();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.warn('[IndexedDB Cache] Failed to get cache size:', error);
      return this.memoryCache.size;
    }
  }
}

// Export singleton instance
export const cache = new IndexedDBCache();

// Single-flight in-flight request coalescing map
const inFlightRequests = new Map<string, Promise<unknown>>();

/**
 * Helper function to cache API responses with single-flight request coalescing.
 * Concurrent requests for the same key share the exact same Promise.
 * 
 * @param key - Cache key
 * @param fetcher - Function to fetch data if cache miss
 * @param ttl - Time to live in milliseconds (default 15 minutes)
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 15 * 60 * 1000
): Promise<T> {
  // Try to get from cache first
  const cached = await cache.get<T>(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }

  // Deduplicate concurrent in-flight requests for the same key
  const inFlight = inFlightRequests.get(key) as Promise<T> | undefined;
  if (inFlight) {
    return inFlight;
  }

  const fetchPromise = (async () => {
    try {
      const data = await fetcher();
      await cache.set(key, data, ttl);
      return data;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, fetchPromise as Promise<unknown>);
  return fetchPromise;
}

/**
 * Generate cache key from URL and parameters
 */
export function generateCacheKey(endpoint: string, params: Record<string, unknown> = {}): string {
  const paramString = Object.keys(params)
    .sort()
    .map(key => `${key}=${String(params[key])}`)
    .join('&');
  
  return paramString ? `${endpoint}?${paramString}` : endpoint;
}

/**
 * Invalidate cache entries matching a pattern
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  return cache.invalidatePattern(pattern);
}