import { logger } from '../../utils/logger.js';
export class RateLimiter {
    store = new Map();
    config;
    cleanupInterval = null;
    constructor(config) {
        this.config = {
            message: 'Rate limit exceeded',
            ...config,
        };
        this.startCleanup();
        logger.info('Rate limiter initialized', {
            maxRequests: config.maxRequests,
            windowMs: config.windowMs,
        });
    }
    async checkLimit(tenantId, endpoint = 'default') {
        if (this.config.skip && this.config.skip(tenantId, endpoint)) {
            return {
                allowed: true,
                remaining: this.config.maxRequests,
                limit: this.config.maxRequests,
                resetAt: Date.now() + this.config.windowMs,
            };
        }
        const key = this.getKey(tenantId, endpoint);
        const now = Date.now();
        const resetAt = now + this.config.windowMs;
        let entry = this.store.get(key);
        if (!entry || entry.resetAt < now) {
            entry = {
                count: 0,
                resetAt,
            };
            this.store.set(key, entry);
        }
        entry.count++;
        const allowed = entry.count <= this.config.maxRequests;
        const remaining = Math.max(0, this.config.maxRequests - entry.count);
        const retryAfter = allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000);
        if (!allowed) {
            logger.warn('Rate limit exceeded', {
                tenantId,
                endpoint,
                count: entry.count,
                limit: this.config.maxRequests,
                resetAt: new Date(entry.resetAt).toISOString(),
            });
        }
        return {
            allowed,
            remaining,
            limit: this.config.maxRequests,
            resetAt: entry.resetAt,
            retryAfter,
        };
    }
    reset(tenantId, endpoint = 'default') {
        const key = this.getKey(tenantId, endpoint);
        this.store.delete(key);
        logger.debug('Rate limit reset', { tenantId, endpoint });
    }
    getUsage(tenantId, endpoint = 'default') {
        const key = this.getKey(tenantId, endpoint);
        const entry = this.store.get(key);
        const now = Date.now();
        if (!entry || entry.resetAt < now) {
            return {
                count: 0,
                limit: this.config.maxRequests,
                resetAt: null,
            };
        }
        return {
            count: entry.count,
            limit: this.config.maxRequests,
            resetAt: entry.resetAt,
        };
    }
    getHeaders(result) {
        const headers = {
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
        };
        if (result.retryAfter !== undefined) {
            headers['Retry-After'] = result.retryAfter.toString();
        }
        return headers;
    }
    startCleanup() {
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 60000);
    }
    cleanup() {
        const now = Date.now();
        let cleanedCount = 0;
        for (const [key, entry] of this.store.entries()) {
            if (entry.resetAt < now) {
                this.store.delete(key);
                cleanedCount++;
            }
        }
        if (cleanedCount > 0) {
            logger.debug('Rate limit entries cleaned up', { count: cleanedCount });
        }
    }
    getKey(tenantId, endpoint) {
        return `${tenantId}:${endpoint}`;
    }
    dispose() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        this.store.clear();
        logger.info('Rate limiter disposed');
    }
}
export class DistributedRateLimiter extends RateLimiter {
    redisClient;
    constructor(config, redisClient) {
        super(config);
        this.redisClient = redisClient;
        logger.info('Distributed rate limiter initialized');
    }
    async checkLimit(tenantId, endpoint = 'default') {
        if (!this.redisClient) {
            return super.checkLimit(tenantId, endpoint);
        }
        const key = `ratelimit:${tenantId}:${endpoint}`;
        const now = Date.now();
        const resetAt = now + (this.config.windowMs || 60000);
        try {
            const count = await this.redisClient.incr(key);
            if (count === 1) {
                await this.redisClient.pexpire(key, this.config.windowMs);
            }
            const allowed = count <= (this.config.maxRequests || 100);
            const remaining = Math.max(0, (this.config.maxRequests || 100) - count);
            const ttl = await this.redisClient.pttl(key);
            const actualResetAt = ttl > 0 ? now + ttl : resetAt;
            return {
                allowed,
                remaining,
                limit: this.config.maxRequests || 100,
                resetAt: actualResetAt,
                retryAfter: allowed ? undefined : Math.ceil(ttl / 1000),
            };
        }
        catch (error) {
            logger.error('Redis rate limit error, falling back to in-memory', {
                error: error.message,
            });
            return super.checkLimit(tenantId, endpoint);
        }
    }
    async reset(tenantId, endpoint = 'default') {
        if (!this.redisClient) {
            return super.reset(tenantId, endpoint);
        }
        const key = `ratelimit:${tenantId}:${endpoint}`;
        try {
            await this.redisClient.del(key);
            logger.debug('Redis rate limit reset', { tenantId, endpoint });
        }
        catch (error) {
            logger.error('Redis rate limit reset error', { error: error.message });
            super.reset(tenantId, endpoint);
        }
    }
}
//# sourceMappingURL=RateLimiter.js.map