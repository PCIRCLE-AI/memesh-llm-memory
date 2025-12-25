/**
 * Rate Limiter for Credential Operations
 *
 * Prevents brute force attacks by:
 * - Tracking failed access attempts
 * - Implementing exponential backoff
 * - Locking accounts after threshold
 * - Auto-cleanup of old entries
 */

import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxAttempts: number;        // Max failed attempts before lockout
  windowMs: number;           // Time window for attempts (ms)
  lockoutDurationMs: number;  // Duration of lockout (ms)
  cleanupIntervalMs: number;  // How often to cleanup old entries (ms)
}

/**
 * Default rate limit configuration
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,                    // 5 failed attempts
  windowMs: 15 * 60 * 1000,          // 15 minutes
  lockoutDurationMs: 30 * 60 * 1000, // 30 minutes lockout
  cleanupIntervalMs: 60 * 60 * 1000, // Cleanup every hour
};

/**
 * Rate limit entry in database
 */
interface RateLimitEntry {
  id: string;           // service:account
  attempts: number;     // Number of failed attempts
  locked_until: number | null; // Timestamp when lock expires (null if not locked)
  first_attempt: number;       // Timestamp of first attempt in current window
  last_attempt: number;        // Timestamp of last attempt
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;           // Whether operation is allowed
  remainingAttempts?: number; // Remaining attempts before lockout
  lockedUntil?: Date;        // When lock expires (if locked)
  retryAfterMs?: number;     // Milliseconds until retry allowed
}

/**
 * Rate Limiter with SQLite persistence
 */
export class RateLimiter {
  private db: Database.Database;
  private config: RateLimitConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(db: Database.Database, config?: Partial<RateLimitConfig>) {
    this.db = db;
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.initializeSchema();
    this.startCleanup();
  }

