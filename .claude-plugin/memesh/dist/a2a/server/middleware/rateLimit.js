import { logger } from '../../../utils/logger.js';
import { RATE_LIMITS, ENV_KEYS } from '../../constants.js';
const buckets = new Map();
const stats = new Map();
let cleanupTimer = null;
const refillGuard = new Set();
function getRateLimitConfig(endpoint) {
    const envMap = {
        '/a2a/send-message': ENV_KEYS.RATE_LIMIT_SEND_MESSAGE,
        '/a2a/tasks/:taskId': ENV_KEYS.RATE_LIMIT_GET_TASK,
        '/a2a/tasks': ENV_KEYS.RATE_LIMIT_LIST_TASKS,
        '/a2a/tasks/:taskId/cancel': ENV_KEYS.RATE_LIMIT_CANCEL_TASK,
    };
    const defaultMap = {
        '/a2a/send-message': RATE_LIMITS.SEND_MESSAGE_RPM,
        '/a2a/tasks/:taskId': RATE_LIMITS.GET_TASK_RPM,
        '/a2a/tasks': RATE_LIMITS.LIST_TASKS_RPM,
        '/a2a/tasks/:taskId/cancel': RATE_LIMITS.CANCEL_TASK_RPM,
    };
    const envKey = envMap[endpoint];
    if (envKey && process.env[envKey]) {
        const parsed = parseInt(process.env[envKey], 10);
        if (!isNaN(parsed) && parsed > 0) {
            return parsed;
        }
    }
    if (defaultMap[endpoint]) {
        return defaultMap[endpoint];
    }
    if (process.env[ENV_KEYS.RATE_LIMIT_DEFAULT]) {
        const parsed = parseInt(process.env[ENV_KEYS.RATE_LIMIT_DEFAULT], 10);
        if (!isNaN(parsed) && parsed > 0) {
            return parsed;
        }
    }
    return RATE_LIMITS.DEFAULT_RPM;
}
function normalizeEndpoint(path) {
    if (/^\/a2a\/tasks\/[^/]+$/.test(path)) {
        return '/a2a/tasks/:taskId';
    }
    if (/^\/a2a\/tasks\/[^/]+\/cancel$/.test(path)) {
        return '/a2a/tasks/:taskId/cancel';
    }
    return path;
}
function getBucket(agentId, endpoint) {
    const key = `${agentId}:${endpoint}`;
    let bucket = buckets.get(key);
    if (!bucket) {
        const maxTokens = getRateLimitConfig(endpoint);
        const refillRate = maxTokens / 60_000;
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
function refillTokens(key, bucket) {
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
    }
    finally {
        refillGuard.delete(key);
    }
}
function tryConsume(key, bucket) {
    refillTokens(key, bucket);
    if (bucket.tokens >= 1) {
        bucket.tokens -= 1;
        return true;
    }
    return false;
}
function calculateRetryAfter(bucket) {
    const tokensNeeded = 1 - bucket.tokens;
    const msNeeded = tokensNeeded / bucket.refillRate;
    return Math.ceil(msNeeded / 1000);
}
function updateStats(agentId, endpoint, exceeded) {
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
function cleanup() {
    const now = Date.now();
    const expirationThreshold = 10 * 60_000;
    for (const [key, bucket] of buckets.entries()) {
        if (now - bucket.lastRefill > expirationThreshold) {
            buckets.delete(key);
        }
    }
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
export function startCleanup() {
    if (cleanupTimer) {
        return;
    }
    cleanupTimer = setInterval(cleanup, RATE_LIMITS.CLEANUP_INTERVAL_MS);
    logger.info('[Rate Limit] Cleanup started', {
        intervalMs: RATE_LIMITS.CLEANUP_INTERVAL_MS,
    });
}
export function stopCleanup() {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
        logger.info('[Rate Limit] Cleanup stopped');
    }
}
export function getRateLimitStats() {
    return Array.from(stats.values());
}
export function clearRateLimitData() {
    buckets.clear();
    stats.clear();
}
export function rateLimitMiddleware(req, res, next) {
    const agentId = req.agentId;
    if (!agentId) {
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
//# sourceMappingURL=rateLimit.js.map