import type { Request, Response, NextFunction } from 'express';
export interface RateLimitConfig {
    windowMs: number;
    maxRequests: number;
    message?: string;
    keyGenerator?: (req: Request) => string;
    skip?: (req: Request) => boolean;
    onLimitReached?: (req: Request, res: Response) => void;
}
interface RateLimitRecord {
    count: number;
    resetTime: number;
}
export declare function stopCleanup(): void;
export declare function clearRateLimits(): void;
export declare function getRateLimitStatus(key: string): RateLimitRecord | null;
export declare function rateLimiter(config: RateLimitConfig): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare const rateLimitPresets: {
    api: () => (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
    voice: () => (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
    auth: () => (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
    upload: () => (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
};
export declare function createIPRateLimiter(maxRequests: number, windowMs: number, message?: string): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare function createUserRateLimiter(maxRequests: number, windowMs: number, message?: string): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export default rateLimiter;
//# sourceMappingURL=rateLimiter.d.ts.map