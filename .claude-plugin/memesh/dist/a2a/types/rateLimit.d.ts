export interface RateLimitConfig {
    maxRequests: number;
    windowMs: number;
}
export interface TokenBucket {
    tokens: number;
    maxTokens: number;
    lastRefill: number;
    refillRate: number;
}
export interface RateLimitError {
    success: false;
    error: {
        code: 'RATE_LIMIT_EXCEEDED';
        message: string;
        retryAfter: number;
    };
}
export interface RateLimitStats {
    agentId: string;
    endpoint: string;
    limitExceeded: number;
    totalRequests: number;
    lastLimitHit?: number;
}
//# sourceMappingURL=rateLimit.d.ts.map