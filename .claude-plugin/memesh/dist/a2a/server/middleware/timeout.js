import { logger } from '../../../utils/logger.js';
const DEFAULT_TIMEOUT_MS = 30_000;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 300_000;
export function getTimeoutMs() {
    const envTimeout = process.env.A2A_REQUEST_TIMEOUT_MS;
    if (!envTimeout) {
        return DEFAULT_TIMEOUT_MS;
    }
    const parsed = parseInt(envTimeout, 10);
    if (isNaN(parsed) || parsed <= 0) {
        logger.warn('[Timeout] Invalid A2A_REQUEST_TIMEOUT_MS value, using default', {
            provided: envTimeout,
            default: DEFAULT_TIMEOUT_MS,
        });
        return DEFAULT_TIMEOUT_MS;
    }
    if (parsed < MIN_TIMEOUT_MS) {
        logger.warn('[Timeout] A2A_REQUEST_TIMEOUT_MS below minimum, clamping', {
            provided: parsed,
            minimum: MIN_TIMEOUT_MS,
        });
        return MIN_TIMEOUT_MS;
    }
    if (parsed > MAX_TIMEOUT_MS) {
        logger.warn('[Timeout] A2A_REQUEST_TIMEOUT_MS exceeds maximum, clamping', {
            provided: parsed,
            maximum: MAX_TIMEOUT_MS,
        });
        return MAX_TIMEOUT_MS;
    }
    return parsed;
}
export function requestTimeoutMiddleware(timeoutMs = getTimeoutMs()) {
    return (req, res, next) => {
        const timer = setTimeout(() => {
            if (!res.headersSent) {
                res.status(408).json({
                    success: false,
                    error: {
                        code: 'REQUEST_TIMEOUT',
                        message: `Request timeout after ${timeoutMs}ms`
                    }
                });
            }
        }, timeoutMs);
        res.on('finish', () => {
            clearTimeout(timer);
        });
        res.on('close', () => {
            clearTimeout(timer);
        });
        next();
    };
}
//# sourceMappingURL=timeout.js.map