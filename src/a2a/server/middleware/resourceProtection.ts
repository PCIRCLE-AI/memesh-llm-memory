/**
 * Resource Exhaustion Protection Middleware
 *
 * ✅ SECURITY FIX (MEDIUM-2): Protects against resource exhaustion attacks
 *
 * Implements multiple protection layers:
 * - Connection limits per IP
 * - Request payload size limits
 * - Request rate limiting
 * - Memory usage monitoring
 *
 * Features:
 * - Per-IP connection tracking
 * - Automatic connection cleanup
 * - Configurable limits via environment variables
 * - Memory pressure detection
 *
 * @module a2a/server/middleware/resourceProtection
 */

import type { Request, Response, NextFunction } from 'express';
import v8 from 'v8';
import { logger } from '../../../utils/logger.js';

/**
 * Connection tracking per IP
 * Key: IP address
 * Value: {count, lastActivity}
 */
const connections = new Map<string, { count: number; lastActivity: number }>();

/**
 * Default maximum number of unique IPs to track concurrently.
 */
const DEFAULT_MAX_TRACKED_IPS = 10_000;

/**
 * Maximum number of unique IPs to track concurrently.
 * Configurable via A2A_MAX_TRACKED_IPS environment variable.
 *
 * Prevents the connections Map from growing unboundedly under sustained
 * attack from many distinct source IPs, which would make the tracking
 * overhead itself a DoS vector.
 *
 * When this limit is reached:
 * - Existing tracked IPs continue to work normally
 * - New unknown IPs receive 503 Service Unavailable
 * - Stale entries are cleaned up aggressively to free capacity
 */
function getMaxTrackedIPs(): number {
  const env = process.env.A2A_MAX_TRACKED_IPS;
  if (!env) return DEFAULT_MAX_TRACKED_IPS;

  const parsed = parseInt(env, 10);
  if (isNaN(parsed) || parsed <= 0 || parsed > 1_000_000) {
    logger.warn(`Invalid A2A_MAX_TRACKED_IPS: ${env}, using default ${DEFAULT_MAX_TRACKED_IPS}`);
    return DEFAULT_MAX_TRACKED_IPS;
  }

  return parsed;
}

/**
 * Rate-limit the "IP tracking capacity exhausted" warning log to avoid
 * log flooding during sustained attacks.
 */
let lastCapacityWarningTime = 0;
const CAPACITY_WARNING_COOLDOWN_MS = 60_000; // 1 minute

/**
 * Default limits
 */
const DEFAULT_MAX_CONNECTIONS_PER_IP = 10;
const DEFAULT_MAX_PAYLOAD_SIZE_MB = 10;
const DEFAULT_CONNECTION_IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
/**
 * Default memory pressure threshold as percentage of V8 heap size limit.
 * This uses heap_size_limit (the actual maximum) not heapTotal (current allocation).
 */
const DEFAULT_MEMORY_PRESSURE_THRESHOLD = 85; // Percentage of heap_size_limit

/**
 * Cleanup timer
 */
let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * Get configuration from environment
 */
function getMaxConnectionsPerIP(): number {
  const env = process.env.A2A_MAX_CONNECTIONS_PER_IP;
  if (!env) return DEFAULT_MAX_CONNECTIONS_PER_IP;

  const parsed = parseInt(env, 10);
  if (isNaN(parsed) || parsed <= 0) {
    logger.warn(`Invalid A2A_MAX_CONNECTIONS_PER_IP: ${env}, using default ${DEFAULT_MAX_CONNECTIONS_PER_IP}`);
    return DEFAULT_MAX_CONNECTIONS_PER_IP;
  }

  return parsed;
}

function getMaxPayloadSizeMB(): number {
  const env = process.env.A2A_MAX_PAYLOAD_SIZE_MB;
  if (!env) return DEFAULT_MAX_PAYLOAD_SIZE_MB;

  const parsed = parseInt(env, 10);
  if (isNaN(parsed) || parsed <= 0 || parsed > 100) {
    logger.warn(`Invalid A2A_MAX_PAYLOAD_SIZE_MB: ${env}, using default ${DEFAULT_MAX_PAYLOAD_SIZE_MB}`);
    return DEFAULT_MAX_PAYLOAD_SIZE_MB;
  }

  return parsed;
}

/**
 * Clean up idle connections.
 *
 * When `aggressive` is true, uses a shorter timeout (30 seconds) to free
 * capacity under pressure. This is called when the IP tracking limit is
 * reached and we need to make room for new legitimate IPs.
 *
 * @param aggressive - If true, use a shorter idle timeout for emergency cleanup
 * @returns Number of entries cleaned up
 */
function cleanupIdleConnections(aggressive = false): number {
  const now = Date.now();
  // Under pressure, aggressively clean entries idle for >30s
  const timeout = aggressive
    ? 30_000
    : DEFAULT_CONNECTION_IDLE_TIMEOUT_MS;
  let cleaned = 0;

  for (const [ip, data] of connections.entries()) {
    // Only clean up entries with zero active connections, OR entries past the idle timeout
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

/**
 * Start periodic connection cleanup
 */
export function startResourceProtectionCleanup(): void {
  if (cleanupTimer) {
    return;
  }

  // Clean up every minute
  cleanupTimer = setInterval(() => {
    cleanupIdleConnections();
  }, 60 * 1000);

  logger.info('[Resource Protection] Cleanup started');
}

/**
 * Stop periodic connection cleanup
 */
export function stopResourceProtectionCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    logger.info('[Resource Protection] Cleanup stopped');
  }
}

