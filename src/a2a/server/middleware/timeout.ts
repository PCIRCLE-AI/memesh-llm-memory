import { Request, Response, NextFunction } from 'express';
import { logger } from '../../../utils/logger.js';

/**
 * Default request timeout in milliseconds (30 seconds)
 */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Minimum allowed timeout in milliseconds (1 second)
 */
const MIN_TIMEOUT_MS = 1_000;

/**
 * Maximum allowed timeout in milliseconds (5 minutes)
 * Prevents unreasonably long timeouts that could tie up server resources
 */
const MAX_TIMEOUT_MS = 300_000;

/**
 * Get timeout value from environment or use default
 * Validates and clamps the value within safe bounds
 */
export function getTimeoutMs(): number {
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

  // Clamp value within safe bounds
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

/**
 * Request timeout middleware to prevent DoS attacks from slow requests
 *
 * @param timeoutMs - Timeout in milliseconds (default: 30000ms / 30 seconds)
 * @returns Express middleware function
 *
 * @example
 * ```typescript
 * app.use(requestTimeoutMiddleware(30000));
 * ```
 */
export function requestTimeoutMiddleware(timeoutMs: number = getTimeoutMs()) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Set timeout timer
    const timer = setTimeout(() => {
      // Only send response if headers haven't been sent yet
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

    // Clear timer when response finishes
    res.on('finish', () => {
      clearTimeout(timer);
    });

    // Clear timer when connection closes
    res.on('close', () => {
      clearTimeout(timer);
    });

    next();
  };
}
