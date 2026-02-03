/**
 * Rate Limiting Middleware
 *
 * Implements per-agent rate limiting using token bucket algorithm.
 * Prevents abuse and ensures fair usage of A2A endpoints.
 *
 * Features:
 * - Per-agent rate limiting (isolated by agentId)
 * - Token bucket algorithm (allows burst traffic)
 * - Configurable limits per endpoint
 * - Automatic cleanup of expired entries
 * - Metrics tracking for monitoring
 *
 * @module a2a/server/middleware/rateLimit
 */

import type { Response, NextFunction } from 'express';
import { logger } from '../../../utils/logger.js';
import { RATE_LIMITS, ENV_KEYS } from '../../constants.js';
import type { TokenBucket, RateLimitStats } from '../../types/rateLimit.js';
import type { AuthenticatedRequest } from './auth.js';

/**
 * Rate limiter storage
 * Key: `${agentId}:${endpoint}`
 */
const buckets = new Map<string, TokenBucket>();

/**
 * Rate limit statistics
 */
const stats = new Map<string, RateLimitStats>();

/**
 * Cleanup timer reference
 */
let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * Guard flag for refill operations to prevent re-entrant refills.
 * Key: `${agentId}:${endpoint}`
 *
 * Since Node.js is single-threaded, synchronous code cannot be interleaved.
 * The token refill calculation is purely synchronous (timestamp math), so
 * a simple Set-based guard is sufficient to prevent any edge-case re-entrancy
 * if refillTokens were ever called from a nested synchronous context.
 */
const refillGuard = new Set<string>();

/**
 * Get rate limit configuration from environment or defaults
 */
