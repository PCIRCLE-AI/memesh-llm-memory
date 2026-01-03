import { Entity, Relation, SearchOptions } from './types';
export { Entity, Relation, SearchOptions };
export declare class KnowledgeGraph {
    private store;
    private initialized;
    constructor(dbPath?: string);
    initialize(): Promise<void>;
    createEntity(entity: Entity): Promise<void>;
    getEntity(name: string): Promise<Entity | null>;
    updateEntity(entity: Entity): Promise<void>;
    deleteEntity(name: string): Promise<void>;
    searchEntities(query: string, options?: SearchOptions): Promise<Entity[]>;
    getAllEntities(): Promise<Entity[]>;
    createRelation(relation: Relation): Promise<void>;
    getRelations(entityName: string): Promise<Relation[]>;
    deleteRelation(from: string, to: string, relationType: string): Promise<void>;
    getConnectedEntities(entityName: string, maxDepth?: number): Promise<Set<string>>;
    getStats(): Promise<{
        totalEntities: number;
        totalRelations: number;
        entityTypeBreakdown: Record<string, number>;
    }>;
    close(): Promise<void>;
    private ensureInitialized;
}
//# sourceMappingURL=KnowledgeGraph.d.ts.map