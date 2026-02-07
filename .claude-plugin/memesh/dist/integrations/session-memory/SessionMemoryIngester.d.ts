import type { KnowledgeGraph } from '../../knowledge-graph/index.js';
import type { ParsedSessionMemory, SessionMemoryEvent, IngestionResult } from './types.js';
export declare class SessionMemoryIngester {
    private knowledgeGraph;
    constructor(knowledgeGraph: KnowledgeGraph);
    ingest(parsed: ParsedSessionMemory, event: SessionMemoryEvent): Promise<IngestionResult>;
    private createSessionEntity;
    private ingestErrorCorrections;
    private ingestLearnings;
    private ingestFileReferences;
    private ingestWorkflow;
    private safeCreateEntity;
    private createRelations;
}
//# sourceMappingURL=SessionMemoryIngester.d.ts.map