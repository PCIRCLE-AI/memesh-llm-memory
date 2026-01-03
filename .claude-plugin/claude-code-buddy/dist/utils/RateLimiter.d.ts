export interface RateLimiterOptions {
    maxTokens?: number;
    refillRate?: number;
    refillInterval?: number;
    requestsPerMinute?: number;
}
export declare class RateLimiter {
    private tokens;
    private readonly maxTokens;
    private readonly refillRate;
    private readonly refillInterval;
    private lastRefill;
    private refillTimer?;
    constructor(options?: RateLimiterOptions);
    private startRefillTimer;
    private refill;
    consume(tokens?: number): boolean;
    getTokens(): number;
    getStatus(): {
        tokens: number;
        maxTokens: number;
        utilizationPercent: number;
    };
    reset(): void;
    stop(): void;
}
//# sourceMappingURL=RateLimiter.d.ts.map