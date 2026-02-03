import type { Request, Response, NextFunction } from 'express';
import type { RateLimitStats } from '../../types/rateLimit.js';
interface AuthenticatedRequest extends Request {
    agentId?: string;
}
export declare function startCleanup(): void;
export declare function stopCleanup(): void;
export declare function getRateLimitStats(): RateLimitStats[];
export declare function clearRateLimitData(): void;
export declare function rateLimitMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
export {};
//# sourceMappingURL=rateLimit.d.ts.map