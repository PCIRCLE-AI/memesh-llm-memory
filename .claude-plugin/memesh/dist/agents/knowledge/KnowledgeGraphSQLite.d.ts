import Database from 'better-sqlite3';
import type { Entity, Relation, SearchOptions } from './KnowledgeGraph.js';
export interface KnowledgeGraphOptions {
    dbPath?: string;
    verbose?: boolean;
}
export declare class KnowledgeGraphSQLite {
    private db;
    private options;
    private initialized;
    constructor(options?: KnowledgeGraphOptions);
    initialize(): Promise<void>;
    close(): Promise<void>;
    private createTables;
    private createIndexes;
    createEntity(entity: Omit<Entity, 'createdAt' | 'updatedAt'>): Promise<Entity>;
    getEntity(name: string): Promise<Entity | undefined>;
    updateEntity(name: string, updates: Partial<Omit<Entity, 'name' | 'createdAt' | 'updatedAt'>>): Promise<Entity | undefined>;
    deleteEntity(name: string): Promise<boolean>;
    searchEntities(query: string, options?: SearchOptions): Promise<Entity[]>;
    getAllEntities(): Promise<Entity[]>;
    createRelation(relation: Omit<Relation, 'createdAt'>): Promise<Relation>;
    getRelations(entityName: string): Promise<Relation[]>;
    deleteRelation(from: string, to: string, relationType: string): Promise<boolean>;
    getConnectedEntities(entityName: string, maxDepth?: number): Promise<Set<string>>;
    getStats(): Promise<{
        totalEntities: number;
        totalRelations: number;
        entityTypeBreakdown: Record<string, number>;
    }>;
    private rowToEntity;
    private rowToRelation;
    getDb(): Database.Database;
    optimize(): Promise<void>;
    getDatabaseStats(): Promise<{
        total_entities: number;
        total_observations: number;
        total_relations: number;
        avg_observations_per_entity: number;
    }>;
}
//# sourceMappingURL=KnowledgeGraphSQLite.d.ts.map