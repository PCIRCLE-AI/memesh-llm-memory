import { KnowledgeGraphSQLite } from './KnowledgeGraphSQLite.js';
import { Entity, Relation, SearchOptions } from './KnowledgeGraph.js';
export declare class KnowledgeAgent {
    private graph;
    private isInitialized;
    private dbPath?;
    constructor(dbPath?: string);
    initialize(): Promise<void>;
    createEntities(entities: Array<{
        name: string;
        entityType: string;
        observations: string[];
        metadata?: Record<string, unknown>;
    }>): Promise<Entity[]>;
    addObservations(entityName: string, observations: string[]): Promise<Entity | undefined>;
    searchNodes(query: string, options?: SearchOptions): Promise<Entity[]>;
    openNodes(names: string[]): Promise<Entity[]>;
    createRelations(relations: Array<{
        from: string;
        to: string;
        relationType: string;
        metadata?: Record<string, unknown>;
    }>): Promise<Relation[]>;
    deleteEntities(names: string[]): Promise<{
        deleted: string[];
        notFound: string[];
    }>;
    readGraph(): Promise<{
        entities: Entity[];
        stats: Awaited<ReturnType<KnowledgeGraphSQLite['getStats']>>;
    }>;
    getConnectedEntities(entityName: string, maxDepth?: number): Promise<string[]>;
    private printStats;
    private ensureInitialized;
    close(): Promise<void>;
    findSimilar(description: string, type?: string): Promise<SimilarTask[]>;
    getDecisions(): Promise<Decision[]>;
    getLessonsLearned(): Promise<LessonLearned[]>;
    getStats(): Promise<KnowledgeStats>;
    recordDecision(decision: {
        name: string;
        reason: string;
        alternatives: string[];
        tradeoffs: string[];
        outcome: string;
        tags: string[];
    }): Promise<Entity>;
    recordFeature(feature: {
        name: string;
        description: string;
        implementation: string;
        challenges?: string[];
        tags: string[];
    }): Promise<Entity>;
    recordBugFix(bugFix: {
        name: string;
        rootCause: string;
        solution: string;
        prevention: string;
        tags: string[];
    }): Promise<Entity>;
    recordBestPractice(practice: {
        name: string;
        description: string;
        why: string;
        example?: string;
        tags?: string[];
    }): Promise<Entity>;
}
export declare function getKnowledgeAgent(): KnowledgeAgent;
export type { Entity, Relation, SearchOptions } from './KnowledgeGraph.js';
export interface SimilarTask {
    name: string;
    similarity: number;
    metadata?: Record<string, unknown>;
}
export interface Decision {
    id: string;
    description: string;
    outcome: string;
    timestamp: Date;
}
export interface LessonLearned {
    id: string;
    lesson: string;
    context: string;
    timestamp: Date;
}
export interface KnowledgeStats {
    totalTasks: number;
    totalDecisions: number;
    totalLessons: number;
}
//# sourceMappingURL=index.d.ts.map