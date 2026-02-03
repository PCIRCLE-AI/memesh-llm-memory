import type { UnifiedMemory, MemoryType } from './types/unified-memory.js';
import type { UnifiedMemoryStore } from './UnifiedMemoryStore.js';
export type MatchType = 'exact' | 'tag';
export interface EnhancedSearchResult {
    memory: UnifiedMemory;
    matchType: MatchType;
    score: number;
}
export interface EnhancedSearchOptions {
    enableTags?: boolean;
    limit?: number;
    types?: MemoryType[];
}
export declare class EnhancedRetrieval {
    private store;
    constructor(store: UnifiedMemoryStore);
    search(query: string, options?: EnhancedSearchOptions): Promise<EnhancedSearchResult[]>;
    exactMatch(query: string): Promise<UnifiedMemory[]>;
    tagMatch(query: string): Promise<UnifiedMemory[]>;
    private matchesTypeFilter;
}
//# sourceMappingURL=EnhancedRetrieval.d.ts.map