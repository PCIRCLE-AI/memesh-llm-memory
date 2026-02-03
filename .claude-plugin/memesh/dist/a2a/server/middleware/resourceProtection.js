import { logger } from '../../../utils/logger.js';
const connections = new Map();
const DEFAULT_MAX_TRACKED_IPS = 10_000;
function getMaxTrackedIPs() {
    const env = process.env.A2A_MAX_TRACKED_IPS;
    if (!env)
        return DEFAULT_MAX_TRACKED_IPS;
    const parsed = parseInt(env, 10);
    if (isNaN(parsed) || parsed <= 0 || parsed > 1_000_000) {
        logger.warn(`Invalid A2A_MAX_TRACKED_IPS: ${env}, using default ${DEFAULT_MAX_TRACKED_IPS}`);
        return DEFAULT_MAX_TRACKED_IPS;
    }
    return parsed;
}
let lastCapacityWarningTime = 0;
const CAPACITY_WARNING_COOLDOWN_MS = 60_000;
const DEFAULT_MAX_CONNECTIONS_PER_IP = 10;
const DEFAULT_MAX_PAYLOAD_SIZE_MB = 10;
const DEFAULT_CONNECTION_IDLE_TIMEOUT_MS = 5 * 60 * 1000;
let cleanupTimer = null;
function getMaxConnectionsPerIP() {
    const env = process.env.A2A_MAX_CONNECTIONS_PER_IP;
    if (!env)
        return DEFAULT_MAX_CONNECTIONS_PER_IP;
    const parsed = parseInt(env, 10);
    if (isNaN(parsed) || parsed <= 0) {
        logger.warn(`Invalid A2A_MAX_CONNECTIONS_PER_IP: ${env}, using default ${DEFAULT_MAX_CONNECTIONS_PER_IP}`);
        return DEFAULT_MAX_CONNECTIONS_PER_IP;
    }
    return parsed;
}
function getMaxPayloadSizeMB() {
    const env = process.env.A2A_MAX_PAYLOAD_SIZE_MB;
    if (!env)
        return DEFAULT_MAX_PAYLOAD_SIZE_MB;
    const parsed = parseInt(env, 10);
    if (isNaN(parsed) || parsed <= 0 || parsed > 100) {
        logger.warn(`Invalid A2A_MAX_PAYLOAD_SIZE_MB: ${env}, using default ${DEFAULT_MAX_PAYLOAD_SIZE_MB}`);
        return DEFAULT_MAX_PAYLOAD_SIZE_MB;
    }
    return parsed;
}
function cleanupIdleConnections(aggressive = false) {
    const now = Date.now();
    const timeout = aggressive
        ? 30_000
        : DEFAULT_CONNECTION_IDLE_TIMEOUT_MS;
    let cleaned = 0;
    for (const [ip, data] of connections.entries()) {
        if (data.count === 0 || now - data.lastActivity > timeout) {
            connections.delete(ip);
            cleaned++;
        }
    }
    if (cleaned > 0) {
        logger.debug('[Resource Protection] Cleaned up idle connections', {
            count: cleaned,
            remaining: connections.size,
            aggressive,
        });
    }
    return cleaned;
}
export function startResourceProtectionCleanup() {
    if (cleanupTimer) {
        return;
    }
    cleanupTimer = setInterval(() => {
        cleanupIdleConnections();
    }, 60 * 1000);
    logger.info('[Resource Protection] Cleanup started');
}
export function stopResourceProtectionCleanup() {
    if (cleanupTimer) {
        clearInterval(cleanupTimer);
        cleanupTimer = null;
        logger.info('[Resource Protection] Cleanup stopped');
    }
}
export function clearConnectionTracking() {
    connections.clear();
}
export function getConnectionStats() {
    const totalIPs = connections.size;
    let totalConnections = 0;
    for (const data of connections.values()) {
        totalConnections += data.count;
    }
    const topIPs = Array.from(connections.entries())
        .map(([ip, data]) => ({ ip, connections: data.count }))
        .sort((a, b) => b.connections - a.connections)
        .slice(0, 10);
    return {
        totalIPs,
        totalConnections,
        topIPs,
    };
}
export function connectionLimitMiddleware() {
    const maxConnections = getMaxConnectionsPerIP();
    const maxTrackedIPs = getMaxTrackedIPs();
    return (req, res, next) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        let connectionData = connections.get(ip);
        if (!connectionData) {
            if (connections.size >= maxTrackedIPs) {
                const cleaned = cleanupIdleConnections(true);
                if (connections.size >= maxTrackedIPs) {
                    if (now - lastCapacityWarningTime > CAPACITY_WARNING_COOLDOWN_MS) {
                        lastCapacityWarningTime = now;
                        logger.warn('[Resource Protection] IP tracking capacity exhausted', {
                            maxTrackedIPs,
                            currentTrackedIPs: connections.size,
                            cleanedInAttempt: cleaned,
                            rejectedIP: ip,
                        });
                    }
                    res.status(503).json({
                        success: false,
                        error: {
                            code: 'SERVICE_OVERLOADED',
                            message: 'Service temporarily overloaded, please try again later',
                        },
                    });
                    return;
                }
            }
            connectionData = { count: 0, lastActivity: now };
            connections.set(ip, connectionData);
        }
        if (connectionData.count >= maxConnections) {
            logger.warn('[Resource Protection] Connection limit exceeded', {
                ip,
                currentConnections: connectionData.count,
                maxConnections,
            });
            res.status(503).json({
                success: false,
                error: {
                    code: 'CONNECTION_LIMIT_EXCEEDED',
                    message: `Too many concurrent connections from your IP. Maximum: ${maxConnections}`,
                },
            });
            return;
        }
        connectionData.count++;
        connectionData.lastActivity = now;
        let decremented = false;
        const decrementConnection = () => {
            if (decremented)
                return;
            decremented = true;
            const data = connections.get(ip);
            if (data) {
                data.count = Math.max(0, data.count - 1);
                data.lastActivity = Date.now();
                if (data.count === 0) {
                    connections.delete(ip);
                }
            }
        };
        res.on('finish', decrementConnection);
        res.on('close', decrementConnection);
        next();
    };
}
export function payloadSizeLimitMiddleware() {
    const maxSizeMB = getMaxPayloadSizeMB();
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return (req, res, next) => {
        const contentLength = req.get('content-length');
        if (contentLength) {
            const size = parseInt(contentLength, 10);
            if (isNaN(size)) {
                logger.warn('[Resource Protection] Invalid Content-Length header', {
                    contentLength,
                    ip: req.ip,
                });
                res.status(400).json({
                    success: false,
                    error: {
                        code: 'INVALID_CONTENT_LENGTH',
                        message: 'Invalid Content-Length header',
                    },
                });
                return;
            }
            if (size > maxSizeBytes) {
                logger.warn('[Resource Protection] Payload size exceeded', {
                    size,
                    maxSize: maxSizeBytes,
                    ip: req.ip,
                });
                res.status(413).json({
                    success: false,
                    error: {
                        code: 'PAYLOAD_TOO_LARGE',
                        message: `Request payload too large. Maximum: ${maxSizeMB}MB`,
                        maxSizeMB,
                    },
                });
                return;
            }
        }
        next();
    };
}
export function memoryPressureMiddleware() {
    return (req, res, next) => {
        const memUsage = process.memoryUsage();
        const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
        const heapTotalMB = memUsage.heapTotal / 1024 / 1024;
        const heapUsagePercent = (heapUsedMB / heapTotalMB) * 100;
        if (heapUsagePercent > 90) {
            logger.warn('[Resource Protection] High memory pressure', {
                heapUsedMB: heapUsedMB.toFixed(2),
                heapTotalMB: heapTotalMB.toFixed(2),
                heapUsagePercent: heapUsagePercent.toFixed(2),
            });
            res.status(503).json({
                success: false,
                error: {
                    code: 'SERVICE_OVERLOADED',
                    message: 'Service temporarily overloaded, please try again later',
                },
            });
            return;
        }
        next();
    };
}
export function resourceProtectionMiddleware() {
    return [
        memoryPressureMiddleware(),
        connectionLimitMiddleware(),
        payloadSizeLimitMiddleware(),
    ];
}
//# sourceMappingURL=resourceProtection.js.map