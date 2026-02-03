import type { KnowledgeGraph } from '../knowledge-graph/index.js';
export interface CleanupResult {
    deleted: number;
    failed: number;
    errors: Array<{
        entity: string;
        error: string;
    }>;
}
export declare class ProjectMemoryCleanup {
    private knowledgeGraph;
    private readonly RETENTION_DAYS;
    constructor(knowledgeGraph: KnowledgeGraph);
    cleanupOldMemories(): Promise<CleanupResult>;
    private extractTimestamp;
}
//# sourceMappingURL=ProjectMemoryCleanup.d.ts.map