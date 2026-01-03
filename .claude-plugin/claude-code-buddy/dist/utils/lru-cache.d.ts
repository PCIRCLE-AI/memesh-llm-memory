export interface LRUCacheOptions<V> {
    maxSize: number;
    ttl?: number;
    persistPath?: string;
    onEvict?: (key: string, value: V) => void;
}
export declare class LRUCache<V = unknown> {
    private cache;
    private accessOrder;
    private maxSize;
    private ttl?;
    private persistPath?;
    private onEvict?;
    private hits;
    private misses;
    private evictions;
    constructor(options: LRUCacheOptions<V>);
    get(key: string): V | undefined;
    set(key: string, value: V): void;
    has(key: string): boolean;
    delete(key: string): boolean;
    clear(): void;
    size(): number;
    keys(): string[];
    getStats(): {
        size: number;
        maxSize: number;
        hits: number;
        misses: number;
        evictions: number;
        hitRate: number;
        averageAccessCount: number;
    };
    resetStats(): void;
    cleanupExpired(): number;
    private evictLRU;
    private saveToDisk;
    private loadFromDisk;
}
//# sourceMappingURL=lru-cache.d.ts.map