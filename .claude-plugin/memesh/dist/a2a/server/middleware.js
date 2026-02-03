import { logger } from '../../utils/logger.js';
export function errorHandler(err, req, res, _next) {
    logger.error('[A2A Server] Error', {
        error: err.message,
        stack: err.stack,
        method: req.method,
        path: req.path,
    });
    const error = {
        code: 'INTERNAL_ERROR',
        message: err.message || 'Internal server error',
        details: {
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        },
    };
    res.status(500).json({
        success: false,
        error,
    });
}
export function requestLogger(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info('[A2A Server] Request', {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
        });
    });
    next();
}
export function corsMiddleware(req, res, next) {
    const origin = req.headers.origin;
    const isLocalhost = origin && (origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.startsWith('https://localhost:') ||
        origin.startsWith('https://127.0.0.1:'));
    if (isLocalhost) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    }
    else {
        next();
    }
}
export function jsonErrorHandler(err, _req, res, next) {
    if (err instanceof SyntaxError && 'body' in err) {
        const error = {
            code: 'INVALID_JSON',
            message: 'Invalid JSON in request body',
            details: { error: err.message },
        };
        res.status(400).json({
            success: false,
            error,
        });
    }
    else {
        next(err);
    }
}
//# sourceMappingURL=middleware.js.map