import type { Response, NextFunction } from 'express';
import type { RateLimitStats } from '../../types/rateLimit.js';
import type { AuthenticatedRequest } from './auth.js';
export declare function startCleanup(): void;
export declare function stopCleanup(): void;
export declare function getRateLimitStats(): RateLimitStats[];
export declare function clearRateLimitData(): void;
export declare function rateLimitMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void;
//# sourceMappingURL=rateLimit.d.ts.map