/**
 * KnowledgeGraph - Internal storage and query engine
 *
 * Provides low-level storage operations for the knowledge graph
 */

import { Entity, Relation, SearchOptions } from './types';
import { KnowledgeGraphStore } from './storage/KnowledgeGraphStore.js';
import { logger } from '../../utils/logger.js';

// Re-export types for backward compatibility
export { Entity, Relation, SearchOptions };

export class KnowledgeGraph {
  private store: KnowledgeGraphStore;
  private initialized = false;

  constructor(dbPath?: string) {
    this.store = new KnowledgeGraphStore(dbPath);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Initialize persistent storage
    await this.store.initialize();

    this.initialized = true;
    logger.info('Knowledge Graph initialized with persistent storage');
  }

  // Entity operations
  async createEntity(entity: Entity): Promise<void> {
    this.ensureInitialized();
    await this.store.createEntity(entity);
  }

  async getEntity(name: string): Promise<Entity | null> {
    this.ensureInitialized();
    return await this.store.getEntity(name);
  }

  async updateEntity(entity: Entity): Promise<void> {
    this.ensureInitialized();
    await this.store.updateEntity(entity);
  }

  async deleteEntity(name: string): Promise<void> {
    this.ensureInitialized();
    await this.store.deleteEntity(name);
  }

  async searchEntities(query: string, options: SearchOptions = {}): Promise<Entity[]> {
    this.ensureInitialized();
    return await this.store.searchEntities(query, options);
  }

  async getAllEntities(): Promise<Entity[]> {
    this.ensureInitialized();
    return await this.store.getAllEntities();
  }

  // Relation operations
  async createRelation(relation: Relation): Promise<void> {
    this.ensureInitialized();
    await this.store.createRelation(relation);
  }

  async getRelations(entityName: string): Promise<Relation[]> {
    this.ensureInitialized();
    return await this.store.getRelations(entityName);
  }

  async deleteRelation(from: string, to: string, relationType: string): Promise<void> {
    this.ensureInitialized();
    await this.store.deleteRelation(from, to, relationType);
  }

  // Graph operations
  async getConnectedEntities(entityName: string, maxDepth: number = 2): Promise<Set<string>> {
    const visited = new Set<string>();
    const queue: Array<{ name: string; depth: number }> = [{ name: entityName, depth: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (visited.has(current.name) || current.depth > maxDepth) continue;

      visited.add(current.name);

      if (current.depth < maxDepth) {
        const relations = await this.getRelations(current.name);
        for (const rel of relations) {
          if (!visited.has(rel.to)) {
            queue.push({ name: rel.to, depth: current.depth + 1 });
          }
        }
      }
    }

    return visited;
  }

  async getStats(): Promise<{
    totalEntities: number;
    totalRelations: number;
    entityTypeBreakdown: Record<string, number>;
  }> {
    this.ensureInitialized();

    const entities = await this.store.getAllEntities();
    const entityTypeBreakdown: Record<string, number> = {};

    for (const entity of entities) {
      entityTypeBreakdown[entity.entityType] = (entityTypeBreakdown[entity.entityType] || 0) + 1;
    }

    // Get total relations by querying each entity
    let totalRelations = 0;
    const countedRelations = new Set<string>();

    for (const entity of entities) {
      const relations = await this.store.getRelations(entity.name);
      for (const rel of relations) {
        // Create unique key to avoid double-counting
        const relKey = `${rel.from}:${rel.to}:${rel.relationType}`;
        if (!countedRelations.has(relKey)) {
          countedRelations.add(relKey);
          totalRelations++;
        }
      }
    }

    return {
      totalEntities: entities.length,
      totalRelations,
      entityTypeBreakdown,
    };
  }

  async close(): Promise<void> {
    await this.store.close();
    this.initialized = false;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Knowledge Graph not initialized. Call initialize() first.');
    }
  }
}
