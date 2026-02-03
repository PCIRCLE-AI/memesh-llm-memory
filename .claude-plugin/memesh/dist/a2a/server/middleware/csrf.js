import { randomBytes } from 'crypto';
import { logger } from '../../../utils/logger.js';
const tokens = new Map();
const TOKEN_EXPIRATION_MS = 60 * 60 * 1000;
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];
function generateToken() {
    return randomBytes(32).toString('hex');
}
function cleanupExpiredTokens() {
    const now = Date.now();
    let cleaned = 0;
    for (const [token, expiration] of tokens.entries()) {
        if (expiration < now) {
            tokens.delete(token);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        logger.debug('[CSRF] Cleaned up expired tokens', { count: cleaned });
    }
}
let cleanupInterval = null;
export function startCsrfCleanup() {
    if (cleanupInterval) {
        return;
    }
    cleanupInterval = setInterval(() => {
        cleanupExpiredTokens();
    }, 10 * 60 * 1000);
    logger.info('[CSRF] Token cleanup started');
}
export function stopCsrfCleanup() {
    if (cleanupInterval) {
        clearInterval(cleanupInterval);
        cleanupInterval = null;
        logger.info('[CSRF] Token cleanup stopped');
    }
}
export function clearCsrfTokens() {
    tokens.clear();
}
export function csrfTokenMiddleware(req, res, next) {
    const token = generateToken();
    const expiration = Date.now() + TOKEN_EXPIRATION_MS;
    tokens.set(token, expiration);
    res.cookie('XSRF-TOKEN', token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: TOKEN_EXPIRATION_MS,
    });
    res.setHeader('X-CSRF-Token', token);
    next();
}
export function csrfProtection(req, res, next) {
    if (SAFE_METHODS.includes(req.method)) {
        return next();
    }
    const authHeader = req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
        logger.debug('[CSRF] Skipping CSRF check for Bearer token authentication', {
            method: req.method,
            path: req.path,
        });
        return next();
    }
    const token = req.header('X-CSRF-Token') ||
        (req.body && req.body.csrf_token);
    if (!token) {
        logger.warn('[CSRF] Missing CSRF token', {
            method: req.method,
            path: req.path,
            ip: req.ip,
        });
        res.status(403).json({
            success: false,
            error: {
                code: 'CSRF_TOKEN_MISSING',
                message: 'CSRF token required for this request',
            },
        });
        return;
    }
    const expiration = tokens.get(token);
    if (!expiration) {
        logger.warn('[CSRF] Invalid CSRF token', {
            method: req.method,
            path: req.path,
            ip: req.ip,
        });
        res.status(403).json({
            success: false,
            error: {
                code: 'CSRF_TOKEN_INVALID',
                message: 'Invalid CSRF token',
            },
        });
        return;
    }
    if (expiration < Date.now()) {
        logger.warn('[CSRF] Expired CSRF token', {
            method: req.method,
            path: req.path,
            ip: req.ip,
        });
        tokens.delete(token);
        res.status(403).json({
            success: false,
            error: {
                code: 'CSRF_TOKEN_EXPIRED',
                message: 'CSRF token expired, please refresh',
            },
        });
        return;
    }
    tokens.delete(token);
    const newToken = generateToken();
    const newExpiration = Date.now() + TOKEN_EXPIRATION_MS;
    tokens.set(newToken, newExpiration);
    res.setHeader('X-CSRF-Token', newToken);
    res.cookie('XSRF-TOKEN', newToken, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: TOKEN_EXPIRATION_MS,
    });
    next();
}
//# sourceMappingURL=csrf.js.map