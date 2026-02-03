import type { UnifiedMemory, SearchOptions } from './types/unified-memory.js';
export declare class SmartMemoryQuery {
    search(query: string, memories: UnifiedMemory[], options?: SearchOptions & {
        projectPath?: string;
        techStack?: string[];
    }): UnifiedMemory[];
    private calculateRelevanceScore;
}
//# sourceMappingURL=SmartMemoryQuery.d.ts.map