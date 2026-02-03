const DEFAULT_TIMEOUT_MS = 30000;
export function getTimeoutMs() {
    const envTimeout = process.env.A2A_REQUEST_TIMEOUT_MS;
    if (!envTimeout) {
        return DEFAULT_TIMEOUT_MS;
    }
    const parsed = parseInt(envTimeout, 10);
    if (isNaN(parsed) || parsed <= 0) {
        console.warn(`Invalid A2A_REQUEST_TIMEOUT_MS value: ${envTimeout}, using default ${DEFAULT_TIMEOUT_MS}ms`);
        return DEFAULT_TIMEOUT_MS;
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