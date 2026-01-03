import { logger } from '../utils/logger.js';
const DEFAULT_CONFIG = {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    lockoutDurationMs: 30 * 60 * 1000,
    cleanupIntervalMs: 60 * 60 * 1000,
};
export class RateLimiter {
    db;
    config;
    cleanupTimer = null;
    constructor(db, config) {
        this.db = db;
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.initializeSchema();
        this.startCleanup();
    }
    initializeSchema() {
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
    checkLimit(service, account) {
        const id = `${service}:${account}`;
        const now = Date.now();
        const entry = this.db
            .prepare('SELECT * FROM rate_limits WHERE id = ?')
            .get(id);
        if (!entry) {
            return {
                allowed: true,
                remainingAttempts: this.config.maxAttempts,
            };
        }
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
        if (now - entry.first_attempt > this.config.windowMs) {
            this.resetAttempts(id);
            return {
                allowed: true,
                remainingAttempts: this.config.maxAttempts,
            };
        }
        const remainingAttempts = this.config.maxAttempts - entry.attempts;
        if (remainingAttempts <= 0) {
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
    recordFailedAttempt(service, account) {
        const id = `${service}:${account}`;
        const now = Date.now();
        const entry = this.db
            .prepare('SELECT * FROM rate_limits WHERE id = ?')
            .get(id);
        let newAttempts = 1;
        if (!entry) {
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
        }
        else {
            if (now - entry.first_attempt > this.config.windowMs) {
                this.db
                    .prepare(`
            UPDATE rate_limits
            SET attempts = 1, first_attempt = ?, last_attempt = ?, locked_until = NULL
            WHERE id = ?
          `)
                    .run(now, now, id);
                newAttempts = 1;
            }
            else {
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
    recordSuccessfulAttempt(service, account) {
        const id = `${service}:${account}`;
        this.db
            .prepare('DELETE FROM rate_limits WHERE id = ?')
            .run(id);
        logger.info(`Rate limit: Successful attempt, counter reset`, {
            service,
            account,
        });
    }
    resetAttempts(id) {
        this.db
            .prepare('DELETE FROM rate_limits WHERE id = ?')
            .run(id);
    }
    lockAccount(id, lockedUntil) {
        this.db
            .prepare(`
        UPDATE rate_limits
        SET locked_until = ?
        WHERE id = ?
      `)
            .run(lockedUntil, id);
    }
    unlockAccount(service, account) {
        const id = `${service}:${account}`;
        this.db
            .prepare('DELETE FROM rate_limits WHERE id = ?')
            .run(id);
        logger.info(`Rate limit: Account manually unlocked`, {
            service,
            account,
        });
    }
    getStatus(service, account) {
        const id = `${service}:${account}`;
        const now = Date.now();
        const entry = this.db
            .prepare('SELECT * FROM rate_limits WHERE id = ?')
            .get(id);
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
    getLockedAccounts() {
        const now = Date.now();
        const entries = this.db
            .prepare('SELECT * FROM rate_limits WHERE locked_until IS NOT NULL AND locked_until > ?')
            .all(now);
        return entries.map((entry) => {
            const [service, account] = entry.id.split(':');
            return {
                service,
                account,
                lockedUntil: new Date(entry.locked_until),
                attempts: entry.attempts,
            };
        });
    }
    startCleanup() {
        this.cleanupTimer = setInterval(() => {
            this.cleanup();
        }, this.config.cleanupIntervalMs);
    }
    stopCleanup() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
    }
    cleanup() {
        const now = Date.now();
        const expiryThreshold = now - this.config.windowMs;
        const result1 = this.db
            .prepare('DELETE FROM rate_limits WHERE locked_until IS NOT NULL AND locked_until < ?')
            .run(now);
        const result2 = this.db
            .prepare('DELETE FROM rate_limits WHERE locked_until IS NULL AND last_attempt < ?')
            .run(expiryThreshold);
        const totalDeleted = result1.changes + result2.changes;
        if (totalDeleted > 0) {
            logger.info(`Rate limit: Cleaned up ${totalDeleted} expired entries`);
        }
    }
    getStats() {
        const now = Date.now();
        const totalEntries = this.db
            .prepare('SELECT COUNT(*) as count FROM rate_limits')
            .get().count;
        const lockedAccounts = this.db
            .prepare('SELECT COUNT(*) as count FROM rate_limits WHERE locked_until IS NOT NULL AND locked_until > ?')
            .get(now).count;
        const totalAttempts = this.db
            .prepare('SELECT SUM(attempts) as total FROM rate_limits')
            .get().total || 0;
        return {
            totalEntries,
            lockedAccounts,
            totalAttempts,
        };
    }
    getConfig() {
        return { ...this.config };
    }
}
//# sourceMappingURL=RateLimiter.js.map