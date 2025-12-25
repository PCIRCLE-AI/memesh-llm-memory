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

export interface LRUCacheOptions<V> {
  maxSize: number;
  ttl?: number;                    // Time-to-live in milliseconds
  persistPath?: string;             // Path to persist cache to disk
  onEvict?: (key: string, value: V) => void;
}

interface CacheEntry<V> {
  value: V;
  timestamp: number;
  accessCount: number;
}

export class LRUCache<V = any> {
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
   * Check if key exists (without updating access order)
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
   * Clear all entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];

    if (this.persistPath) {
      this.saveToDisk();
    }
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get statistics
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

    let totalAccessCount = 0;
    for (const entry of this.cache.values()) {
      totalAccessCount += entry.accessCount;
    }
    const averageAccessCount = this.cache.size > 0
      ? totalAccessCount / this.cache.size
      : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      evictions: this.evictions,
      hitRate,
      averageAccessCount,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
    this.evictions = 0;
  }

  /**
   * Cleanup expired entries
   */
  cleanupExpired(): number {
    if (!this.ttl) return 0;

    let cleaned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Evict least recently used entry
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
      console.error('[LRUCache] Failed to save to disk:', error);
    }
  }

  /**
   * Load cache from disk
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
      console.error('[LRUCache] Failed to load from disk:', error);
      this.cache = new Map();
      this.accessOrder = [];
    }
  }
}
