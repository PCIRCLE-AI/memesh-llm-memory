import { logger } from '../../utils/logger.js';
export class LRUCache {
    cache = new Map();
    config;
    stats;
    constructor(config = {}) {
        this.config = {
            maxSize: config.maxSize || 1000,
            defaultTTL: config.defaultTTL || 300000,
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
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            if (this.config.enableStats) {
                this.stats.misses++;
                this.updateHitRate();
            }
            return null;
        }
        if (entry.expiresAt < Date.now()) {
            this.cache.delete(key);
            if (this.config.enableStats) {
                this.stats.misses++;
                this.stats.size--;
                this.updateHitRate();
            }
            return null;
        }
        entry.hits++;
        if (this.config.enableStats) {
            this.stats.hits++;
            this.updateHitRate();
        }
        this.cache.delete(key);
        this.cache.set(key, entry);
        return entry.value;
    }
    set(key, value, ttl) {
        const expiresAt = Date.now() + (ttl || this.config.defaultTTL);
        if (this.cache.size >= this.config.maxSize && !this.cache.has(key)) {
            this.evictLRU();
        }
        const entry = {
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
    delete(key) {
        const deleted = this.cache.delete(key);
        if (deleted && this.config.enableStats) {
            this.stats.deletes++;
            this.stats.size--;
        }
        return deleted;
    }
    has(key) {
        const entry = this.cache.get(key);
        if (!entry)
            return false;
        if (entry.expiresAt < Date.now()) {
            this.cache.delete(key);
            return false;
        }
        return true;
    }
    clear() {
        this.cache.clear();
        if (this.config.enableStats) {
            this.stats.size = 0;
        }
        logger.info('Cache cleared');
    }
    getStats() {
        const totalHits = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.hits, 0);
        return {
            ...this.stats,
            size: this.cache.size,
            averageHits: this.cache.size > 0 ? totalHits / this.cache.size : 0,
        };
    }
    evictLRU() {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) {
            this.cache.delete(firstKey);
            if (this.config.enableStats) {
                this.stats.size--;
            }
            logger.debug('Cache entry evicted (LRU)', { key: firstKey });
        }
    }
    updateHitRate() {
        const total = this.stats.hits + this.stats.misses;
        this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
    }
    cleanup() {
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
export class CredentialCache {
    cache;
    constructor(config = {}) {
        this.cache = new LRUCache({
            maxSize: config.maxSize || 500,
            defaultTTL: config.defaultTTL || 60000,
            enableStats: config.enableStats,
        });
        logger.info('Credential cache initialized');
    }
    get(service, account) {
        const key = this.getKey(service, account);
        return this.cache.get(key);
    }
    set(credential, ttl) {
        const key = this.getKey(credential.service, credential.account);
        this.cache.set(key, credential, ttl);
    }
    invalidate(service, account) {
        const key = this.getKey(service, account);
        this.cache.delete(key);
        logger.debug('Credential cache invalidated', { service, account });
    }
    invalidateService(service) {
        let invalidatedCount = 0;
        const stats = this.cache.getStats();
        if (stats.size > 0) {
            this.cache.clear();
            invalidatedCount = stats.size;
        }
        logger.debug('Service credentials invalidated', { service, count: invalidatedCount });
        return invalidatedCount;
    }
    getStats() {
        return this.cache.getStats();
    }
    clear() {
        this.cache.clear();
    }
    getKey(service, account) {
        return `${service}:${account}`;
    }
}
export class DistributedCache {
    redisClient;
    config;
    fallbackCache;
    constructor(redisClient, config = {}) {
        this.redisClient = redisClient;
        this.config = {
            maxSize: config.maxSize || 1000,
            defaultTTL: config.defaultTTL || 300000,
            enableStats: config.enableStats !== false,
        };
        this.fallbackCache = new LRUCache(config);
        logger.info('Distributed cache initialized');
    }
    async get(key) {
        if (!this.redisClient) {
            return this.fallbackCache.get(key);
        }
        try {
            const value = await this.redisClient.get(`cache:${key}`);
            if (!value) {
                return null;
            }
            return JSON.parse(value);
        }
        catch (error) {
            logger.error('Redis cache get error, using fallback', {
                key,
                error: error.message,
            });
            return this.fallbackCache.get(key);
        }
    }
    async set(key, value, ttl) {
        if (!this.redisClient) {
            this.fallbackCache.set(key, value, ttl);
            return;
        }
        try {
            const serialized = JSON.stringify(value);
            const ttlMs = ttl || this.config.defaultTTL;
            await this.redisClient.set(`cache:${key}`, serialized, 'PX', ttlMs);
            this.fallbackCache.set(key, value, ttl);
        }
        catch (error) {
            logger.error('Redis cache set error, using fallback', {
                key,
                error: error.message,
            });
            this.fallbackCache.set(key, value, ttl);
        }
    }
    async delete(key) {
        if (!this.redisClient) {
            this.fallbackCache.delete(key);
            return;
        }
        try {
            await this.redisClient.del(`cache:${key}`);
            this.fallbackCache.delete(key);
        }
        catch (error) {
            logger.error('Redis cache delete error', {
                key,
                error: error.message,
            });
            this.fallbackCache.delete(key);
        }
    }
    async clear() {
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
        }
        catch (error) {
            logger.error('Redis cache clear error', { error: error.message });
            this.fallbackCache.clear();
        }
    }
    getStats() {
        return this.fallbackCache.getStats();
    }
}
//# sourceMappingURL=CacheLayer.js.map