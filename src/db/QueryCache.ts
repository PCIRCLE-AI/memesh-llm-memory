/**
 * Query Result Cache - LRU Cache with TTL and Pattern Invalidation
 *
 * High-performance in-memory cache for frequently accessed database queries.
 * Reduces database load and improves response times with intelligent caching
 * strategies and automatic invalidation.
 *
 * Features:
 * - **LRU Eviction**: Least Recently Used items evicted when cache is full
 * - **Time-based TTL**: Configurable time-to-live for cache entries
 * - **Pattern Invalidation**: RegExp-based cache clearing for related queries
 * - **Statistics Tracking**: Hit rate, miss rate, size monitoring
 * - **Memory Efficient**: Configurable size limits with automatic cleanup
 * - **Type Safe**: Fully typed generic implementation
 *
 * Performance Characteristics:
 * - Get: O(1) average case
 * - Set: O(1) average case
 * - Delete: O(1) average case
 * - Pattern Invalidation: O(n) where n = cache size
 * - Memory: O(size * avgEntrySize)
 *
 * @example
 * ```typescript
 * import { QueryCache } from './QueryCache.js';
 *
 * // Create cache with 1000 entries, 5 minute TTL
 * const cache = new QueryCache<string, Entity[]>({
 *   maxSize: 1000,
 *   defaultTTL: 5 * 60 * 1000
 * });
 *
 * // Cache database query result
 * const cacheKey = 'entities:type:agent';
 * let entities = cache.get(cacheKey);
 *
 * if (!entities) {
 *   // Cache miss - query database
 *   entities = db.prepare('SELECT * FROM entities WHERE type = ?').all('agent');
 *   cache.set(cacheKey, entities);
 * }
 *
 * // Invalidate on mutation
 * db.prepare('UPDATE entities SET ...').run();
 * cache.invalidatePattern(/^entities:/);
 *
 * // Check statistics
 * const stats = cache.getStats();
 * console.log(`Hit rate: ${stats.hitRate}%`);
 * ```
 */

import { createHash } from 'crypto';
import { logger } from '../utils/logger.js';

/**
 * Cache configuration options
 */
export interface CacheOptions {
  /**
   * Maximum number of entries in cache
   * @default 1000
   */
  maxSize?: number;

  /**
   * Default time-to-live in milliseconds
   * @default 300000 (5 minutes)
   */
  defaultTTL?: number;

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean;
}

/**
 * Cache entry metadata
 */
interface CacheEntry<V> {
  value: V;
  expiresAt: number;
  lastAccessed: number;
  size: number; // Approximate memory size in bytes
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  size: number;
  maxSize: number;
  memoryUsage: number; // Approximate memory in bytes
  oldestEntry: number | null; // Timestamp
  newestEntry: number | null; // Timestamp
}

/**
 * LRU Cache with TTL and pattern invalidation
 *
 * Thread-safe (single-threaded Node.js), memory-efficient cache implementation
 * with comprehensive monitoring and automatic cleanup.
 */
