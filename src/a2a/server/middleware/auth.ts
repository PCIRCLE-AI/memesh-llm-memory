import type { Request, Response, NextFunction } from 'express';
import { logger } from '../../../utils/logger.js';

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

  if (token !== validToken) {
    res.status(401).json({
      error: 'Invalid authentication token',
      code: 'AUTH_INVALID'
    });
    return;
  }

  next();
}
