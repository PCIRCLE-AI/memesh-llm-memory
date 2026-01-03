import type { Entity, Relation, SearchQuery, RelationTrace } from './types.js';
export declare class KnowledgeGraph {
    private db;
    private dbPath;
    private queryCache;
    private constructor();
    static create(dbPath?: string): Promise<KnowledgeGraph>;
    static createSync(dbPath?: string): KnowledgeGraph;
    private initialize;
    private escapeLikePattern;
    createEntity(entity: Entity): number;
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
    close(): void;
    getCacheStats(): import("../db/QueryCache.js").CacheStats;
    clearCache(): void;
}
export type { Entity, Relation, SearchQuery, RelationTrace, EntityType, RelationType } from './types.js';
//# sourceMappingURL=index.d.ts.map