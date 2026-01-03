import type { KnowledgeGraph } from '../knowledge-graph/index.js';
import type { Entity } from '../knowledge-graph/types.js';
export interface RecallOptions {
    limit?: number;
    types?: string[];
    since?: Date;
}
export declare class ProjectMemoryManager {
    private knowledgeGraph;
    constructor(knowledgeGraph: KnowledgeGraph);
    recallRecentWork(options?: RecallOptions): Promise<Entity[]>;
    search(query: string, limit?: number): Promise<Entity[]>;
}
//# sourceMappingURL=ProjectMemoryManager.d.ts.map