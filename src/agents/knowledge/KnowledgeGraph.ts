/**
 * KnowledgeGraph - Internal storage and query engine
 *
 * Similar to VectorStore in RAGAgent - provides low-level storage operations
 */

export interface Entity {
  name: string;
  entityType: string;
  observations: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Relation {
  from: string;
  to: string;
  relationType: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface SearchOptions {
  entityType?: string;
  limit?: number;
  offset?: number;
}

export class KnowledgeGraph {
  private entities: Map<string, Entity>;
  private relations: Map<string, Relation[]>;
  private initialized: boolean;

  constructor() {
    this.entities = new Map();
    this.relations = new Map();
    this.initialized = false;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // TODO: Load from persistent storage if needed
    // For now, in-memory storage is sufficient

    this.initialized = true;
  }

  // Entity operations
  async createEntity(entity: Omit<Entity, 'createdAt' | 'updatedAt'>): Promise<Entity> {
    const now = new Date();
    const fullEntity: Entity = {
      ...entity,
      createdAt: now,
      updatedAt: now,
    };

    this.entities.set(entity.name, fullEntity);
    return fullEntity;
  }

  async getEntity(name: string): Promise<Entity | undefined> {
    return this.entities.get(name);
  }

  async updateEntity(name: string, updates: Partial<Omit<Entity, 'name' | 'createdAt' | 'updatedAt'>>): Promise<Entity | undefined> {
    const entity = this.entities.get(name);
    if (!entity) return undefined;

    const updated: Entity = {
      ...entity,
      ...updates,
      updatedAt: new Date(),
    };

    this.entities.set(name, updated);
    return updated;
  }

  async deleteEntity(name: string): Promise<boolean> {
    const deleted = this.entities.delete(name);
    if (deleted) {
      // Also delete all relations involving this entity
      this.relations.delete(name);
      for (const [key, relations] of this.relations.entries()) {
        this.relations.set(
          key,
          relations.filter((r) => r.to !== name)
        );
      }
    }
    return deleted;
  }

  async searchEntities(query: string, options: SearchOptions = {}): Promise<Entity[]> {
    const results: Entity[] = [];

    for (const entity of this.entities.values()) {
      // Simple string matching for now
      const matchesQuery =
        entity.name.toLowerCase().includes(query.toLowerCase()) ||
        entity.entityType.toLowerCase().includes(query.toLowerCase()) ||
        entity.observations.some((obs) => obs.toLowerCase().includes(query.toLowerCase()));

      const matchesType = !options.entityType || entity.entityType === options.entityType;

      if (matchesQuery && matchesType) {
        results.push(entity);
      }
    }

    // Apply pagination
    const offset = options.offset || 0;
    const limit = options.limit || 100;
    return results.slice(offset, offset + limit);
  }

  async getAllEntities(): Promise<Entity[]> {
    return Array.from(this.entities.values());
  }

  // Relation operations
  async createRelation(relation: Omit<Relation, 'createdAt'>): Promise<Relation> {
    const fullRelation: Relation = {
      ...relation,
      createdAt: new Date(),
    };

    const relations = this.relations.get(relation.from) || [];
    relations.push(fullRelation);
    this.relations.set(relation.from, relations);

    return fullRelation;
  }

  async getRelations(entityName: string): Promise<Relation[]> {
    return this.relations.get(entityName) || [];
  }

  async deleteRelation(from: string, to: string, relationType: string): Promise<boolean> {
    const relations = this.relations.get(from);
    if (!relations) return false;

    const filtered = relations.filter(
      (r) => !(r.to === to && r.relationType === relationType)
    );

    if (filtered.length === relations.length) return false;

    this.relations.set(from, filtered);
    return true;
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
    const entityTypeBreakdown: Record<string, number> = {};

    for (const entity of this.entities.values()) {
      entityTypeBreakdown[entity.entityType] = (entityTypeBreakdown[entity.entityType] || 0) + 1;
    }

    let totalRelations = 0;
    for (const relations of this.relations.values()) {
      totalRelations += relations.length;
    }

    return {
      totalEntities: this.entities.size,
      totalRelations,
      entityTypeBreakdown,
    };
  }
}
