/**
 * Knowledge Agent - Knowledge Graph Service
 *
 * Pattern: Similar to RAGAgent - provides knowledge graph services
 * Used by: MCP tools in server.ts (not the other way around)
 */

import { KnowledgeGraph, Entity, Relation, SearchOptions } from './KnowledgeGraph.js';

export class KnowledgeAgent {
  private graph: KnowledgeGraph;
  private isInitialized = false;
  private dbPath?: string; // For backward compatibility, not used in current implementation

  constructor(dbPath?: string) {
    this.graph = new KnowledgeGraph();
    this.dbPath = dbPath; // Store for future use, currently using in-memory storage
    if (dbPath) {
      console.log(`KnowledgeAgent initialized with dbPath: ${dbPath} (currently using in-memory storage)`);
    }
  }

  /**
   * Initialize the Knowledge Agent
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('Knowledge Agent already initialized');
      return;
    }

    console.log('Initializing Knowledge Agent...');
    await this.graph.initialize();

    this.isInitialized = true;
    console.log('Knowledge Agent initialized successfully');

    await this.printStats();
  }

  /**
   * Create entities in the knowledge graph
   */
  async createEntities(entities: Array<{
    name: string;
    entityType: string;
    observations: string[];
    metadata?: Record<string, unknown>;
  }>): Promise<Entity[]> {
    this.ensureInitialized();

    const created: Entity[] = [];
    for (const entity of entities) {
      const result = await this.graph.createEntity(entity);
      created.push(result);
    }

    console.log(`Created ${created.length} entities`);
    return created;
  }

  /**
   * Add observations to existing entity
   */
  async addObservations(entityName: string, observations: string[]): Promise<Entity | undefined> {
    this.ensureInitialized();

    const entity = await this.graph.getEntity(entityName);
    if (!entity) {
      console.warn(`Entity not found: ${entityName}`);
      return undefined;
    }

    const updated = await this.graph.updateEntity(entityName, {
      observations: [...entity.observations, ...observations],
    });

    console.log(`Added ${observations.length} observations to ${entityName}`);
    return updated;
  }

  /**
   * Search for nodes in the knowledge graph
   */
  async searchNodes(query: string, options: SearchOptions = {}): Promise<Entity[]> {
    this.ensureInitialized();

    const results = await this.graph.searchEntities(query, options);
    console.log(`Found ${results.length} matching entities`);
    return results;
  }

  /**
   * Open specific nodes by name
   */
  async openNodes(names: string[]): Promise<Entity[]> {
    this.ensureInitialized();

    const entities: Entity[] = [];
    for (const name of names) {
      const entity = await this.graph.getEntity(name);
      if (entity) {
        entities.push(entity);
      } else {
        console.warn(`Entity not found: ${name}`);
      }
    }

    return entities;
  }

  /**
   * Create relations between entities
   */
  async createRelations(relations: Array<{
    from: string;
    to: string;
    relationType: string;
    metadata?: Record<string, unknown>;
  }>): Promise<Relation[]> {
    this.ensureInitialized();

    const created: Relation[] = [];
    for (const relation of relations) {
      // Verify both entities exist
      const fromEntity = await this.graph.getEntity(relation.from);
      const toEntity = await this.graph.getEntity(relation.to);

      if (!fromEntity || !toEntity) {
        console.warn(`Cannot create relation: entity not found (from: ${relation.from}, to: ${relation.to})`);
        continue;
      }

      const result = await this.graph.createRelation(relation);
      created.push(result);
    }

    console.log(`Created ${created.length} relations`);
    return created;
  }

  /**
   * Delete entities from the knowledge graph
   */
  async deleteEntities(names: string[]): Promise<{ deleted: string[]; notFound: string[] }> {
    this.ensureInitialized();

    const deleted: string[] = [];
    const notFound: string[] = [];

    for (const name of names) {
      const success = await this.graph.deleteEntity(name);
      if (success) {
        deleted.push(name);
      } else {
        notFound.push(name);
      }
    }

    console.log(`Deleted ${deleted.length} entities`);
    if (notFound.length > 0) {
      console.warn(`Not found: ${notFound.join(', ')}`);
    }

    return { deleted, notFound };
  }

  /**
   * Read the entire knowledge graph
   */
  async readGraph(): Promise<{
    entities: Entity[];
    stats: Awaited<ReturnType<KnowledgeGraph['getStats']>>;
  }> {
    this.ensureInitialized();

    const entities = await this.graph.getAllEntities();
    const stats = await this.graph.getStats();

    return { entities, stats };
  }