function getRateLimitConfig(endpoint: string): number {
  const envMap: Record<string, string> = {
    '/a2a/send-message': ENV_KEYS.RATE_LIMIT_SEND_MESSAGE,
    '/a2a/tasks/:taskId': ENV_KEYS.RATE_LIMIT_GET_TASK,
    '/a2a/tasks': ENV_KEYS.RATE_LIMIT_LIST_TASKS,
    '/a2a/tasks/:taskId/cancel': ENV_KEYS.RATE_LIMIT_CANCEL_TASK,
  };

  const defaultMap: Record<string, number> = {
    '/a2a/send-message': RATE_LIMITS.SEND_MESSAGE_RPM,
    '/a2a/tasks/:taskId': RATE_LIMITS.GET_TASK_RPM,
    '/a2a/tasks': RATE_LIMITS.LIST_TASKS_RPM,
    '/a2a/tasks/:taskId/cancel': RATE_LIMITS.CANCEL_TASK_RPM,
  };

  // Check environment variable override
  const envKey = envMap[endpoint];
  if (envKey && process.env[envKey]) {
    const parsed = parseInt(process.env[envKey]!, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  // Use endpoint-specific default
  if (defaultMap[endpoint]) {
    return defaultMap[endpoint];
  }

  // Fallback to global default
  if (process.env[ENV_KEYS.RATE_LIMIT_DEFAULT]) {
    const parsed = parseInt(process.env[ENV_KEYS.RATE_LIMIT_DEFAULT]!, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return RATE_LIMITS.DEFAULT_RPM;
}

/**
 * Normalize endpoint path to match rate limit configuration
 * Converts `/a2a/tasks/task-123` to `/a2a/tasks/:taskId`
 */
function normalizeEndpoint(path: string): string {
  // Match /a2a/tasks/:taskId pattern
  if (/^\/a2a\/tasks\/[^/]+$/.test(path)) {
    return '/a2a/tasks/:taskId';
  }

  // Match /a2a/tasks/:taskId/cancel pattern
  if (/^\/a2a\/tasks\/[^/]+\/cancel$/.test(path)) {
    return '/a2a/tasks/:taskId/cancel';
  }

  // Return as-is for other endpoints
  return path;
}

/**
 * Get or create token bucket for agent+endpoint
 */
function getBucket(agentId: string, endpoint: string): TokenBucket {
  const key = `${agentId}:${endpoint}`;
  let bucket = buckets.get(key);

  if (!bucket) {
    const maxTokens = getRateLimitConfig(endpoint);
    const refillRate = maxTokens / 60_000; // tokens per millisecond

    bucket = {
      tokens: maxTokens,
      maxTokens,
      lastRefill: Date.now(),
      refillRate,
    };

    buckets.set(key, bucket);
  }

  return bucket;
}

/**
 * Refill tokens based on elapsed time.
 *
 * This is a purely synchronous operation (timestamp math only).
 * In Node.js single-threaded model, synchronous code cannot be interleaved,
 * so no async mutex is needed. The refillGuard prevents any edge-case
 * re-entrancy from nested synchronous calls.
 *
 * Previous implementation used an async mutex (Promise-based) which introduced
 * a TOCTOU race condition: two concurrent requests could both check the mutex Map,
 * find it empty, and both proceed to create competing refill Promises before
 * either had a chance to set the mutex entry.
 *
 * @param key - Bucket key for guard identification
 * @param bucket - Token bucket to refill
 */
function refillTokens(key: string, bucket: TokenBucket): void {
  // Guard against re-entrant calls (defensive; should not happen in practice)
  if (refillGuard.has(key)) {
    return;
  }

  refillGuard.add(key);
  try {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const tokensToAdd = elapsed * bucket.refillRate;

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(bucket.maxTokens, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }
  } finally {
    refillGuard.delete(key);
  }
}

/**
 * Try to consume a token from the bucket.
 *
 * Synchronous operation: refills tokens based on elapsed time, then
 * attempts to consume one token. Returns immediately with the result.
 *
 * @param key - Bucket key for guard identification
 * @param bucket - Token bucket to consume from
 * @returns true if token was consumed, false if rate limit exceeded
 */
function tryConsume(key: string, bucket: TokenBucket): boolean {
  refillTokens(key, bucket);

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }

  return false;
}

/**
 * Calculate retry-after time in seconds
 */
function calculateRetryAfter(bucket: TokenBucket): number {
  const tokensNeeded = 1 - bucket.tokens;
  const msNeeded = tokensNeeded / bucket.refillRate;
  return Math.ceil(msNeeded / 1000);
}

/**
 * Update rate limit statistics
 */
function updateStats(agentId: string, endpoint: string, exceeded: boolean): void {
  const key = `${agentId}:${endpoint}`;
  let stat = stats.get(key);

  if (!stat) {
    stat = {
      agentId,
      endpoint,
      limitExceeded: 0,
      totalRequests: 0,
    };
    stats.set(key, stat);
  }

  stat.totalRequests += 1;

  if (exceeded) {
    stat.limitExceeded += 1;
    stat.lastLimitHit = Date.now();

    logger.warn('[Rate Limit] Limit exceeded', {
      agentId,
      endpoint,
      totalExceeded: stat.limitExceeded,
      totalRequests: stat.totalRequests,
    });
  }
}

/**
 * Cleanup expired entries (called periodically)
 */
function cleanup(): void {
  const now = Date.now();
  const expirationThreshold = 10 * 60_000; // 10 minutes

  // Cleanup buckets
  for (const [key, bucket] of buckets.entries()) {
    if (now - bucket.lastRefill > expirationThreshold) {
      buckets.delete(key);
    }
  }

  // Cleanup stats
  for (const [key, stat] of stats.entries()) {
    if (stat.lastLimitHit && now - stat.lastLimitHit > expirationThreshold) {
      stats.delete(key);
    }
  }

  logger.debug('[Rate Limit] Cleanup completed', {
    remainingBuckets: buckets.size,
    remainingStats: stats.size,
  });
}

/**
 * Start automatic cleanup
 */
export function startCleanup(): void {
  if (cleanupTimer) {
    return;
  }

  cleanupTimer = setInterval(cleanup, RATE_LIMITS.CLEANUP_INTERVAL_MS);
  logger.info('[Rate Limit] Cleanup started', {
    intervalMs: RATE_LIMITS.CLEANUP_INTERVAL_MS,
  });
}

/**
 * Stop automatic cleanup
 */
export function stopCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    logger.info('[Rate Limit] Cleanup stopped');
  }
}

/**
 * Get rate limit statistics for monitoring
 */
export function getRateLimitStats(): RateLimitStats[] {
  return Array.from(stats.values());
}

/**
 * Clear all rate limit data (for testing)
 */
export function clearRateLimitData(): void {
  buckets.clear();
  stats.clear();
}

/**
 * Rate limiting middleware
 *
 * Applies per-agent rate limiting using token bucket algorithm.
 * Must be applied after authentication middleware (requires req.agentId).
 *
 * @example
 * ```typescript
 * app.post('/a2a/send-message',
 *   authenticateToken,
 *   rateLimitMiddleware,
 *   handler
 * );
 * ```
 */
export function rateLimitMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const agentId = req.agentId;

  if (!agentId) {
    // Should not happen if authentication middleware is applied first
    logger.error('[Rate Limit] Missing agentId in authenticated request');
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      },
    });
    return;
  }

  const endpoint = normalizeEndpoint(req.path);
  const key = `${agentId}:${endpoint}`;
  const bucket = getBucket(agentId, endpoint);
  const allowed = tryConsume(key, bucket);

  updateStats(agentId, endpoint, !allowed);

  if (!allowed) {
    const retryAfter = calculateRetryAfter(bucket);

    // Set header before sending response
    res.setHeader('Retry-After', retryAfter.toString());

    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        retryAfter,
      },
    });

    return;
  }

  next();
}
