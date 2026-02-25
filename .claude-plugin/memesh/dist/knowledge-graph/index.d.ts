import type { Entity, Relation, SearchQuery, RelationTrace } from './types.js';
export interface SemanticSearchResult {
    entity: Entity;
    similarity: number;
}
export declare class KnowledgeGraph {
    private db;
    private queryCache;
    private vectorEnabled;
    private vectorExt;
    private vectorInitPromise;
    private pendingEmbeddings;
    private constructor();
    private validateEntityName;
    private validateRelationType;
    static create(dbPath?: string): Promise<KnowledgeGraph>;
    static createSync(dbPath?: string): KnowledgeGraph;
    private initialize;
    private initVectorSearch;
    private runMigrations;
    private escapeLikePattern;
    private searchFTS5;
    private prepareFTS5Query;
    createEntity(entity: Entity): string;
    createRelation(relation: Relation): void;
    searchEntities(query: SearchQuery): Entity[];
    getEntity(name: string): Entity | null;
    traceRelations(entityName: string, depth?: number): RelationTrace | null;
    getStats(): {
        totalEntities: number;
        totalRelations: number;
        entitiesByType: Record<string, number>;
    };
    deleteEntity(name: string): boolean;
    private generateEmbeddingAsync;
    semanticSearch(query: string, options?: {
        limit?: number;
        minSimilarity?: number;
        entityTypes?: string[];
    }): Promise<SemanticSearchResult[]>;
    hybridSearch(query: string, options?: {
        limit?: number;
        minSimilarity?: number;
    }): Promise<SemanticSearchResult[]>;
    private keywordSearchAsSemanticResults;
    isVectorSearchEnabled(): boolean;
    close(): Promise<void>;
    transaction<T>(fn: () => T): T;
    getCacheStats(): import("../db/QueryCache.js").CacheStats;
    clearCache(): void;
}
export type { Entity, Relation, SearchQuery, RelationTrace, EntityType, RelationType } from './types.js';
//# sourceMappingURL=index.d.ts.map