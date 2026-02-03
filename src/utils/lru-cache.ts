/**
 * LRU Cache with optional persistence
 *
 * Features:
 * - Least Recently Used eviction policy
 * - Optional TTL (Time-to-Live)
 * - Optional disk persistence
 * - Thread-safe operations
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { logger } from './logger.js';

/**
 * Configuration options for LRU Cache
 *
 * @template V - Type of values stored in the cache
 */
export interface LRUCacheOptions<V> {
  /**
   * Maximum number of entries the cache can hold
   * When exceeded, least recently used entries are evicted
   */
  maxSize: number;

  /**
   * Optional time-to-live in milliseconds
   * Entries older than this are considered expired
   */
  ttl?: number;

  /**
   * Optional file path for persisting cache to disk
   * Cache is automatically saved on modifications and loaded on initialization
   */
  persistPath?: string;

  /**
   * Optional callback invoked when an entry is evicted
   * Useful for cleanup or logging
   *
   * @param key - The key being evicted
   * @param value - The value being evicted
   */
  onEvict?: (key: string, value: V) => void;
}

/**
 * Internal cache entry structure
 *
 * @template V - Type of the cached value
 * @internal
 */
interface CacheEntry<V> {
  /** The cached value */
  value: V;
  /** Timestamp when entry was created or last updated (ms since epoch) */
  timestamp: number;
  /** Number of times this entry has been accessed */
  accessCount: number;
}

/**
 * LRU (Least Recently Used) Cache implementation
 *
 * Features:
 * - Automatic eviction of least recently used entries when full
 * - Optional TTL (time-to-live) for automatic expiration
 * - Optional disk persistence for durability across restarts
 * - Performance statistics tracking (hits, misses, evictions)
 * - Type-safe generic implementation
 *
 * @template V - Type of values stored in the cache (defaults to unknown)
 *
 * @example
 * ```typescript
 * // Basic usage
 * const cache = new LRUCache<User>({ maxSize: 100 });
 * cache.set('user:123', { name: 'John', role: 'admin' });
 * const user = cache.get('user:123');
 *
 * // With TTL and persistence
 * const cache = new LRUCache<string>({
 *   maxSize: 1000,
 *   ttl: 60000, // 60 seconds
 *   persistPath: '/tmp/cache.json',
 *   onEvict: (key, value) => console.log(`Evicted ${key}`)
 * });
 *
 * // Monitor performance
 * const stats = cache.getStats();
 * console.log(`Hit rate: ${stats.hitRate.toFixed(1)}%`);
 * ```
 */
export class LRUCache<V = unknown> {
  private cache: Map<string, CacheEntry<V>>;
  private accessOrder: string[];
  private maxSize: number;
  private ttl?: number;
  private persistPath?: string;
  private onEvict?: (key: string, value: V) => void;

  // Statistics
  private hits = 0;
  private misses = 0;
  private evictions = 0;

  constructor(options: LRUCacheOptions<V>) {
    this.cache = new Map();
    this.accessOrder = [];
    this.maxSize = options.maxSize;
    this.ttl = options.ttl;
    this.persistPath = options.persistPath;
    this.onEvict = options.onEvict;

    // Load from disk if persistence enabled
    if (this.persistPath) {
      this.loadFromDisk();
    }
  }

