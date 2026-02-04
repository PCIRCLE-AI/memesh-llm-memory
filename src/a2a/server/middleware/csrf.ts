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
 * Configuration (Environment Variables):
 * - CSRF_MAX_TOKENS: Maximum tokens to track (default: 10000, min: 100, max: 1000000)
 * - CSRF_TOKEN_EXPIRATION_MS: Token TTL in ms (default: 3600000, min: 60000, max: 86400000)
 * - CSRF_EVICTION_WARNING_COOLDOWN_MS: Warning cooldown in ms (default: 60000, min: 1000, max: 3600000)
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
import { LRUCache } from '../../../utils/lru-cache.js';

/**
 * Configuration bounds for CSRF settings.
 * These prevent misconfiguration that could cause security or performance issues.
 */
const CONFIG_BOUNDS = {
  maxTokens: { min: 100, max: 1_000_000, default: 10_000 },
  tokenExpirationMs: { min: 60_000, max: 86_400_000, default: 3_600_000 }, // 1 min to 24 hours
  evictionWarningCooldownMs: { min: 1_000, max: 3_600_000, default: 60_000 }, // 1 sec to 1 hour
} as const;

/**
 * Parse and validate a configuration value from environment variable.
 *
 * @param envVar - Environment variable name
 * @param defaultValue - Default value if env var not set or invalid
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns Validated configuration value
 */
function getConfigValue(
  envVar: string,
  defaultValue: number,
  min: number,
  max: number
): number {
  const envValue = process.env[envVar];
  if (!envValue) {
    return defaultValue;
  }

  const parsed = parseInt(envValue, 10);
  if (isNaN(parsed)) {
    logger.warn(`[CSRF] Invalid ${envVar}="${envValue}" (not a number), using default ${defaultValue}`);
    return defaultValue;
  }

  if (parsed < min || parsed > max) {
    logger.warn(
      `[CSRF] Invalid ${envVar}=${parsed} (out of bounds [${min}, ${max}]), using default ${defaultValue}`
    );
    return defaultValue;
  }

  return parsed;
}

/**
 * Maximum number of CSRF tokens to track.
 * Prevents unbounded memory growth under attack.
 * When exceeded, the LRU cache automatically evicts least-recently-used tokens.
 *
 * Configurable via CSRF_MAX_TOKENS environment variable.
 * Default: 10000, Min: 100, Max: 1000000
 */
const MAX_TOKENS = getConfigValue(
  'CSRF_MAX_TOKENS',
  CONFIG_BOUNDS.maxTokens.default,
  CONFIG_BOUNDS.maxTokens.min,
  CONFIG_BOUNDS.maxTokens.max
);

/**
 * Token expiration time in milliseconds.
 *
 * Configurable via CSRF_TOKEN_EXPIRATION_MS environment variable.
 * Default: 3600000 (1 hour), Min: 60000 (1 min), Max: 86400000 (24 hours)
 */
const TOKEN_EXPIRATION_MS = getConfigValue(
  'CSRF_TOKEN_EXPIRATION_MS',
  CONFIG_BOUNDS.tokenExpirationMs.default,
  CONFIG_BOUNDS.tokenExpirationMs.min,
  CONFIG_BOUNDS.tokenExpirationMs.max
);

/**
 * CSRF token storage using LRU cache with TTL.
 *
 * Security properties:
 * - Hard cap at MAX_TOKENS entries prevents OOM under token flooding attacks
 * - TTL ensures expired tokens are automatically invalidated on access
 * - LRU eviction policy removes oldest unused tokens first when capacity is reached
 *
 * Key: token value
 * Value: expiration timestamp (kept for explicit expiration checks and response messages)
 */
const tokens = new LRUCache<number>({
  maxSize: MAX_TOKENS,
  ttl: TOKEN_EXPIRATION_MS,
});

/**
 * Track whether we have already logged an eviction warning recently
 * to avoid log flooding during sustained attacks.
 */
let lastEvictionWarningTime = 0;

/**
 * Cooldown period for eviction warnings to prevent log flooding.
 *
 * Configurable via CSRF_EVICTION_WARNING_COOLDOWN_MS environment variable.
 * Default: 60000 (1 minute), Min: 1000 (1 sec), Max: 3600000 (1 hour)
 */
const EVICTION_WARNING_COOLDOWN_MS = getConfigValue(
  'CSRF_EVICTION_WARNING_COOLDOWN_MS',
  CONFIG_BOUNDS.evictionWarningCooldownMs.default,
  CONFIG_BOUNDS.evictionWarningCooldownMs.min,
  CONFIG_BOUNDS.evictionWarningCooldownMs.max
);

/**
 * Log CSRF configuration on module load.
 * Helps operators verify and debug configuration.
 */
logger.info('[CSRF] Configuration loaded', {
  maxTokens: MAX_TOKENS,
  tokenExpirationMs: TOKEN_EXPIRATION_MS,
  evictionWarningCooldownMs: EVICTION_WARNING_COOLDOWN_MS,
});

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
 * Store a CSRF token, with capacity-pressure logging.
 *
 * When the LRU cache is at capacity, new insertions automatically evict
 * the least-recently-used entry. This function logs a warning (rate-limited)
 * when the cache is full so operators are aware of potential token flooding.
 *
 * @param token - The CSRF token string
 * @param expiration - Expiration timestamp (ms since epoch)
 */
function storeToken(token: string, expiration: number): void {
  const atCapacity = tokens.size() >= MAX_TOKENS;

  tokens.set(token, expiration);

  if (atCapacity) {
    const now = Date.now();
    if (now - lastEvictionWarningTime > EVICTION_WARNING_COOLDOWN_MS) {
      lastEvictionWarningTime = now;
      logger.warn('[CSRF] Token cache at capacity, LRU eviction triggered', {
        maxTokens: MAX_TOKENS,
        currentSize: tokens.size(),
      });
    }
  }
}

/**
 * Clean up expired tokens
 */
function cleanupExpiredTokens(): void {
  const cleaned = tokens.cleanupExpired();

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

  // Store token (with capacity-pressure protection)
  storeToken(token, expiration);

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

  // Validate token exists and is not expired.
  //
  // We use peek() instead of has()+get() because both has() and get() auto-delete
  // expired entries, making it impossible to distinguish "missing" from "expired".
  // peek() returns the raw entry without TTL side-effects, allowing us to provide
  // accurate error codes (CSRF_TOKEN_INVALID vs CSRF_TOKEN_EXPIRED).
  const entry = tokens.peek(token);

  if (!entry) {
    // Token not in cache at all (never issued, already consumed, or evicted)
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

  // Check if the token has expired using the stored expiration timestamp
  if (entry.value < Date.now()) {
    logger.warn('[CSRF] Expired CSRF token', {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });

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
  storeToken(newToken, newExpiration);

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
