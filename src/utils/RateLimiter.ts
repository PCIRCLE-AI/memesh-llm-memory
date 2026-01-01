/**
 * Rate Limiter using Token Bucket Algorithm
 *
 * Prevents abuse by limiting the number of requests per time window.
 */

import { logger } from './logger.js';

export interface RateLimiterOptions {
  /**
   * Maximum number of tokens (requests) allowed in the bucket
   * @default 100
   */
  maxTokens?: number;

  /**
   * Number of tokens to refill per interval
   * @default 10
   */
  refillRate?: number;

  /**
   * Refill interval in milliseconds
   * @default 1000 (1 second)
   */
  refillInterval?: number;

  /**
   * Maximum number of requests per minute (alternative config)
   * If specified, overrides maxTokens/refillRate
   */
  requestsPerMinute?: number;
}

/**
 * Token Bucket Rate Limiter
 *
 * Implements the token bucket algorithm for rate limiting requests.
 * Tokens are refilled at a constant rate and consumed on each request.
 *
 * Features:
 * - Configurable bucket size and refill rate
 * - Automatic periodic token refilling
 * - Real-time status monitoring
 * - Simple or detailed configuration modes
 *
 * @example
 * ```typescript
 * // Simple configuration: 60 requests per minute
 * const limiter = new RateLimiter({ requestsPerMinute: 60 });
 *
 * // Detailed configuration
 * const limiter = new RateLimiter({
 *   maxTokens: 100,        // Bucket capacity
 *   refillRate: 10,        // Tokens added per interval
 *   refillInterval: 1000   // Refill every second
 * });
 *
 * // Check if request is allowed
 * if (limiter.consume()) {
 *   // Process request
 * } else {
 *   // Reject - rate limit exceeded
 * }
 *
 * // Monitor status
 * const status = limiter.getStatus();
 * console.log(`Tokens available: ${status.tokens}/${status.maxTokens}`);
 * console.log(`Utilization: ${status.utilizationPercent.toFixed(1)}%`);
 * ```
 */
export class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private readonly refillInterval: number;
  private lastRefill: number;
  private refillTimer?: NodeJS.Timeout;

  constructor(options: RateLimiterOptions = {}) {
    // Option 1: Use requestsPerMinute for simple config
    if (options.requestsPerMinute !== undefined) {
      this.maxTokens = options.requestsPerMinute;
      this.refillRate = Math.ceil(options.requestsPerMinute / 60); // per second
      this.refillInterval = 1000; // 1 second
    }
    // Option 2: Use detailed config
    else {
      this.maxTokens = options.maxTokens ?? 100;
      this.refillRate = options.refillRate ?? 10;
      this.refillInterval = options.refillInterval ?? 1000;
    }

    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();

    // Start periodic refill
    this.startRefillTimer();

    logger.info('RateLimiter initialized', {
      maxTokens: this.maxTokens,
      refillRate: this.refillRate,
      refillInterval: this.refillInterval,
    });
  }

  /**
   * Start the token refill timer
   *
   * Creates periodic timer for automatic token refilling.
   * Timer is configured to not keep the process alive (unref).
   *
   * @private
   * @internal
   */
  private startRefillTimer(): void {
    this.refillTimer = setInterval(() => {
      this.refill();
    }, this.refillInterval);

    // Don't keep process alive for this timer
    if (this.refillTimer.unref) {
      this.refillTimer.unref();
    }
  }

  /**
   * Refill tokens based on elapsed time
   *
   * Calculates how many refill intervals have passed and adds
   * the appropriate number of tokens, capped at maxTokens.
   *
   * @private
   * @internal
   */
  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const intervalsElapsed = Math.floor(elapsed / this.refillInterval);

    if (intervalsElapsed > 0) {
      const tokensToAdd = intervalsElapsed * this.refillRate;
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;

      logger.debug('RateLimiter refilled', {
        tokensAdded: tokensToAdd,
        currentTokens: this.tokens,
        maxTokens: this.maxTokens,
      });
    }
  }

  /**
   * Attempt to consume tokens for a request
   *
   * @param tokens Number of tokens to consume (default: 1)
   * @returns true if request is allowed, false if rate limited
   */
  consume(tokens: number = 1): boolean {
    // Refill before checking
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      logger.debug('RateLimiter: Request allowed', {
        tokensConsumed: tokens,
        tokensRemaining: this.tokens,
      });
      return true;
    }

    logger.warn('RateLimiter: Request blocked (rate limit exceeded)', {
      tokensRequested: tokens,
      tokensAvailable: this.tokens,
      maxTokens: this.maxTokens,
    });
    return false;
  }

  /**
   * Get current token count
   *
   * Refills tokens before returning count to ensure accurate value.
   *
   * @returns Current number of available tokens
   *
   * @example
   * ```typescript
   * const available = limiter.getTokens();
   * console.log(`${available} tokens available`);
   * ```
   */
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Get rate limiter status
   *
   * Provides current state including token count and utilization.
   * Useful for monitoring and alerting.
   *
   * @returns Status object containing:
   *   - tokens: Current available tokens
   *   - maxTokens: Maximum bucket capacity
   *   - utilizationPercent: Percentage of capacity used (0-100)
   *
   * @example
   * ```typescript
   * const status = limiter.getStatus();
   * if (status.utilizationPercent > 90) {
   *   console.warn('Rate limiter nearly exhausted');
   * }
   * ```
   */
  getStatus(): {
    tokens: number;
    maxTokens: number;
    utilizationPercent: number;
  } {
    this.refill();
    return {
      tokens: this.tokens,
      maxTokens: this.maxTokens,
      utilizationPercent: ((this.maxTokens - this.tokens) / this.maxTokens) * 100,
    };
  }

  /**
   * Reset tokens to maximum capacity
   *
   * Immediately refills the bucket to full capacity.
   * Useful for testing or manual intervention.
   *
   * @example
   * ```typescript
   * limiter.reset(); // Refill to maximum
   * ```
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefill = Date.now();
    logger.info('RateLimiter reset to max tokens', {
      maxTokens: this.maxTokens,
    });
  }

  /**
   * Stop the refill timer
   *
   * Cleans up the periodic timer.
   * Should be called when rate limiter is no longer needed.
   *
   * @example
   * ```typescript
   * limiter.stop(); // Stop refilling tokens
   * ```
   */
  stop(): void {
    if (this.refillTimer) {
      clearInterval(this.refillTimer);
      this.refillTimer = undefined;
      logger.info('RateLimiter stopped');
    }
  }
}