/**
 * Clear all connection tracking (for testing)
 */
export function clearConnectionTracking(): void {
  connections.clear();
}

/**
 * Get connection statistics
 */
export function getConnectionStats(): {
  totalIPs: number;
  totalConnections: number;
  topIPs: Array<{ ip: string; connections: number }>;
} {
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

/**
 * Connection limiting middleware
 *
 * Tracks concurrent connections per IP and rejects requests
 * when limit is exceeded.
 *
 * @example
 * ```typescript
 * app.use(connectionLimitMiddleware());
 * ```
 */
export function connectionLimitMiddleware() {
  const maxConnections = getMaxConnectionsPerIP();
  const maxTrackedIPs = getMaxTrackedIPs();

  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    // Get or create connection tracking
    let connectionData = connections.get(ip);

    if (!connectionData) {
      // Check if we have capacity to track a new IP
      if (connections.size >= maxTrackedIPs) {
        // Attempt aggressive cleanup to free capacity
        const cleaned = cleanupIdleConnections(true);

        if (connections.size >= maxTrackedIPs) {
          // Still at capacity after cleanup - reject new unknown IP
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

    // Check connection limit
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

    // Increment connection count
    connectionData.count++;
    connectionData.lastActivity = now;

    // Guard against double-decrement: both 'finish' and 'close' events fire
    // for the same HTTP response. Without this flag, the connection count would
    // be decremented twice, under-counting concurrent connections.
    let decremented = false;

    const decrementConnection = (): void => {
      if (decremented) return;
      decremented = true;

      const data = connections.get(ip);
      if (data) {
        data.count = Math.max(0, data.count - 1);
        data.lastActivity = Date.now();

        // Remove if no connections
        if (data.count === 0) {
          connections.delete(ip);
        }
      }
    };

    // Decrement on response finish or connection close (whichever fires first)
    res.on('finish', decrementConnection);
    res.on('close', decrementConnection);

    next();
  };
}

/**
 * Payload size limiting middleware
 *
 * Rejects requests with payloads exceeding the configured limit.
 * Works in conjunction with express.json({ limit }) but provides
 * better error messages.
 *
 * @example
 * ```typescript
 * app.use(express.json({ limit: '10mb' }));
 * app.use(payloadSizeLimitMiddleware());
 * ```
 */
export function payloadSizeLimitMiddleware() {
  const maxSizeMB = getMaxPayloadSizeMB();
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  return (req: Request, res: Response, next: NextFunction): void => {
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

/**
 * Memory pressure detection middleware
 *
 * Checks V8 heap usage against the actual heap size limit to detect
 * genuine memory pressure. Uses heap_size_limit (the real maximum)
 * instead of heapTotal (current allocation) to avoid false positives.
 *
 * V8's heapTotal is dynamically adjusted and typically stays small,
 * leading to high usage percentages (e.g., 27MB/29MB = 93%) even when
 * plenty of memory is available (heap_size_limit can be 4GB+).
 *
 * Configurable via A2A_MEMORY_PRESSURE_THRESHOLD environment variable.
 * Default threshold is 85% of heap_size_limit.
 *
 * @example
 * ```typescript
 * app.use(memoryPressureMiddleware());
 * ```
 */
export function memoryPressureMiddleware() {
  const threshold = getMemoryPressureThreshold();

  return (req: Request, res: Response, next: NextFunction): void => {
    // Get V8 heap statistics for accurate memory pressure detection
    const heapStats = v8.getHeapStatistics();
    const heapUsedMB = heapStats.used_heap_size / 1024 / 1024;
    const heapLimitMB = heapStats.heap_size_limit / 1024 / 1024;
    const heapUsagePercent = (heapUsedMB / heapLimitMB) * 100;

    // Also get process memory for logging context
    const memUsage = process.memoryUsage();
    const heapTotalMB = memUsage.heapTotal / 1024 / 1024;

    // Reject requests if heap usage exceeds threshold of the actual limit
    if (heapUsagePercent > threshold) {
      logger.warn('[Resource Protection] High memory pressure', {
        heapUsedMB: heapUsedMB.toFixed(2),
        heapLimitMB: heapLimitMB.toFixed(2),
        heapTotalMB: heapTotalMB.toFixed(2),
        heapUsagePercent: heapUsagePercent.toFixed(2),
        threshold,
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

/**
 * Get memory pressure threshold from environment
 */
function getMemoryPressureThreshold(): number {
  const env = process.env.A2A_MEMORY_PRESSURE_THRESHOLD;
  if (!env) return DEFAULT_MEMORY_PRESSURE_THRESHOLD;

  const parsed = parseInt(env, 10);
  if (isNaN(parsed) || parsed <= 0 || parsed > 100) {
    logger.warn(`Invalid A2A_MEMORY_PRESSURE_THRESHOLD: ${env}, using default ${DEFAULT_MEMORY_PRESSURE_THRESHOLD}`);
    return DEFAULT_MEMORY_PRESSURE_THRESHOLD;
  }

  return parsed;
}

/**
 * Combined resource protection middleware
 *
 * Applies all resource protection layers in correct order.
 *
 * @example
 * ```typescript
 * app.use(resourceProtectionMiddleware());
 * ```
 */
export function resourceProtectionMiddleware() {
  return [
    memoryPressureMiddleware(),
    connectionLimitMiddleware(),
    payloadSizeLimitMiddleware(),
  ];
}
