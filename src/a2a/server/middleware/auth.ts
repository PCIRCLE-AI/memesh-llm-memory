import type { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { logger } from '../../../utils/logger.js';

/**
 * Authenticated request with agentId
 */
export interface AuthenticatedRequest extends Request {
  agentId?: string;
}

/**
 * Performs constant-time string comparison to prevent timing attacks
 *
 * @param a - First string to compare
 * @param b - Second string to compare
 * @returns true if strings are equal, false otherwise
 */
function constantTimeCompare(a: string, b: string): boolean {
  // Ensure both strings are the same length for timingSafeEqual
  // If lengths differ, still perform a comparison to maintain constant time
  if (a.length !== b.length) {
    // Compare against a dummy string of the same length to prevent timing leaks
    const dummy = 'x'.repeat(b.length);
    const bufferA = Buffer.from(a.length >= b.length ? a : dummy, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');

    // Ensure both buffers are same length
    if (bufferA.length !== bufferB.length) {
      return false;
    }

    timingSafeEqual(bufferA, bufferB);
    return false; // Length mismatch = not equal
  }

  try {
    const bufferA = Buffer.from(a, 'utf8');
    const bufferB = Buffer.from(b, 'utf8');
    return timingSafeEqual(bufferA, bufferB);
  } catch (error) {
    logger.error('Error in constant-time comparison', { error });
    return false;
  }
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  const validToken = process.env.MEMESH_A2A_TOKEN;

  if (!validToken) {
    logger.error('MEMESH_A2A_TOKEN not configured');
    res.status(500).json({
      error: 'Server configuration error',
      code: 'TOKEN_NOT_CONFIGURED'
    });
    return;
  }

  if (!token) {
    res.status(401).json({
      error: 'Authentication token required',
      code: 'AUTH_MISSING'
    });
    return;
  }

  // Use constant-time comparison to prevent timing attacks
  if (!constantTimeCompare(token, validToken)) {
    res.status(401).json({
      error: 'Invalid authentication token',
      code: 'AUTH_INVALID'
    });
    return;
  }

  // Extract agentId from request body (for rate limiting)
  // Note: agentCard is present in /a2a/send-message requests
  const authReq = req as AuthenticatedRequest;
  const body = req.body as any;

  if (body?.agentCard?.id) {
    authReq.agentId = body.agentCard.id;
  } else {
    // For endpoints without agentCard in body (GET requests),
    // use a fallback identifier based on the token
    // In production, this should be extracted from JWT or similar
    authReq.agentId = `token-${token.substring(0, 8)}`;
  }

  next();
}