  /**
   * Get value from cache
   *
   * Updates access order and increments access count.
   * Returns undefined if key doesn't exist or entry has expired.
   *
   * @param key - The cache key to retrieve
   * @returns The cached value, or undefined if not found or expired
   *
   * @example
   * ```typescript
   * const cache = new LRUCache<string>({ maxSize: 100 });
   * cache.set('user:123', 'John Doe');
   * const value = cache.get('user:123'); // Returns 'John Doe'
   * ```
   */
  get(key: string): V | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return undefined;
    }

    // Check if expired
    if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
      this.delete(key);
      this.misses++;
      return undefined;
    }

    // Update access order (move to end = most recently used)
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);

    // Update access count
    entry.accessCount++;
    entry.timestamp = Date.now();

    this.hits++;
    return entry.value;
  }

  /**
   * Set value in cache
   *
   * If key already exists, updates the value and moves it to most recently used.
   * If cache is full, evicts the least recently used entry.
   * Automatically persists to disk if persistPath was configured.
   *
   * @param key - The cache key
   * @param value - The value to cache
   *
   * @example
   * ```typescript
   * cache.set('user:123', { name: 'John', role: 'admin' });
   * ```
   */
  set(key: string, value: V): void {
    // Check if key already exists
    if (this.cache.has(key)) {
      // Update existing entry
      const entry = this.cache.get(key)!;
      entry.value = value;
      entry.timestamp = Date.now();

      // Move to end of access order
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      this.accessOrder.push(key);
    } else {
      // Add new entry
      this.cache.set(key, {
        value,
        timestamp: Date.now(),
        accessCount: 0,
      });
      this.accessOrder.push(key);

      // Evict LRU if over capacity
      if (this.cache.size > this.maxSize) {
        this.evictLRU();
      }
    }

    // Persist to disk if enabled
    if (this.persistPath) {
      this.saveToDisk();
    }
  }

  /**
   * Peek at a value without triggering TTL expiration or updating access order.
   *
   * Unlike get(), this method:
   * - Does NOT delete expired entries (caller can check timestamp)
   * - Does NOT update access order or access count
   * - Does NOT update the entry's timestamp
   *
   * This is useful when callers need to distinguish between "missing" and "expired"
   * entries without the side-effect of TTL-based deletion.
   *
   * @param key - The cache key to peek at
   * @returns The raw CacheEntry, or undefined if the key does not exist at all
   *
   * @example
   * ```typescript
   * const entry = cache.peek('token-abc');
   * if (!entry) {
   *   // Key never existed, was evicted, or was previously deleted
   * } else if (cache.isExpired(entry)) {
   *   // Key exists but is expired
   * } else {
   *   // Key exists and is valid
   * }
   * ```
   */
  peek(key: string): { value: V; timestamp: number } | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }
    return { value: entry.value, timestamp: entry.timestamp };
  }

  /**
   * Check whether an entry returned by peek() is expired according to this cache's TTL.
   *
   * @param entry - An entry object with a timestamp field (as returned by peek())
   * @returns true if TTL is configured and the entry has exceeded it, false otherwise
   */
  isExpired(entry: { timestamp: number }): boolean {
    if (!this.ttl) return false;
    return Date.now() - entry.timestamp > this.ttl;
  }

  /**
   * Check if key exists in cache
   *
   * Unlike get(), this method does not update access order or count.
   * Automatically checks for expiration if TTL is configured.
   *
   * @param key - The cache key to check
   * @returns true if key exists and is not expired, false otherwise
   *
   * @example
   * ```typescript
   * if (cache.has('user:123')) {
   *   console.log('User data is cached');
   * }
   * ```
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    // Check if expired
    if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete key from cache
   *
   * Removes the entry and updates persistence if enabled.
   *
   * @param key - The cache key to delete
   * @returns true if the key existed and was deleted, false otherwise
   *
   * @example
   * ```typescript
   * cache.delete('user:123');
   * ```
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    this.cache.delete(key);

    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }

    if (this.persistPath) {
      this.saveToDisk();
    }

    return true;
  }

  /**
   * Clear all entries from cache
   *
   * Removes all cached data and updates persistence if enabled.
   * Statistics are not reset - use resetStats() for that.
   *
   * @example
   * ```typescript
   * cache.clear(); // Remove all entries
   * ```
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];

    if (this.persistPath) {
      this.saveToDisk();
    }
  }

  /**
   * Get current number of entries in cache
   *
   * @returns Number of entries currently cached
   *
   * @example
   * ```typescript
   * console.log(`Cache has ${cache.size()} entries`);
   * ```
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all cache keys
   *
   * Returns keys in no particular order.
   * Use with caution on large caches as it creates a new array.
   *
   * @returns Array of all cache keys
   *
   * @example
   * ```typescript
   * const allKeys = cache.keys();
   * console.log('Cached keys:', allKeys);
   * ```
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache performance statistics
   *
   * Useful for monitoring cache effectiveness and tuning maxSize/TTL.
   *
   * @returns Statistics object containing:
   *   - size: Current number of entries
   *   - maxSize: Maximum capacity
   *   - hits: Number of successful get() calls
   *   - misses: Number of failed get() calls
   *   - evictions: Number of entries evicted due to capacity
   *   - hitRate: Percentage of successful gets (0-100)
   *   - averageAccessCount: Average number of accesses per entry
   *
   * @example
   * ```typescript
   * const stats = cache.getStats();
   * console.log(`Hit rate: ${stats.hitRate.toFixed(1)}%`);
   * if (stats.hitRate < 50) {
   *   console.warn('Low hit rate - consider increasing maxSize');
   * }
   * ```
   */
  getStats(): {
    size: number;
    maxSize: number;
    hits: number;
    misses: number;
    evictions: number;
    hitRate: number;
    averageAccessCount: number;
  } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? (this.hits / total) * 100 : 0;

    // Capture entry count from the iteration itself to avoid any TOCTOU
    // discrepancy between the loop and the division (e.g., if the cache were
    // cleared or modified by an eviction callback between the two operations).
    let totalAccessCount = 0;
    let entryCount = 0;
    for (const entry of this.cache.values()) {
      totalAccessCount += entry.accessCount;
      entryCount++;
    }
    const averageAccessCount = entryCount > 0
      ? totalAccessCount / entryCount
      : 0;

    return {
      // Use entryCount (derived from the iteration above) for consistency
      // with averageAccessCount, ensuring both reflect the same snapshot.
      size: entryCount,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate,
      averageAccessCount,
    };
  }

  /**
   * Reset performance statistics to zero
   *
   * Clears hits, misses, and evictions counters.
   * Does not affect cached data.
   *
   * @example
   * ```typescript
   * cache.resetStats(); // Start fresh statistics tracking
   * ```
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Remove all expired entries from cache
   *
   * Only has effect if TTL was configured.
   * Automatically called on load from disk.
   *
   * @returns Number of entries removed
   *
   * @example
   * ```typescript
   * const removed = cache.cleanupExpired();
   * console.log(`Cleaned up ${removed} expired entries`);
   * ```
   */
  cleanupExpired(): number {
    if (!this.ttl) return 0;

    const now = Date.now();

    // ✅ MAJOR-3: Collect expired keys first, then batch delete to avoid N disk writes
    const expiredKeys: string[] = [];
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        expiredKeys.push(key);
      }
    }

    if (expiredKeys.length === 0) {
      return 0;
    }

    // Delete entries without calling this.delete() which triggers saveToDisk each time
    for (const key of expiredKeys) {
      const entry = this.cache.get(key);

      // Call onEvict callback if configured
      if (entry && this.onEvict) {
        this.onEvict(key, entry.value);
      }

      // Remove from cache
      this.cache.delete(key);

      // Remove from accessOrder
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }

    // Save to disk only once after all deletions
    if (this.persistPath) {
      this.saveToDisk();
    }

    return expiredKeys.length;
  }

  /**
   * Evict least recently used entry
   *
   * Removes the first entry in the access order (oldest).
   * Calls onEvict callback if configured.
   *
   * @private
   * @internal
   */
  private evictLRU(): void {
    if (this.accessOrder.length === 0) return;

    // First entry is least recently used
    const lruKey = this.accessOrder[0];
    const entry = this.cache.get(lruKey);

    if (entry && this.onEvict) {
      this.onEvict(lruKey, entry.value);
    }

    this.cache.delete(lruKey);
    this.accessOrder.shift();
    this.evictions++;
  }

  /**
   * Save cache to disk
   *
   * Serializes cache data and statistics to JSON file.
   * Creates directory if it doesn't exist.
   * Silently logs errors without throwing.
   *
   * @private
   * @internal
   */
  private saveToDisk(): void {
    if (!this.persistPath) return;

    try {
      // Ensure directory exists
      const dir = dirname(this.persistPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }

      // Convert Map to serializable object
      const data = {
        cache: Array.from(this.cache.entries()),
        accessOrder: this.accessOrder,
        stats: {
          hits: this.hits,
          misses: this.misses,
          evictions: this.evictions,
        },
      };

      writeFileSync(this.persistPath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      logger.error('[LRUCache] Failed to save to disk:', error);
    }
  }

  /**
   * Load cache from disk
   *
   * Deserializes cache data from JSON file.
   * Automatically cleans up expired entries after loading.
   * Falls back to empty cache on errors.
   *
   * @private
   * @internal
   */
  private loadFromDisk(): void {
    if (!this.persistPath || !existsSync(this.persistPath)) {
      return;
    }

    try {
      const content = readFileSync(this.persistPath, 'utf-8');
      const data = JSON.parse(content);

      this.cache = new Map(data.cache);
      this.accessOrder = data.accessOrder || [];

      if (data.stats) {
        this.hits = data.stats.hits || 0;
        this.misses = data.stats.misses || 0;
        this.evictions = data.stats.evictions || 0;
      }

      // Cleanup expired entries
      if (this.ttl) {
        this.cleanupExpired();
      }
    } catch (error) {
      logger.error('[LRUCache] Failed to load from disk:', error);
      this.cache = new Map();
      this.accessOrder = [];
    }
  }
}
