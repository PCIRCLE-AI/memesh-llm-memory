/**
 * Cache Layer - Performance Optimization
 *
 * Provides caching with:
 * - In-memory LRU cache
 * - Redis distributed cache
 * - Cache invalidation strategies
 * - TTL and size limits
 * - Cache statistics
 */

import { logger } from '../../utils/logger.js';
import type { Credential } from '../types.js';

/**
 * Cache configuration
 */
export interface CacheConfig {
  /**
   * Maximum cache entries
   */
  maxSize?: number;

  /**
   * Default TTL in milliseconds
   */
  defaultTTL?: number;

  /**
   * Enable cache statistics
   */
  enableStats?: boolean;
}

/**
 * Cache entry
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  hits: number;
  createdAt: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
  averageHits: number;
}

/**
 * In-Memory LRU Cache
 */
export class LRUCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private config: Required<CacheConfig>;
  private stats: CacheStats;

  constructor(config: CacheConfig = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      defaultTTL: config.defaultTTL || 300000, // 5 minutes
      enableStats: config.enableStats !== false,
    };

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0,
      hitRate: 0,
      averageHits: 0,
    };

    logger.info('LRU cache initialized', {
      maxSize: this.config.maxSize,
      defaultTTL: this.config.defaultTTL,
    });
  }

  /**
   * Get value from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      if (this.config.enableStats) {
        this.stats.misses++;
        this.updateHitRate();
      }
      return null;
    }

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      if (this.config.enableStats) {
        this.stats.misses++;
        this.stats.size--;
        this.updateHitRate();
      }
      return null;
    }

    // Update hits
    entry.hits++;

    if (this.config.enableStats) {
      this.stats.hits++;
      this.updateHitRate();
    }

    // Move to end (LRU)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.config.defaultTTL);

    // Evict if at capacity
    if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      expiresAt,
      hits: 0,
      createdAt: Date.now(),
    };

    this.cache.set(key, entry);

    if (this.config.enableStats) {
      this.stats.sets++;
      if (!this.cache.has(key)) {
        this.stats.size++;
      }
    }

    logger.debug('Cache set', { key, ttl: ttl || this.config.defaultTTL });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);

    if (deleted && this.config.enableStats) {
      this.stats.deletes++;
      this.stats.size--;
    }

    return deleted;
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check expiration
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    if (this.config.enableStats) {
      this.stats.size = 0;
    }
    logger.info('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalHits = Array.from(this.cache.values()).reduce(
      (sum, entry) => sum + entry.hits,
      0
    );

    return {
      ...this.stats,
      size: this.cache.size,
      averageHits: this.cache.size > 0 ? totalHits / this.cache.size : 0,
    };
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
      if (this.config.enableStats) {
        this.stats.size--;
      }
      logger.debug('Cache entry evicted (LRU)', { key: firstKey });
    }
  }

  /**
   * Update hit rate
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < now) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0 && this.config.enableStats) {
      this.stats.size -= cleanedCount;
    }

    logger.debug('Cache cleanup', { cleanedCount });

    return cleanedCount;
  }
}

/**
 * Credential Cache (specialized for credentials)
 */
export class CredentialCache {
  private cache: LRUCache<Credential>;

  constructor(config: CacheConfig = {}) {
    this.cache = new LRUCache<Credential>({
      maxSize: config.maxSize || 500,
      defaultTTL: config.defaultTTL || 60000, // 1 minute default for credentials
      enableStats: config.enableStats,
    });

    logger.info('Credential cache initialized');
  }

  /**
   * Get cached credential
   */
  get(service: string, account: string): Credential | null {
    const key = this.getKey(service, account);
    return this.cache.get(key);
  }

  /**
   * Cache credential
   */
  set(credential: Credential, ttl?: number): void {
    const key = this.getKey(credential.service, credential.account);
    this.cache.set(key, credential, ttl);
  }

  /**
   * Invalidate cached credential
   */
  invalidate(service: string, account: string): void {
    const key = this.getKey(service, account);
    this.cache.delete(key);
    logger.debug('Credential cache invalidated', { service, account });
  }

  /**
   * Invalidate all credentials for a service
   */
  invalidateService(service: string): number {
    let invalidatedCount = 0;

    // Get all keys (inefficient, but works for small caches)
    const stats = this.cache.getStats();
    if (stats.size > 0) {
      // Clear entire cache for simplicity
      // In production, use a more efficient approach with key prefixes
      this.cache.clear();
      invalidatedCount = stats.size;
    }

    logger.debug('Service credentials invalidated', { service, count: invalidatedCount });

    return invalidatedCount;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Clear all cached credentials
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Generate cache key
   */
  private getKey(service: string, account: string): string {
    return `${service}:${account}`;
  }
}

/**
 * Distributed Cache (Redis-backed)
 */
export class DistributedCache<T = any> {
  private redisClient: any;
  private config: Required<CacheConfig>;
  private fallbackCache: LRUCache<T>;

  constructor(redisClient: any, config: CacheConfig = {}) {
    this.redisClient = redisClient;
    this.config = {
      maxSize: config.maxSize || 1000,
      defaultTTL: config.defaultTTL || 300000,
      enableStats: config.enableStats !== false,
    };

    // Fallback to in-memory if Redis fails
    this.fallbackCache = new LRUCache<T>(config);

    logger.info('Distributed cache initialized');
  }

  /**
   * Get value from Redis cache
   */
  async get(key: string): Promise<T | null> {
    if (!this.redisClient) {
      return this.fallbackCache.get(key);
    }

    try {
      const value = await this.redisClient.get(`cache:${key}`);

      if (!value) {
        return null;
      }

      return JSON.parse(value) as T;
    } catch (error: any) {
      logger.error('Redis cache get error, using fallback', {
        key,
        error: error.message,
      });

      return this.fallbackCache.get(key);
    }
  }

  /**
   * Set value in Redis cache
   */
  async set(key: string, value: T, ttl?: number): Promise<void> {
    if (!this.redisClient) {
      this.fallbackCache.set(key, value, ttl);
      return;
    }

    try {
      const serialized = JSON.stringify(value);
      const ttlMs = ttl || this.config.defaultTTL;

      await this.redisClient.set(`cache:${key}`, serialized, 'PX', ttlMs);

      // Also set in fallback for faster local access
      this.fallbackCache.set(key, value, ttl);
    } catch (error: any) {
      logger.error('Redis cache set error, using fallback', {
        key,
        error: error.message,
      });

      this.fallbackCache.set(key, value, ttl);
    }
  }

  /**
   * Delete value from Redis cache
   */
  async delete(key: string): Promise<void> {
    if (!this.redisClient) {
      this.fallbackCache.delete(key);
      return;
    }

    try {
      await this.redisClient.del(`cache:${key}`);
      this.fallbackCache.delete(key);
    } catch (error: any) {
      logger.error('Redis cache delete error', {
        key,
        error: error.message,
      });

      this.fallbackCache.delete(key);
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    if (!this.redisClient) {
      this.fallbackCache.clear();
      return;
    }

    try {
      const keys = await this.redisClient.keys('cache:*');
      if (keys.length > 0) {
        await this.redisClient.del(...keys);
      }
      this.fallbackCache.clear();
    } catch (error: any) {
      logger.error('Redis cache clear error', { error: error.message });
      this.fallbackCache.clear();
    }
  }

  /**
   * Get statistics (from fallback cache)
   */
  getStats(): CacheStats {
    return this.fallbackCache.getStats();
  }
}