  /**
   * Get connected entities (graph traversal)
   */
  async getConnectedEntities(entityName: string, maxDepth: number = 2): Promise<string[]> {
    this.ensureInitialized();

    const connected = await this.graph.getConnectedEntities(entityName, maxDepth);
    return Array.from(connected);
  }

  /**
   * Print statistics
   */
  private async printStats(): Promise<void> {
    const stats = await this.graph.getStats();
    console.log('Knowledge Graph Statistics:');
    console.log(`  Total Entities: ${stats.totalEntities}`);
    console.log(`  Total Relations: ${stats.totalRelations}`);
    console.log(`  Entity Types:`);
    for (const [type, count] of Object.entries(stats.entityTypeBreakdown)) {
      console.log(`    ${type}: ${count}`);
    }
  }

  /**
   * Ensure agent is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('Knowledge Agent not initialized. Call initialize() first.');
    }
  }

  /**
   * Close the knowledge agent
   */
  async close(): Promise<void> {
    // Cleanup if needed
    this.isInitialized = false;
    console.log('Knowledge Agent closed');
  }

  // ========================================
  // Legacy Methods (Stub implementations for backward compatibility)
  // These will be replaced with proper knowledge graph operations in future tasks
  // ========================================

  /**
   * Find similar tasks from knowledge graph (STUB)
   * TODO: Implement using knowledge graph similarity search
   */
  async findSimilar(description: string, type?: string): Promise<SimilarTask[]> {
    // Stub: return empty array
    console.warn('findSimilar is a stub method - use searchNodes instead');
    return [];
  }

  /**
   * Get decision history (STUB)
   * TODO: Implement using knowledge graph entities with type 'decision'
   */
  async getDecisions(): Promise<Decision[]> {
    // Stub: return empty array
    console.warn('getDecisions is a stub method - use searchNodes with entityType="decision" instead');
    return [];
  }

  /**
   * Get lessons learned (STUB)
   * TODO: Implement using knowledge graph entities with type 'lesson_learned'
   */
  async getLessonsLearned(): Promise<LessonLearned[]> {
    // Stub: return empty array
    console.warn('getLessonsLearned is a stub method - use searchNodes with entityType="lesson_learned" instead');
    return [];
  }

  /**
   * Get knowledge statistics (STUB)
   * TODO: Implement using knowledge graph stats
   */
  async getStats(): Promise<KnowledgeStats> {
    // Stub: return zero stats
    console.warn('getStats is a stub method - use readGraph().stats instead');
    return {
      totalTasks: 0,
      totalDecisions: 0,
      totalLessons: 0,
    };
  }

  /**
   * Record a decision in the knowledge graph (STUB)
   * TODO: Implement using createEntities with type 'decision'
   */
  async recordDecision(decision: {
    name: string;
    reason: string;
    alternatives: string[];
    tradeoffs: string[];
    outcome: string;
    tags: string[];
  }): Promise<void> {
    // Stub: no-op
    console.warn('recordDecision is a stub method - use createEntities instead');
  }

  /**
   * Record a feature implementation (STUB)
   * TODO: Implement using createEntities with type 'feature'
   */
  async recordFeature(feature: {
    name: string;
    description: string;
    implementation: string;
    challenges?: string[];
    tags: string[];
  }): Promise<void> {
    // Stub: no-op
    console.warn('recordFeature is a stub method - use createEntities instead');
  }

  /**
   * Record a bug fix (STUB)
   * TODO: Implement using createEntities with type 'bug_fix'
   */
  async recordBugFix(bugFix: {
    name: string;
    rootCause: string;
    solution: string;
    prevention: string;
    tags: string[];
  }): Promise<void> {
    // Stub: no-op
    console.warn('recordBugFix is a stub method - use createEntities instead');
  }

  /**
   * Record a best practice (STUB)
   * TODO: Implement using createEntities with type 'best_practice'
   */
  async recordBestPractice(practice: {
    name: string;
    description: string;
    why: string;
    example?: string;
    tags?: string[];
  }): Promise<void> {
    // Stub: no-op
    console.warn('recordBestPractice is a stub method - use createEntities instead');
  }
}

// Export singleton instance
let knowledgeAgentInstance: KnowledgeAgent | null = null;

export function getKnowledgeAgent(): KnowledgeAgent {
  if (!knowledgeAgentInstance) {
    knowledgeAgentInstance = new KnowledgeAgent();
  }
  return knowledgeAgentInstance;
}

// Re-export types
export type { Entity, Relation, SearchOptions } from './KnowledgeGraph.js';

// Legacy types for backward compatibility (stub implementations)
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