  /**
   * Initialize rate limit table
   */
  private initializeSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id TEXT PRIMARY KEY,
        attempts INTEGER NOT NULL DEFAULT 0,
        locked_until INTEGER,
        first_attempt INTEGER NOT NULL,
        last_attempt INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_locked_until ON rate_limits(locked_until);
      CREATE INDEX IF NOT EXISTS idx_last_attempt ON rate_limits(last_attempt);
    `);
  }

  /**
   * Check if an operation is rate limited
   */
  checkLimit(service: string, account: string): RateLimitResult {
    const id = `${service}:${account}`;
    const now = Date.now();

    const entry = this.db
      .prepare('SELECT * FROM rate_limits WHERE id = ?')
      .get(id) as RateLimitEntry | undefined;

    // No previous attempts - allow
    if (!entry) {
      return {
        allowed: true,
        remainingAttempts: this.config.maxAttempts,
      };
    }

    // Check if locked
    if (entry.locked_until && entry.locked_until > now) {
      const retryAfterMs = entry.locked_until - now;
      logger.warn(`Rate limit: Account locked`, {
        service,
        account,
        lockedUntil: new Date(entry.locked_until),
        retryAfterMs,
      });

      return {
        allowed: false,
        lockedUntil: new Date(entry.locked_until),
        retryAfterMs,
      };
    }

    // Check if outside time window - reset counter
    if (now - entry.first_attempt > this.config.windowMs) {
      // Reset the entry
      this.resetAttempts(id);
      return {
        allowed: true,
        remainingAttempts: this.config.maxAttempts,
      };
    }

    // Within time window - check attempt count
    const remainingAttempts = this.config.maxAttempts - entry.attempts;

    if (remainingAttempts <= 0) {
      // Lock the account
      const lockedUntil = now + this.config.lockoutDurationMs;
      this.lockAccount(id, lockedUntil);

      logger.warn(`Rate limit: Account locked due to too many attempts`, {
        service,
        account,
        attempts: entry.attempts,
        lockedUntil: new Date(lockedUntil),
      });

      return {
        allowed: false,
        lockedUntil: new Date(lockedUntil),
        retryAfterMs: this.config.lockoutDurationMs,
      };
    }

    return {
      allowed: true,
      remainingAttempts,
    };
  }

  /**
   * Record a failed attempt
   */
  recordFailedAttempt(service: string, account: string): void {
    const id = `${service}:${account}`;
    const now = Date.now();

    const entry = this.db
      .prepare('SELECT * FROM rate_limits WHERE id = ?')
      .get(id) as RateLimitEntry | undefined;

    let newAttempts = 1;

    if (!entry) {
      // First failed attempt
      this.db
        .prepare(`
          INSERT INTO rate_limits (id, attempts, first_attempt, last_attempt)
          VALUES (?, 1, ?, ?)
        `)
        .run(id, now, now);

      logger.info(`Rate limit: First failed attempt recorded`, {
        service,
        account,
      });
    } else {
      // Check if outside window - reset
      if (now - entry.first_attempt > this.config.windowMs) {
        this.db
          .prepare(`
            UPDATE rate_limits
            SET attempts = 1, first_attempt = ?, last_attempt = ?, locked_until = NULL
            WHERE id = ?
          `)
          .run(now, now, id);
        newAttempts = 1;
      } else {
        // Increment attempts
        newAttempts = entry.attempts + 1;
        this.db
          .prepare(`
            UPDATE rate_limits
            SET attempts = attempts + 1, last_attempt = ?
            WHERE id = ?
          `)
          .run(now, id);
      }

      logger.warn(`Rate limit: Failed attempt recorded`, {
        service,
        account,
        attempts: newAttempts,
      });
    }

    // Check if we've hit the limit and lock immediately
    if (newAttempts >= this.config.maxAttempts) {
      const lockedUntil = now + this.config.lockoutDurationMs;
      this.lockAccount(id, lockedUntil);

      logger.warn(`Rate limit: Account locked due to too many attempts`, {
        service,
        account,
        attempts: newAttempts,
        lockedUntil: new Date(lockedUntil),
      });
    }
  }

  /**
   * Record a successful attempt (resets counter)
   */
  recordSuccessfulAttempt(service: string, account: string): void {
    const id = `${service}:${account}`;

    this.db
      .prepare('DELETE FROM rate_limits WHERE id = ?')
      .run(id);

    logger.info(`Rate limit: Successful attempt, counter reset`, {
      service,
      account,
    });
  }

  /**
   * Reset attempts for an account
   */
  private resetAttempts(id: string): void {
    this.db
      .prepare('DELETE FROM rate_limits WHERE id = ?')
      .run(id);
  }

  /**
   * Lock an account
   */
  private lockAccount(id: string, lockedUntil: number): void {
    this.db
      .prepare(`
        UPDATE rate_limits
        SET locked_until = ?
        WHERE id = ?
      `)
      .run(lockedUntil, id);
  }

  /**
   * Manually unlock an account (admin operation)
   */
  unlockAccount(service: string, account: string): void {
    const id = `${service}:${account}`;

    this.db
      .prepare('DELETE FROM rate_limits WHERE id = ?')
      .run(id);

    logger.info(`Rate limit: Account manually unlocked`, {
      service,
      account,
    });
  }

  /**
   * Get rate limit status for an account
   */
  getStatus(service: string, account: string): {
    isLocked: boolean;
    attempts: number;
    lockedUntil?: Date;
    remainingAttempts: number;
  } {
    const id = `${service}:${account}`;
    const now = Date.now();

    const entry = this.db
      .prepare('SELECT * FROM rate_limits WHERE id = ?')
      .get(id) as RateLimitEntry | undefined;

    if (!entry) {
      return {
        isLocked: false,
        attempts: 0,
        remainingAttempts: this.config.maxAttempts,
      };
    }

    const isLocked = entry.locked_until ? entry.locked_until > now : false;
    const remainingAttempts = Math.max(0, this.config.maxAttempts - entry.attempts);

    return {
      isLocked,
      attempts: entry.attempts,
      lockedUntil: entry.locked_until ? new Date(entry.locked_until) : undefined,
      remainingAttempts,
    };
  }

  /**
   * Get all locked accounts
   */
  getLockedAccounts(): Array<{
    service: string;
    account: string;
    lockedUntil: Date;
    attempts: number;
  }> {
    const now = Date.now();

    const entries = this.db
      .prepare('SELECT * FROM rate_limits WHERE locked_until IS NOT NULL AND locked_until > ?')
      .all(now) as RateLimitEntry[];

    return entries.map((entry) => {
      const [service, account] = entry.id.split(':');
      return {
        service,
        account,
        lockedUntil: new Date(entry.locked_until!),
        attempts: entry.attempts,
      };
    });
  }

  /**
   * Start automatic cleanup of expired entries
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupIntervalMs);
  }

  /**
   * Stop automatic cleanup
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Clean up expired and old entries
   */
  cleanup(): void {
    const now = Date.now();
    const expiryThreshold = now - this.config.windowMs;

    // Delete expired locks
    const result1 = this.db
      .prepare('DELETE FROM rate_limits WHERE locked_until IS NOT NULL AND locked_until < ?')
      .run(now);

    // Delete old entries outside time window (not locked)
    const result2 = this.db
      .prepare('DELETE FROM rate_limits WHERE locked_until IS NULL AND last_attempt < ?')
      .run(expiryThreshold);

    const totalDeleted = result1.changes + result2.changes;

    if (totalDeleted > 0) {
      logger.info(`Rate limit: Cleaned up ${totalDeleted} expired entries`);
    }
  }

  /**
   * Get rate limit statistics
   */
  getStats(): {
    totalEntries: number;
    lockedAccounts: number;
    totalAttempts: number;
  } {
    const now = Date.now();

    const totalEntries = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM rate_limits')
        .get() as { count: number }
    ).count;

    const lockedAccounts = (
      this.db
        .prepare('SELECT COUNT(*) as count FROM rate_limits WHERE locked_until IS NOT NULL AND locked_until > ?')
        .get(now) as { count: number }
    ).count;

    const totalAttempts = (
      this.db
        .prepare('SELECT SUM(attempts) as total FROM rate_limits')
        .get() as { total: number | null }
    ).total || 0;

    return {
      totalEntries,
      lockedAccounts,
      totalAttempts,
    };
  }

  /**
   * Get configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }
}
