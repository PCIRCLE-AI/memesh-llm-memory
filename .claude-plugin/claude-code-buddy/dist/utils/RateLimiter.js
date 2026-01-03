import { logger } from './logger.js';
export class RateLimiter {
    tokens;
    maxTokens;
    refillRate;
    refillInterval;
    lastRefill;
    refillTimer;
    constructor(options = {}) {
        if (options.requestsPerMinute !== undefined) {
            this.maxTokens = options.requestsPerMinute;
            this.refillRate = Math.ceil(options.requestsPerMinute / 60);
            this.refillInterval = 1000;
        }
        else {
            this.maxTokens = options.maxTokens ?? 100;
            this.refillRate = options.refillRate ?? 10;
            this.refillInterval = options.refillInterval ?? 1000;
        }
        this.tokens = this.maxTokens;
        this.lastRefill = Date.now();
        this.startRefillTimer();
        logger.info('RateLimiter initialized', {
            maxTokens: this.maxTokens,
            refillRate: this.refillRate,
            refillInterval: this.refillInterval,
        });
    }
    startRefillTimer() {
        this.refillTimer = setInterval(() => {
            this.refill();
        }, this.refillInterval);
        if (this.refillTimer.unref) {
            this.refillTimer.unref();
        }
    }
    refill() {
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
    consume(tokens = 1) {
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
    getTokens() {
        this.refill();
        return this.tokens;
    }
    getStatus() {
        this.refill();
        return {
            tokens: this.tokens,
            maxTokens: this.maxTokens,
            utilizationPercent: ((this.maxTokens - this.tokens) / this.maxTokens) * 100,
        };
    }
    reset() {
        this.tokens = this.maxTokens;
        this.lastRefill = Date.now();
        logger.info('RateLimiter reset to max tokens', {
            maxTokens: this.maxTokens,
        });
    }
    stop() {
        if (this.refillTimer) {
            clearInterval(this.refillTimer);
            this.refillTimer = undefined;
            logger.info('RateLimiter stopped');
        }
    }
}
//# sourceMappingURL=RateLimiter.js.map