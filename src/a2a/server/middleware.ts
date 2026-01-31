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
  next: NextFunction
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
 */
export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;

  // Only allow localhost origins (http://localhost:*, http://127.0.0.1:*)
  const isLocalhost = origin && (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('http://127.0.0.1:') ||
    origin.startsWith('https://localhost:') ||
    origin.startsWith('https://127.0.0.1:')
  );

  if (isLocalhost) {
    res.header('Access-Control-Allow-Origin', origin);
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

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
  req: Request,
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
