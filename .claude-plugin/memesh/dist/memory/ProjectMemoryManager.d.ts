import type { KnowledgeGraph } from '../knowledge-graph/index.js';
import type { Entity, EntityType } from '../knowledge-graph/types.js';
export type MemoryEntityType = 'code_change' | 'test_result' | 'session_snapshot' | 'project_snapshot' | 'workflow_checkpoint' | 'commit';
export interface RecallOptions {
    limit?: number;
    types?: EntityType[];
    since?: Date;
}
export declare class ProjectMemoryManager {
    private knowledgeGraph;
    constructor(knowledgeGraph: KnowledgeGraph);
    recallRecentWork(options?: RecallOptions): Promise<Entity[]>;
    search(query: string, limit?: number): Promise<Entity[]>;
}
//# sourceMappingURL=ProjectMemoryManager.d.ts.map