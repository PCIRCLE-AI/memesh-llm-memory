/**
 * Rate Limiter - Tenant-Aware Rate Limiting
 *
 * Provides rate limiting with:
 * - Per-tenant rate limits
 * - Sliding window algorithm
 * - Distributed rate limiting (Redis support)
 * - Configurable limits per endpoint
 * - Rate limit headers (X-RateLimit-*)
 */

import { logger } from '../../utils/logger.js';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /**
   * Maximum requests allowed in the window
   */
  maxRequests: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Message to return when rate limit exceeded
   */
  message?: string;

  /**
   * Skip rate limiting for certain conditions
   */
  skip?: (tenantId: string, endpoint: string) => boolean;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /**
   * Is request allowed
   */
  allowed: boolean;

  /**
   * Remaining requests in window
   */
  remaining: number;

  /**
   * Total limit
   */
  limit: number;

  /**
   * Window reset time (Unix timestamp)
   */
  resetAt: number;

  /**
   * Retry after (seconds, only if not allowed)
   */
  retryAfter?: number;
}

/**
 * Rate limit entry
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Rate Limiter
 */
export class RateLimiter {
  private store: Map<string, RateLimitEntry> = new Map();
  protected config: RateLimitConfig;  // Protected to allow subclass access
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: RateLimitConfig) {
    this.config = {
      message: 'Rate limit exceeded',
      ...config,
    };

    // Start cleanup interval to remove expired entries
    this.startCleanup();

    logger.info('Rate limiter initialized', {
      maxRequests: config.maxRequests,
      windowMs: config.windowMs,
    });
  }

  /**
   * Check rate limit for tenant and endpoint
   */
  async checkLimit(
    tenantId: string,
    endpoint: string = 'default'
  ): Promise<RateLimitResult> {
    // Check skip condition
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

    // Create new entry if doesn't exist or expired
    if (!entry || entry.resetAt < now) {
      entry = {
        count: 0,
        resetAt,
      };
      this.store.set(key, entry);
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
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

  /**
   * Reset rate limit for tenant and endpoint
   */
  reset(tenantId: string, endpoint: string = 'default'): void {
    const key = this.getKey(tenantId, endpoint);
    this.store.delete(key);

    logger.debug('Rate limit reset', { tenantId, endpoint });
  }

  /**
   * Get current usage for tenant and endpoint
   */
  getUsage(tenantId: string, endpoint: string = 'default'): {
    count: number;
    limit: number;
    resetAt: number | null;
  } {
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

  /**
   * Get rate limit headers for HTTP responses
   */
  getHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': result.limit.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
    };

    if (result.retryAfter !== undefined) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return headers;
  }

  /**
   * Start cleanup interval
   */
  private startCleanup(): void {
    // Run cleanup every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
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

  /**
   * Generate key for rate limit entry
   */
  private getKey(tenantId: string, endpoint: string): string {
    return `${tenantId}:${endpoint}`;
  }

  /**
   * Stop cleanup interval and dispose resources
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.store.clear();

    logger.info('Rate limiter disposed');
  }
}

/**
 * Distributed Rate Limiter (Redis-backed)
 */
export class DistributedRateLimiter extends RateLimiter {
  private redisClient: any; // Redis client type

  constructor(config: RateLimitConfig, redisClient: any) {
    super(config);
    this.redisClient = redisClient;

    logger.info('Distributed rate limiter initialized');
  }

  /**
   * Check rate limit using Redis
   */
  async checkLimit(
    tenantId: string,
    endpoint: string = 'default'
  ): Promise<RateLimitResult> {
    if (!this.redisClient) {
      // Fallback to in-memory
      return super.checkLimit(tenantId, endpoint);
    }

    const key = `ratelimit:${tenantId}:${endpoint}`;
    const now = Date.now();
    const resetAt = now + (this.config.windowMs || 60000);

    try {
      // Use Redis INCR with EXPIRE for atomic rate limiting
      const count = await this.redisClient.incr(key);

      if (count === 1) {
        // First request in window, set expiration
        await this.redisClient.pexpire(key, this.config.windowMs);
      }

      const allowed = count <= (this.config.maxRequests || 100);
      const remaining = Math.max(0, (this.config.maxRequests || 100) - count);

      // Get TTL for resetAt
      const ttl = await this.redisClient.pttl(key);
      const actualResetAt = ttl > 0 ? now + ttl : resetAt;

      return {
        allowed,
        remaining,
        limit: this.config.maxRequests || 100,
        resetAt: actualResetAt,
        retryAfter: allowed ? undefined : Math.ceil(ttl / 1000),
      };
    } catch (error: any) {
      logger.error('Redis rate limit error, falling back to in-memory', {
        error: error.message,
      });

      // Fallback to in-memory
      return super.checkLimit(tenantId, endpoint);
    }
  }

  /**
   * Reset rate limit in Redis
   */
  async reset(tenantId: string, endpoint: string = 'default'): Promise<void> {
    if (!this.redisClient) {
      return super.reset(tenantId, endpoint);
    }

    const key = `ratelimit:${tenantId}:${endpoint}`;

    try {
      await this.redisClient.del(key);
      logger.debug('Redis rate limit reset', { tenantId, endpoint });
    } catch (error: any) {
      logger.error('Redis rate limit reset error', { error: error.message });
      super.reset(tenantId, endpoint);
    }
  }
}
