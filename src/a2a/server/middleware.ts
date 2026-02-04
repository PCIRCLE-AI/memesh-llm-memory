/**
 * A2A Server Middleware
 * Error handling and logging middleware for Express
 */

import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger.js';
import type { ServiceError } from '../types/index.js';

/**
 * Error handler middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('[A2A Server] Error', {
    error: err.message,
    stack: err.stack,
    method: req.method,
    path: req.path,
  });

  const error: ServiceError = {
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

/**
 * Request logger middleware
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
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

/**
 * CORS middleware for local A2A communication only
 * Phase 0.5: Restricted to localhost origins only
 *
 * Security note: Credentials are only allowed for validated localhost origins.
 * This prevents CORS misconfiguration by not reflecting arbitrary origins with credentials.
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  // Explicitly define allowed localhost origins to prevent reflected origin attacks
  // Only exact localhost patterns are permitted (no wildcard reflection)
  const ALLOWED_LOCALHOST_PATTERNS = [
    'http://localhost:',
    'http://127.0.0.1:',
    'https://localhost:',
    'https://127.0.0.1:',
  ] as const;

  const isValidLocalhost = origin && ALLOWED_LOCALHOST_PATTERNS.some(
    (pattern) => origin.startsWith(pattern)
  );

  // Set CORS headers only for validated localhost origins
  // This prevents credentials from being sent to arbitrary reflected origins
  if (isValidLocalhost) {
    res.header('Access-Control-Allow-Origin', origin);
    // Only allow credentials for validated localhost origins (security fix)
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
}

/**
 * JSON body parser error handler
 */
export function jsonErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  if (err instanceof SyntaxError && 'body' in err) {
    const error: ServiceError = {
      code: 'INVALID_JSON',
      message: 'Invalid JSON in request body',
      details: { error: err.message },
    };

    res.status(400).json({
      success: false,
      error,
    });
  } else {
    next(err);
  }
}
