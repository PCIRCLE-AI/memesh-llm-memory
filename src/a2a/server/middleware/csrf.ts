/**
 * CSRF Protection Middleware
 *
 * ✅ SECURITY FIX (MEDIUM-3 + CRITICAL-3): Protects against Cross-Site Request Forgery attacks
 *
 * Security Model:
 * - Cookie-based sessions: CSRF protection REQUIRED
 * - Bearer token auth: CSRF protection NOT NEEDED (tokens not auto-sent by browser)
 *
 * This middleware automatically exempts Bearer-authenticated requests from CSRF checks
 * as they are not vulnerable to CSRF attacks.
 *
 * Implements double-submit cookie pattern:
 * - Server generates CSRF token on first request
 * - Client must include token in subsequent state-changing requests (cookie auth only)
 * - Token validated on server before processing request
 *
 * Features:
 * - Secure token generation (crypto.randomBytes)
 * - Double-submit cookie pattern
 * - Automatic token rotation
 * - Safe method exemption (GET, HEAD, OPTIONS)
 * - Bearer token exemption (not vulnerable to CSRF)
 *
 * References:
 * - CSRF Attacks: https://owasp.org/www-community/attacks/csrf
 * - OAuth 2.0 Bearer Tokens: https://datatracker.ietf.org/doc/html/rfc6750
 *
 * @module a2a/server/middleware/csrf
 */

import type { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';
import { logger } from '../../../utils/logger.js';

/**
 * CSRF token storage (in production, use Redis or database)
 * Key: token value
 * Value: expiration timestamp
 */
const tokens = new Map<string, number>();

/**
 * Token expiration time (1 hour)
 */
const TOKEN_EXPIRATION_MS = 60 * 60 * 1000;

/**
 * Safe HTTP methods that don't require CSRF protection
 */
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

/**
 * Generate a secure CSRF token
 *
 * Uses crypto.randomBytes for cryptographically secure random token.
 *
 * @returns Hex-encoded CSRF token (32 bytes = 64 hex chars)
 */
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Clean up expired tokens
 */
function cleanupExpiredTokens(): void {
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

/**
 * Start periodic token cleanup
 */
let cleanupInterval: NodeJS.Timeout | null = null;

export function startCsrfCleanup(): void {
  if (cleanupInterval) {
    return;
  }

  // Clean up every 10 minutes
  cleanupInterval = setInterval(() => {
    cleanupExpiredTokens();
  }, 10 * 60 * 1000);

  logger.info('[CSRF] Token cleanup started');
}

/**
 * Stop periodic token cleanup
 */
export function stopCsrfCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
    logger.info('[CSRF] Token cleanup stopped');
  }
}

/**
 * Clear all CSRF tokens (for testing)
 */
export function clearCsrfTokens(): void {
  tokens.clear();
}

/**
 * CSRF token generation middleware
 *
 * Generates and sends CSRF token in response cookie.
 * Should be applied to routes that render forms or initiate sessions.
 *
 * @example
 * ```typescript
 * app.get('/a2a/agent-card', csrfTokenMiddleware, handler);
 * ```
 */
export function csrfTokenMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Generate new token
  const token = generateToken();
  const expiration = Date.now() + TOKEN_EXPIRATION_MS;

  // Store token
  tokens.set(token, expiration);

  // Send token in cookie (httpOnly, secure, sameSite)
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, // Client needs to read this
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRATION_MS,
  });

  // Also send in header for easier access
  res.setHeader('X-CSRF-Token', token);

  next();
}

/**
 * CSRF validation middleware
 *
 * Validates CSRF token on state-changing requests (POST, PUT, DELETE, PATCH).
 * Reads token from:
 * 1. X-CSRF-Token header (preferred)
 * 2. csrf_token body field (form fallback)
 *
 * @example
 * ```typescript
 * app.post('/a2a/send-message',
 *   authenticateToken,
 *   csrfProtection,
 *   rateLimitMiddleware,
 *   handler
 * );
 * ```
 */
export function csrfProtection(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Skip CSRF check for safe methods
  if (SAFE_METHODS.includes(req.method)) {
    return next();
  }

  // ✅ CRITICAL FIX: Skip CSRF for Bearer token authentication
  // Bearer tokens are not automatically sent by browsers, so CSRF doesn't apply
  // This is industry standard: REST APIs with Bearer auth don't need CSRF protection
  const authHeader = req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    logger.debug('[CSRF] Skipping CSRF check for Bearer token authentication', {
      method: req.method,
      path: req.path,
    });
    return next();
  }

  // Get token from header or body
  const token =
    req.header('X-CSRF-Token') ||
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

  // Validate token exists and is not expired
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

    // Remove expired token
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

  // Token valid - remove it (one-time use)
  tokens.delete(token);

  // Generate new token for next request
  const newToken = generateToken();
  const newExpiration = Date.now() + TOKEN_EXPIRATION_MS;
  tokens.set(newToken, newExpiration);

  // Send new token in response
  res.setHeader('X-CSRF-Token', newToken);
  res.cookie('XSRF-TOKEN', newToken, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRATION_MS,
  });

  next();
}
