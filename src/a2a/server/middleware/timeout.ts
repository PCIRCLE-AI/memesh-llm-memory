import { Request, Response, NextFunction } from 'express';

/**
 * Default request timeout in milliseconds (30 seconds)
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Get timeout value from environment or use default
 */
export function getTimeoutMs(): number {
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
