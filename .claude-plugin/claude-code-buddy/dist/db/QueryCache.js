import { createHash } from 'crypto';
import { logger } from '../utils/logger.js';
export class QueryCache {
    cache;
    maxSize;
    defaultTTL;
    debug;
    hits = 0;
    misses = 0;
    cleanupInterval;
    constructor(options = {}) {
        this.maxSize = options.maxSize || 1000;
        this.defaultTTL = options.defaultTTL || 5 * 60 * 1000;
        this.debug = options.debug || false;
        this.cache = new Map();
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60 * 1000);
        if (this.debug) {
            logger.debug('[QueryCache] Initialized', {
                maxSize: this.maxSize,
                defaultTTL: this.defaultTTL,
            });
        }
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.misses++;
            if (this.debug) {
                logger.debug('[QueryCache] Miss', { key });
            }
            return undefined;
        }
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            this.misses++;
            if (this.debug) {
                logger.debug('[QueryCache] Expired', { key });
            }
            return undefined;
        }
        entry.lastAccessed = Date.now();
        this.hits++;
        if (this.debug) {
            logger.debug('[QueryCache] Hit', { key });
        }
        return entry.value;
    }
    set(key, value, ttl) {
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
    delete(key) {
        const deleted = this.cache.delete(key);
        if (this.debug && deleted) {
            logger.debug('[QueryCache] Delete', { key });
        }
        return deleted;
    }
    clear() {
        const prevSize = this.cache.size;
        this.cache.clear();
        this.hits = 0;
        this.misses = 0;
        if (this.debug) {
            logger.debug('[QueryCache] Clear', { entriesCleared: prevSize });
        }
    }
    invalidatePattern(pattern) {
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
    has(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return false;
        if (Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    getStats() {
        const totalAccesses = this.hits + this.misses;
        const hitRate = totalAccesses > 0 ? (this.hits / totalAccesses) * 100 : 0;
        let memoryUsage = 0;
        let oldestEntry = null;
        let newestEntry = null;
        for (const entry of this.cache.values()) {
            memoryUsage += entry.size;
            if (oldestEntry === null || entry.lastAccessed < oldestEntry) {
                oldestEntry = entry.lastAccessed;
            }
            if (newestEntry === null || entry.lastAccessed > newestEntry) {
                newestEntry = entry.lastAccessed;
            }
        }
        return {
            hits: this.hits,
            misses: this.misses,
            hitRate: Math.round(hitRate * 100) / 100,
            size: this.cache.size,
            maxSize: this.maxSize,
            memoryUsage,
            oldestEntry,
            newestEntry,
        };
    }
    get size() {
        return this.cache.size;
    }
    cleanup() {
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
    destroy() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = undefined;
        }
        this.clear();
        if (this.debug) {
            logger.debug('[QueryCache] Destroyed');
        }
    }
    static generateKey(query, params) {
        const serialized = JSON.stringify({ query, params: params || [] });
        return createHash('sha256').update(serialized).digest('hex').slice(0, 16);
    }
    evictLRU() {
        let lruKey = null;
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
    estimateSize(value) {
        try {
            const json = JSON.stringify(value);
            return json.length * 2;
        }
        catch {
            return 1024;
        }
    }
}
export class DatabaseQueryCache extends QueryCache {
    constructor(options = {}) {
        super({
            maxSize: options.maxSize || 1000,
            defaultTTL: options.defaultTTL || 5 * 60 * 1000,
            debug: options.debug || false,
        });
    }
    async cachedQuery(query, params, executor, ttl) {
        const key = QueryCache.generateKey(query, params);
        const cached = this.get(key);
        if (cached !== undefined) {
            return cached;
        }
        const result = await executor();
        this.set(key, result, ttl);
        return result;
    }
}
//# sourceMappingURL=QueryCache.js.map