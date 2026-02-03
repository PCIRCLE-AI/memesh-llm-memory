import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { logger } from './logger.js';
export class LRUCache {
    cache;
    accessOrder;
    maxSize;
    ttl;
    persistPath;
    onEvict;
    hits = 0;
    misses = 0;
    evictions = 0;
    constructor(options) {
        this.cache = new Map();
        this.accessOrder = [];
        this.maxSize = options.maxSize;
        this.ttl = options.ttl;
        this.persistPath = options.persistPath;
        this.onEvict = options.onEvict;
        if (this.persistPath) {
            this.loadFromDisk();
        }
    }
    get(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            this.misses++;
            return undefined;
        }
        if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
            this.delete(key);
            this.misses++;
            return undefined;
        }
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
        this.accessOrder.push(key);
        entry.accessCount++;
        entry.timestamp = Date.now();
        this.hits++;
        return entry.value;
    }
    set(key, value) {
        if (this.cache.has(key)) {
            const entry = this.cache.get(key);
            entry.value = value;
            entry.timestamp = Date.now();
            const index = this.accessOrder.indexOf(key);
            if (index > -1) {
                this.accessOrder.splice(index, 1);
            }
            this.accessOrder.push(key);
        }
        else {
            this.cache.set(key, {
                value,
                timestamp: Date.now(),
                accessCount: 0,
            });
            this.accessOrder.push(key);
            if (this.cache.size > this.maxSize) {
                this.evictLRU();
            }
        }
        if (this.persistPath) {
            this.saveToDisk();
        }
    }
    peek(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return undefined;
        }
        return { value: entry.value, timestamp: entry.timestamp };
    }
    isExpired(entry) {
        if (!this.ttl)
            return false;
        return Date.now() - entry.timestamp > this.ttl;
    }
    has(key) {
        const entry = this.cache.get(key);
        if (!entry) {
            return false;
        }
        if (this.ttl && Date.now() - entry.timestamp > this.ttl) {
            this.delete(key);
            return false;
        }
        return true;
    }
    delete(key) {
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
    clear() {
        this.cache.clear();
        this.accessOrder = [];
        if (this.persistPath) {
            this.saveToDisk();
        }
    }
    size() {
        return this.cache.size;
    }
    keys() {
        return Array.from(this.cache.keys());
    }
    getStats() {
        const total = this.hits + this.misses;
        const hitRate = total > 0 ? (this.hits / total) * 100 : 0;
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
            size: entryCount,
            maxSize: this.maxSize,
            hits: this.hits,
            misses: this.misses,
            evictions: this.evictions,
            hitRate,
            averageAccessCount,
        };
    }
    resetStats() {
        this.hits = 0;
        this.misses = 0;
        this.evictions = 0;
    }
    cleanupExpired() {
        if (!this.ttl)
            return 0;
        const now = Date.now();
        const expiredKeys = [];
        for (const [key, entry] of this.cache.entries()) {
            if (now - entry.timestamp > this.ttl) {
                expiredKeys.push(key);
            }
        }
        if (expiredKeys.length === 0) {
            return 0;
        }
        for (const key of expiredKeys) {
            const entry = this.cache.get(key);
            if (entry && this.onEvict) {
                this.onEvict(key, entry.value);
            }
            this.cache.delete(key);
            const index = this.accessOrder.indexOf(key);
            if (index > -1) {
                this.accessOrder.splice(index, 1);
            }
        }
        if (this.persistPath) {
            this.saveToDisk();
        }
        return expiredKeys.length;
    }
    evictLRU() {
        if (this.accessOrder.length === 0)
            return;
        const lruKey = this.accessOrder[0];
        const entry = this.cache.get(lruKey);
        if (entry && this.onEvict) {
            this.onEvict(lruKey, entry.value);
        }
        this.cache.delete(lruKey);
        this.accessOrder.shift();
        this.evictions++;
    }
    saveToDisk() {
        if (!this.persistPath)
            return;
        try {
            const dir = dirname(this.persistPath);
            if (!existsSync(dir)) {
                mkdirSync(dir, { recursive: true });
            }
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
        }
        catch (error) {
            logger.error('[LRUCache] Failed to save to disk:', error);
        }
    }
    loadFromDisk() {
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
            if (this.ttl) {
                this.cleanupExpired();
            }
        }
        catch (error) {
            logger.error('[LRUCache] Failed to load from disk:', error);
            this.cache = new Map();
            this.accessOrder = [];
        }
    }
}
//# sourceMappingURL=lru-cache.js.map