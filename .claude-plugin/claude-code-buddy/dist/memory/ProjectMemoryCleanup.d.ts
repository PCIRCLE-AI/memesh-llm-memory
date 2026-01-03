import type { KnowledgeGraph } from '../knowledge-graph/index.js';
export declare class ProjectMemoryCleanup {
    private knowledgeGraph;
    private readonly RETENTION_DAYS;
    constructor(knowledgeGraph: KnowledgeGraph);
    cleanupOldMemories(): Promise<number>;
    private extractTimestamp;
}
//# sourceMappingURL=ProjectMemoryCleanup.d.ts.map