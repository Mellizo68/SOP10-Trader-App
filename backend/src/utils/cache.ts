import logger from './logger.js';

/**
 * Cache Entry with TTL management
 */
interface CacheEntry<T> {
  data: T;
  expiry: number; // Timestamp when entry expires
  createdAt: number;
  hits: number;
}

/**
 * Cache Statistics for monitoring
 */
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  avgHitRate: number;
  entries: Map<string, { ttl: number; createdAt: number; hits: number }>;
}

/**
 * In-Memory Cache Manager with TTL support
 * Optimized for market data caching (5-minute default TTL)
 *
 * Usage:
 *   const data = cache.get('market:SPY:gex')
 *   if (!data) {
 *     const freshData = await fetchFromAPI()
 *     cache.set('market:SPY:gex', freshData, 300) // 5 min TTL
 *   }
 */
export class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private stats = {
    hits: 0,
    misses: 0,
  };

  /**
   * Get value from cache if not expired
   * @param key - Cache key
   * @param ignoreTTL - If true, returns stale data (used for fallback on API errors)
   */
  get<T>(key: string, ignoreTTL: boolean = false): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if entry has expired (unless ignoreTTL is set)
    if (!ignoreTTL && entry.expiry < Date.now()) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hit count and return
    entry.hits++;
    this.stats.hits++;
    logger.debug('Cache GET', {
      key,
      stale: ignoreTTL && entry.expiry < Date.now(),
    });
    return entry.data as T;
  }

  /**
   * Set value in cache with TTL
   * @param key - Cache key (recommended format: "domain:symbol:type")
   * @param data - Data to cache
   * @param ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
   */
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    const now = Date.now();
    const expiry = now + ttlSeconds * 1000;

    this.cache.set(key, {
      data,
      expiry,
      createdAt: now,
      hits: 0,
    });

    // Log cache operations in development
    if (process.env.NODE_ENV !== 'production') {
      logger.debug('Cache SET', {
        key,
        ttlSeconds,
        cacheSize: this.cache.size,
      });
    }
  }

  /**
   * Invalidate cache entries matching a pattern
   * @param pattern - Pattern to match (glob-style or exact)
   */
  invalidate(pattern: string): number {
    let invalidated = 0;

    if (pattern.includes('*')) {
      // Glob pattern matching
      const regex = new RegExp(
        '^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + '$'
      );

      for (const key of this.cache.keys()) {
        if (regex.test(key)) {
          this.cache.delete(key);
          invalidated++;
        }
      }
    } else {
      // Exact match
      if (this.cache.has(pattern)) {
        this.cache.delete(pattern);
        invalidated++;
      }
    }

    if (invalidated > 0) {
      logger.info('Cache invalidation', {
        pattern,
        invalidated,
        remainingSize: this.cache.size,
      });
    }

    return invalidated;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.stats = { hits: 0, misses: 0 };

    logger.info('Cache cleared', { clearedSize: size });
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = new Map<string, { ttl: number; createdAt: number; hits: number }>();

    for (const [key, entry] of this.cache.entries()) {
      const now = Date.now();
      const ttl = Math.max(0, Math.ceil((entry.expiry - now) / 1000));

      if (ttl > 0) {
        // Only include non-expired entries
        entries.set(key, {
          ttl,
          createdAt: entry.createdAt,
          hits: entry.hits,
        });
      }
    }

    const total = this.stats.hits + this.stats.misses;
    const avgHitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: entries.size,
      avgHitRate: Math.round(avgHitRate * 100) / 100,
      entries,
    };
  }

  /**
   * Get cache size
   */
  getSize(): number {
    return this.cache.size;
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (entry.expiry < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clean up expired entries (garbage collection)
   * Call periodically to free up memory
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cache cleanup', {
        cleaned,
        remainingSize: this.cache.size,
      });
    }

    return cleaned;
  }
}

/**
 * Global cache instance
 * Configure TTL values based on your data freshness requirements:
 * - GEX data: 5 minutes (market data changes slowly)
 * - Greeks: 5 minutes (implied volatility stable)
 * - Walls/Volume: 5 minutes (aggregate statistics)
 * - Stats: 1 hour (historical data)
 */
export const cache = new CacheManager();

/**
 * Set up periodic garbage collection
 * Runs every 30 seconds to clean expired entries
 */
if (process.env.NODE_ENV !== 'development') {
  setInterval(() => {
    const cleaned = cache.cleanup();
    if (cleaned > 0) {
      logger.debug('Automatic cache cleanup', { cleaned });
    }
  }, 30000);
}

export default cache;
