/**
 * Rate Limiting Middleware
 *
 * Protects API endpoints from abuse with configurable rate limits
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

export interface RateLimitConfig {
  /**
   * Window duration in milliseconds
   * @example 60000 (1 minute), 900000 (15 minutes)
   */
  windowMs: number;

  /**
   * Maximum requests per window
   */
  maxRequests: number;

  /**
   * Message to send when rate limit is exceeded
   */
  message?: string;

  /**
   * Custom key generator (default: use IP address)
   */
  keyGenerator?: (req: Request) => string;

  /**
   * Skip rate limiting if this function returns true
   */
  skip?: (req: Request) => boolean;

  /**
   * Handler called when rate limit is exceeded
   */
  onLimitReached?: (req: Request, res: Response) => void;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

/**
 * In-memory store for rate limit tracking
 * Key: IP address or custom key
 * Value: { count, resetTime }
 */
const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Cleanup interval to remove expired records (runs every 5 minutes)
 */
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      logger.debug(`[RateLimiter] Cleaned ${cleanedCount} expired records`);
    }
  }, 5 * 60 * 1000); // Every 5 minutes

  // Allow Node.js to exit even if cleanup is running
  cleanupInterval.unref();
}

/**
 * Stop the cleanup interval (useful for testing)
 */
export function stopCleanup() {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}

/**
 * Clear all rate limit records (useful for testing)
 */
export function clearRateLimits() {
  rateLimitStore.clear();
}

/**
 * Get rate limit status for a key
 */
export function getRateLimitStatus(key: string): RateLimitRecord | null {
  return rateLimitStore.get(key) || null;
}

/**
 * Default key generator using IP address
 */
function defaultKeyGenerator(req: Request): string {
  // Try to get real IP from proxy headers
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded && typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }

  const realIp = req.headers['x-real-ip'];
  if (realIp && typeof realIp === 'string') {
    return realIp.trim();
  }

  // Fallback to socket IP
  return req.ip || req.socket.remoteAddress || 'unknown';
}

/**
 * Create rate limiting middleware
 *
 * @example
 * ```typescript
 * // General API rate limit: 100 requests per 15 minutes
 * app.use('/api', rateLimiter({
 *   windowMs: 15 * 60 * 1000,
 *   maxRequests: 100,
 *   message: 'Too many API requests, please try again later'
 * }));
 *
 * // Voice endpoint: 10 requests per minute
 * app.post('/api/voice-rag/chat', rateLimiter({
 *   windowMs: 60 * 1000,
 *   maxRequests: 10,
 *   message: 'Voice processing rate limit exceeded'
 * }), handler);
 * ```
 */
export function rateLimiter(config: RateLimitConfig) {
  const {
    windowMs,
    maxRequests,
    message = 'Too many requests, please try again later',
    keyGenerator = defaultKeyGenerator,
    skip,
    onLimitReached,
  } = config;

  // Start cleanup interval on first use
  startCleanup();

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip if skip function returns true
    if (skip && skip(req)) {
      return next();
    }

    const now = Date.now();
    const key = keyGenerator(req);

    // Get or create rate limit record
    let record = rateLimitStore.get(key);

    // If record doesn't exist or window has expired, create new record
    if (!record || now > record.resetTime) {
      record = {
        count: 0,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, record);
    }

    // Increment request count
    record.count++;

    // Calculate time until reset
    const resetTime = record.resetTime;
    const retryAfter = Math.ceil((resetTime - now) / 1000); // Seconds

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());

    // Check if rate limit exceeded
    if (record.count > maxRequests) {
      res.setHeader('Retry-After', retryAfter);

      logger.warn(`[RateLimiter] Rate limit exceeded`, {
        key,
        path: req.path,
        method: req.method,
        count: record.count,
        limit: maxRequests,
        windowMs,
        retryAfter,
      });

      // Call custom handler if provided
      if (onLimitReached) {
        onLimitReached(req, res);
        return;
      }

      // Default 429 response
      return res.status(429).json({
        error: 'Too Many Requests',
        message,
        retryAfter,
        limit: maxRequests,
        windowMs,
      });
    }

    // Log when approaching limit
    if (record.count > maxRequests * 0.8) {
      logger.debug(`[RateLimiter] Approaching limit`, {
        key,
        path: req.path,
        count: record.count,
        limit: maxRequests,
        remaining: maxRequests - record.count,
      });
    }

    next();
  };
}

/**
 * Preset rate limiters for common use cases
 */
export const rateLimitPresets = {
  /**
   * General API: 100 requests per 15 minutes
   */
  api: () => rateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_API_MAX || '100'),
    message: 'API rate limit exceeded. Please try again in a few minutes.',
  }),

  /**
   * Voice processing: 10 requests per minute
   */
  voice: () => rateLimiter({
    windowMs: 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_VOICE_MAX || '10'),
    message: 'Voice processing rate limit exceeded. Please wait before sending more requests.',
  }),

  /**
   * Authentication: 5 requests per minute
   */
  auth: () => rateLimiter({
    windowMs: 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5'),
    message: 'Too many authentication attempts. Please try again later.',
  }),

  /**
   * File upload: 20 requests per hour
   */
  upload: () => rateLimiter({
    windowMs: 60 * 60 * 1000,
    maxRequests: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX || '20'),
    message: 'Upload rate limit exceeded. Please try again later.',
  }),
};

/**
 * Create IP-based rate limiter
 */
export function createIPRateLimiter(maxRequests: number, windowMs: number, message?: string) {
  return rateLimiter({
    windowMs,
    maxRequests,
    message,
    keyGenerator: defaultKeyGenerator,
  });
}

/**
 * Create user-based rate limiter (requires req.user)
 */
export function createUserRateLimiter(maxRequests: number, windowMs: number, message?: string) {
  return rateLimiter({
    windowMs,
    maxRequests,
    message,
    keyGenerator: (req: any) => {
      return req.user?.id || req.user?.email || defaultKeyGenerator(req);
    },
  });
}

export default rateLimiter;
