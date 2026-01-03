export interface CacheOptions {
    maxSize?: number;
    defaultTTL?: number;
    debug?: boolean;
}
export interface CacheStats {
    hits: number;
    misses: number;
    hitRate: number;
    size: number;
    maxSize: number;
    memoryUsage: number;
    oldestEntry: number | null;
    newestEntry: number | null;
}
export declare class QueryCache<K, V> {
    private cache;
    private maxSize;
    private defaultTTL;
    private debug;
    private hits;
    private misses;
    private cleanupInterval?;
    constructor(options?: CacheOptions);
    get(key: K): V | undefined;
    set(key: K, value: V, ttl?: number): void;
    delete(key: K): boolean;
    clear(): void;
    invalidatePattern(pattern: RegExp): number;
    has(key: K): boolean;
    getStats(): CacheStats;
    get size(): number;
    cleanup(): number;
    destroy(): void;
    static generateKey(query: string, params?: unknown[]): string;
    private evictLRU;
    private estimateSize;
}
export declare class DatabaseQueryCache<V = unknown> extends QueryCache<string, V> {
    constructor(options?: Partial<CacheOptions>);
    cachedQuery<T extends V>(query: string, params: unknown[], executor: () => T | Promise<T>, ttl?: number): Promise<T>;
}
//# sourceMappingURL=QueryCache.d.ts.map