import type { Credential } from '../types.js';
export interface CacheConfig {
    maxSize?: number;
    defaultTTL?: number;
    enableStats?: boolean;
}
export interface CacheStats {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    size: number;
    hitRate: number;
    averageHits: number;
}
export declare class LRUCache<T = any> {
    private cache;
    private config;
    private stats;
    constructor(config?: CacheConfig);
    get(key: string): T | null;
    set(key: string, value: T, ttl?: number): void;
    delete(key: string): boolean;
    has(key: string): boolean;
    clear(): void;
    getStats(): CacheStats;
    private evictLRU;
    private updateHitRate;
    cleanup(): number;
}
export declare class CredentialCache {
    private cache;
    constructor(config?: CacheConfig);
    get(service: string, account: string): Credential | null;
    set(credential: Credential, ttl?: number): void;
    invalidate(service: string, account: string): void;
    invalidateService(service: string): number;
    getStats(): CacheStats;
    clear(): void;
    private getKey;
}
export declare class DistributedCache<T = any> {
    private redisClient;
    private config;
    private fallbackCache;
    constructor(redisClient: any, config?: CacheConfig);
    get(key: string): Promise<T | null>;
    set(key: string, value: T, ttl?: number): Promise<void>;
    delete(key: string): Promise<void>;
    clear(): Promise<void>;
    getStats(): CacheStats;
}
//# sourceMappingURL=CacheLayer.d.ts.map