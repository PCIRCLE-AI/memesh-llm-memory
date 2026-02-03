export type MemoryType = 'mistake' | 'conversation' | 'knowledge' | 'decision' | 'experience' | 'prevention-rule' | 'user-preference';
export interface UnifiedMemory {
    id?: string;
    type: MemoryType;
    content: string;
    context?: string;
    tags: string[];
    importance: number;
    timestamp: Date;
    relations?: string[];
    metadata?: Record<string, unknown>;
    scopeMetadata?: import('./memory-scope.js').MemoryScopeMetadata;
}
export interface SearchOptions {
    types?: MemoryType[];
    tags?: string[];
    timeRange?: 'last-24h' | 'last-7-days' | 'last-30-days' | 'all';
    limit?: number;
    minImportance?: number;
}
export interface SearchResult {
    memory: UnifiedMemory;
    score: number;
}
export declare const MEMORY_TYPE_TO_ENTITY_TYPE: Record<MemoryType, string>;
export declare const ENTITY_TYPE_TO_MEMORY_TYPE: Record<string, MemoryType>;
//# sourceMappingURL=unified-memory.d.ts.map