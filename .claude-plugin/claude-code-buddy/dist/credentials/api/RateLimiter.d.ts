export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
    message?: string;
    skip?: (tenantId: string, endpoint: string) => boolean;
}
export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    limit: number;
    resetAt: number;
    retryAfter?: number;
}
export declare class RateLimiter {
    private store;
    protected config: RateLimitConfig;
    private cleanupInterval;
    constructor(config: RateLimitConfig);
    checkLimit(tenantId: string, endpoint?: string): Promise<RateLimitResult>;
    reset(tenantId: string, endpoint?: string): void;
    getUsage(tenantId: string, endpoint?: string): {
        count: number;
        limit: number;
        resetAt: number | null;
    };
    getHeaders(result: RateLimitResult): Record<string, string>;
    private startCleanup;
    private cleanup;
    private getKey;
    dispose(): void;
}
export declare class DistributedRateLimiter extends RateLimiter {
    private redisClient;
    constructor(config: RateLimitConfig, redisClient: any);
    checkLimit(tenantId: string, endpoint?: string): Promise<RateLimitResult>;
    reset(tenantId: string, endpoint?: string): Promise<void>;
}
//# sourceMappingURL=RateLimiter.d.ts.map