export class QueryCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private maxSize: number;
  private defaultTTL: number;
  private debug: boolean;

  // Statistics
  private hits = 0;
  private misses = 0;

  // Cleanup interval
  private cleanupInterval?: NodeJS.Timeout;

  // ✅ FIX P1-16: Track consecutive cleanup errors for escalation
  private cleanupErrorCount: number = 0;
  private readonly MAX_CONSECUTIVE_CLEANUP_ERRORS = 5;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 5 * 60 * 1000; // 5 minutes
    this.debug = options.debug || false;

    this.cache = new Map();

    if (this.debug) {
      logger.debug('[QueryCache] Initialized', {
        maxSize: this.maxSize,
        defaultTTL: this.defaultTTL,
      });
    }

    // ✅ FIX: Timer creation is the LAST step in constructor so that if any
    // initialization above throws, no orphan interval is left running.
    // ✅ FIX BUG-4: Wrap cleanup in try-catch to prevent interval breakage
    // ✅ FIX P1-16: Track consecutive errors and escalate on persistent failures
    // Schedule periodic cleanup (every minute)
    this.cleanupInterval = setInterval(() => {
      try {
        this.cleanup();
        // Reset error count on successful cleanup
        this.cleanupErrorCount = 0;
      } catch (error) {
        this.cleanupErrorCount++;

        logger.error('[QueryCache] Cleanup error:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          consecutiveErrors: this.cleanupErrorCount,
        });

        // ✅ FIX P1-16: Escalate after consecutive failures
        if (this.cleanupErrorCount >= this.MAX_CONSECUTIVE_CLEANUP_ERRORS) {
          logger.error(
            `[QueryCache] Cleanup failed ${this.cleanupErrorCount} times consecutively - destroying cache`,
            {
              maxErrors: this.MAX_CONSECUTIVE_CLEANUP_ERRORS,
              cacheSize: this.cache.size,
            }
          );

          // Clear the interval to prevent further cleanup attempts
          if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
          }

          // Destroy the cache to prevent further issues
          this.destroy();
        }
      }
    }, 60 * 1000);

    // ✅ FIX: Call unref() so this timer does not prevent Node.js from exiting
    // when the event loop would otherwise be empty (e.g., after tests or CLI tools).
    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Get value from cache
   *
   * @param key - Cache key
   * @returns Cached value or undefined if not found/expired
   */
  get(key: K): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      if (this.debug) {
        logger.debug('[QueryCache] Miss', { key });
      }
      return undefined;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      if (this.debug) {
        logger.debug('[QueryCache] Expired', { key });
      }
      return undefined;
    }

    // Update last accessed time (LRU tracking)
    entry.lastAccessed = Date.now();
    this.hits++;

    if (this.debug) {
      logger.debug('[QueryCache] Hit', { key });
    }

    return entry.value;
  }

  /**
   * Set value in cache
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttl - Optional custom TTL (overrides default)
   */
  set(key: K, value: V, ttl?: number): void {
    // Evict LRU entry if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const expiresAt = Date.now() + (ttl || this.defaultTTL);
    const size = this.estimateSize(value);

    this.cache.set(key, {
      value,
      expiresAt,
      lastAccessed: Date.now(),
      size,
    });

    if (this.debug) {
      logger.debug('[QueryCache] Set', { key, ttl: ttl || this.defaultTTL, size });
    }
  }

  /**
   * Delete specific entry from cache
   *
   * @param key - Cache key to delete
   * @returns True if entry was deleted, false if not found
   */
  delete(key: K): boolean {
    const deleted = this.cache.delete(key);

    if (this.debug && deleted) {
      logger.debug('[QueryCache] Delete', { key });
    }

    return deleted;
  }

  /**
   * Clear all entries from cache
   */
  clear(): void {
    const prevSize = this.cache.size;
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;

    if (this.debug) {
      logger.debug('[QueryCache] Clear', { entriesCleared: prevSize });
    }
  }

  /**
   * Invalidate cache entries matching pattern
   *
   * Useful for invalidating all related queries when data changes.
   *
   * @param pattern - RegExp pattern to match keys
   * @returns Number of entries invalidated
   *
   * @example
   * ```typescript
   * // Invalidate all entity queries
   * cache.invalidatePattern(/^entities:/);
   *
   * // Invalidate specific type
   * cache.invalidatePattern(/^entities:type:agent/);
   * ```
   */
  invalidatePattern(pattern: RegExp): number {
    let count = 0;

    for (const key of this.cache.keys()) {
      const keyStr = String(key);
      if (pattern.test(keyStr)) {
        this.cache.delete(key);
        count++;
      }
    }

    if (this.debug) {
      logger.debug('[QueryCache] Pattern invalidation', {
        pattern: pattern.source,
        invalidated: count,
      });
    }

    return count;
  }

  /**
   * Check if key exists in cache (without updating LRU)
   *
   * @param key - Cache key to check
   * @returns True if key exists and not expired
   */
  has(key: K): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get cache statistics
   *
   * @returns Current cache statistics
   */
  getStats(): CacheStats {
    const totalAccesses = this.hits + this.misses;
    const hitRate = totalAccesses > 0 ? (this.hits / totalAccesses) * 100 : 0;

    const entries = Array.from(this.cache.values());
    const memoryUsage = entries.reduce((sum, entry) => sum + entry.size, 0);
    const accessTimes = entries.map(entry => entry.lastAccessed);

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage,
      oldestEntry: accessTimes.length > 0 ? Math.min(...accessTimes) : null,
      newestEntry: accessTimes.length > 0 ? Math.max(...accessTimes) : null,
    };
  }

  /**
   * Get current cache size
   *
   * @returns Number of entries in cache
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Cleanup expired entries
   *
   * Automatically called periodically, but can be called manually.
   *
   * @returns Number of expired entries removed
   */
  cleanup(): number {
    const now = Date.now();
    let removed = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        removed++;
      }
    }

    if (this.debug && removed > 0) {
      logger.debug('[QueryCache] Cleanup', { removed });
    }

    return removed;
  }

  /**
   * Destroy cache and cleanup resources
   *
   * Call when cache is no longer needed to prevent memory leaks.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }

    this.clear();

    if (this.debug) {
      logger.debug('[QueryCache] Destroyed');
    }
  }

  /**
   * Dispose cache and cleanup resources
   *
   * ✅ FIX BUG-4: Alias for destroy() to match ResourceMonitor interface
   * Call when cache is no longer needed to prevent memory leaks.
   */
  dispose(): void {
    this.destroy();
  }

  /**
   * Generate cache key from query and parameters
   *
   * Creates a consistent, hashable key from query string and parameters.
   *
   * @param query - SQL query or identifier
   * @param params - Query parameters
   * @returns Cache key (hash of query + params)
   *
   * @example
   * ```typescript
   * const key = QueryCache.generateKey(
   *   'SELECT * FROM entities WHERE type = ?',
   *   ['agent']
   * );
   * ```
   */
  static generateKey(query: string, params?: unknown[]): string {
    const serialized = JSON.stringify({ query, params: params || [] });
    return createHash('sha256').update(serialized).digest('hex').slice(0, 16);
  }

  /**
   * Evict least recently used entry
   *
   * Called automatically when cache is full.
   */
  private evictLRU(): void {
    let lruKey: K | null = null;
    let lruTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey !== null) {
      this.cache.delete(lruKey);

      if (this.debug) {
        logger.debug('[QueryCache] LRU eviction', { key: lruKey });
      }
    }
  }

  /**
   * Estimate memory size of value
   *
   * Rough estimation for memory usage tracking.
   *
   * @param value - Value to estimate size of
   * @returns Approximate size in bytes
   */
  private estimateSize(value: V): number {
    try {
      // Rough estimation: JSON string length
      const json = JSON.stringify(value);
      return json.length * 2; // UTF-16 characters = 2 bytes each
    } catch {
      // If value can't be serialized, use a default size
      return 1024; // 1KB default
    }
  }
}

/**
 * Specialized cache for database queries
 *
 * Convenience wrapper with pre-configured settings for database query caching.
 */
export class DatabaseQueryCache<V = unknown> extends QueryCache<string, V> {
  constructor(options: Partial<CacheOptions> = {}) {
    super({
      maxSize: options.maxSize || 1000,
      defaultTTL: options.defaultTTL || 5 * 60 * 1000, // 5 minutes
      debug: options.debug || false,
    });
  }

  /**
   * Cache database query result
   *
   * @param query - SQL query
   * @param params - Query parameters
   * @param executor - Function that executes the query
   * @param ttl - Optional custom TTL
   * @returns Query result (cached or fresh)
   */
  async cachedQuery<T extends V>(
    query: string,
    params: unknown[],
    executor: () => T | Promise<T>,
    ttl?: number
  ): Promise<T> {
    const key = QueryCache.generateKey(query, params);
    const cached = this.get(key) as T | undefined;

    if (cached !== undefined) {
      return cached;
    }

    // Execute query
    const result = await executor();

    // Cache result
    this.set(key, result as V, ttl);

    return result;
  }
}
