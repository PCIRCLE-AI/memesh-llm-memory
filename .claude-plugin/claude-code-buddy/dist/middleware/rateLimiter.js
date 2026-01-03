import { logger } from '../utils/logger.js';
const rateLimitStore = new Map();
let cleanupInterval = null;
function startCleanup() {
    if (cleanupInterval)
        return;
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
    }, 5 * 60 * 1000);
    cleanupInterval.unref();
}
export function stopCleanup() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
    }
}
export function clearRateLimits() {
    rateLimitStore.clear();
}
export function getRateLimitStatus(key) {
    return rateLimitStore.get(key) || null;
}
function defaultKeyGenerator(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded && typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    const realIp = req.headers['x-real-ip'];
    if (realIp && typeof realIp === 'string') {
        return realIp.trim();
    }
    return req.ip || req.socket.remoteAddress || 'unknown';
}
export function rateLimiter(config) {
    const { windowMs, maxRequests, message = 'Too many requests, please try again later', keyGenerator = defaultKeyGenerator, skip, onLimitReached, } = config;
    startCleanup();
    return (req, res, next) => {
        if (skip && skip(req)) {
            return next();
        }
        const now = Date.now();
        const key = keyGenerator(req);
        let record = rateLimitStore.get(key);
        if (!record || now > record.resetTime) {
            record = {
                count: 0,
                resetTime: now + windowMs,
            };
            rateLimitStore.set(key, record);
        }
        record.count++;
        const resetTime = record.resetTime;
        const retryAfter = Math.ceil((resetTime - now) / 1000);
        res.setHeader('X-RateLimit-Limit', maxRequests);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
        res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString());
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
            if (onLimitReached) {
                onLimitReached(req, res);
                return;
            }
            return res.status(429).json({
                error: 'Too Many Requests',
                message,
                retryAfter,
                limit: maxRequests,
                windowMs,
            });
        }
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
export const rateLimitPresets = {
    api: () => rateLimiter({
        windowMs: 15 * 60 * 1000,
        maxRequests: parseInt(process.env.RATE_LIMIT_API_MAX || '100'),
        message: 'API rate limit exceeded. Please try again in a few minutes.',
    }),
    voice: () => rateLimiter({
        windowMs: 60 * 1000,
        maxRequests: parseInt(process.env.RATE_LIMIT_VOICE_MAX || '10'),
        message: 'Voice processing rate limit exceeded. Please wait before sending more requests.',
    }),
    auth: () => rateLimiter({
        windowMs: 60 * 1000,
        maxRequests: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '5'),
        message: 'Too many authentication attempts. Please try again later.',
    }),
    upload: () => rateLimiter({
        windowMs: 60 * 60 * 1000,
        maxRequests: parseInt(process.env.RATE_LIMIT_UPLOAD_MAX || '20'),
        message: 'Upload rate limit exceeded. Please try again later.',
    }),
};
export function createIPRateLimiter(maxRequests, windowMs, message) {
    return rateLimiter({
        windowMs,
        maxRequests,
        message,
        keyGenerator: defaultKeyGenerator,
    });
}
export function createUserRateLimiter(maxRequests, windowMs, message) {
    return rateLimiter({
        windowMs,
        maxRequests,
        message,
        keyGenerator: (req) => {
            return req.user?.id || req.user?.email || defaultKeyGenerator(req);
        },
    });
}
export default rateLimiter;
//# sourceMappingURL=rateLimiter.js.map