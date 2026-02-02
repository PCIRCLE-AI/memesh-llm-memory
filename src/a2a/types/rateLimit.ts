/**
 * Rate Limiting Type Definitions
 *
 * Types for rate limiting functionality in A2A Protocol.
 * Supports per-agent rate limiting using token bucket algorithm.
 *
 * @module a2a/types/rateLimit
 */

/**
 * Rate limit configuration for a specific endpoint
 */
export interface RateLimitConfig {
  /** Maximum number of requests allowed per window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

/**
 * Token bucket state for rate limiting
 */
export interface TokenBucket {
  /** Current number of tokens available */
  tokens: number;
  /** Maximum number of tokens (capacity) */
  maxTokens: number;
  /** Last time tokens were refilled (timestamp in ms) */
  lastRefill: number;
  /** Refill rate (tokens per millisecond) */
  refillRate: number;
}

/**
 * Rate limit error response
 */
export interface RateLimitError {
  success: false;
  error: {
    code: 'RATE_LIMIT_EXCEEDED';
    message: string;
    retryAfter: number;
  };
}

/**
 * Rate limit statistics for monitoring
 */
export interface RateLimitStats {
  /** Agent ID */
  agentId: string;
  /** Endpoint path */
  endpoint: string;
  /** Number of times rate limit was exceeded */
  limitExceeded: number;
  /** Total requests made */
  totalRequests: number;
  /** Last rate limit hit timestamp */
  lastLimitHit?: number;
}
