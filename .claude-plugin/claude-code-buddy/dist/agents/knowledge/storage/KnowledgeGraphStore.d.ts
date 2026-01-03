import { Entity, Relation } from '../types.js';
export declare class KnowledgeGraphStore {
    private db;
    private dbPath;
    private initialized;
    constructor(dbPath?: string);
    initialize(): Promise<void>;
    createEntity(entity: Entity): Promise<void>;
    getEntity(name: string): Promise<Entity | null>;
    updateEntity(entity: Entity): Promise<void>;
    deleteEntity(name: string): Promise<void>;
    searchEntities(query: string, options?: {
        entityType?: string;
        limit?: number;
        offset?: number;
    }): Promise<Entity[]>;
    createRelation(relation: Relation): Promise<void>;
    getRelations(entityName: string): Promise<Relation[]>;
    deleteRelation(from: string, to: string, relationType: string): Promise<void>;
    getAllEntities(): Promise<Entity[]>;
    close(): Promise<void>;
    private ensureInitialized;
}
//# sourceMappingURL=KnowledgeGraphStore.d.ts.map