/**
 * Knowledge Agent - Knowledge Graph Service
 *
 * Pattern: Similar to KnowledgeGraph - provides knowledge graph services
 * Used by: MCP tools in server.ts (not the other way around)
 */

import { KnowledgeGraphSQLite } from './KnowledgeGraphSQLite.js';
import { Entity, Relation, SearchOptions } from './KnowledgeGraph.js';
import { StateError } from '../../errors/index.js';
import { logger } from '../../utils/logger.js';

export class KnowledgeAgent {
  private graph: KnowledgeGraphSQLite;
  private isInitialized = false;
  private dbPath?: string;

  constructor(dbPath?: string) {
    this.graph = new KnowledgeGraphSQLite({ dbPath });
    this.dbPath = dbPath;
    if (dbPath) {
      logger.info(`KnowledgeAgent initialized with dbPath: ${dbPath}`);
    }
  }

  /**
   * Initialize the Knowledge Agent
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logger.info('Knowledge Agent already initialized');
      return;
    }

    logger.info('Initializing Knowledge Agent...');
    await this.graph.initialize();

    this.isInitialized = true;
    logger.info('Knowledge Agent initialized successfully');

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
      try {
        const result = await this.graph.createEntity(entity);
        created.push(result);
      } catch (error) {
        logger.warn(`Failed to create entity "${entity.name}":`, error);
        // Continue with next entity instead of failing entire batch
      }
    }

    logger.info(`Created ${created.length} entities`);
    return created;
  }

  /**
   * Add observations to existing entity
   */
  async addObservations(entityName: string, observations: string[]): Promise<Entity | undefined> {
    this.ensureInitialized();

    const entity = await this.graph.getEntity(entityName);
    if (!entity) {
      logger.warn(`Entity not found: ${entityName}`);
      return undefined;
    }

    const updated = await this.graph.updateEntity(entityName, {
      observations: [...entity.observations, ...observations],
    });

    logger.info(`Added ${observations.length} observations to ${entityName}`);
    return updated;
  }

  /**
   * Search for nodes in the knowledge graph
   */
  async searchNodes(query: string, options: SearchOptions = {}): Promise<Entity[]> {
    this.ensureInitialized();

    const results = await this.graph.searchEntities(query, options);
    logger.info(`Found ${results.length} matching entities`);
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
        logger.warn(`Entity not found: ${name}`);
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
        logger.warn(`Cannot create relation: entity not found (from: ${relation.from}, to: ${relation.to})`);
        continue;
      }

      const result = await this.graph.createRelation(relation);
      created.push(result);
    }

    logger.info(`Created ${created.length} relations`);
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

    logger.info(`Deleted ${deleted.length} entities`);
    if (notFound.length > 0) {
      logger.warn(`Not found: ${notFound.join(', ')}`);
    }

    return { deleted, notFound };
  }

  /**
   * Read the entire knowledge graph
   */
  async readGraph(): Promise<{
    entities: Entity[];
    stats: Awaited<ReturnType<KnowledgeGraphSQLite['getStats']>>;
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
    logger.info('Knowledge Graph Statistics:');
    logger.info(`  Total Entities: ${stats.totalEntities}`);
    logger.info(`  Total Relations: ${stats.totalRelations}`);
    logger.info(`  Entity Types:`);
    for (const [type, count] of Object.entries(stats.entityTypeBreakdown)) {
      logger.info(`    ${type}: ${count}`);
    }
  }

  /**
   * Ensure agent is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new StateError('Knowledge Agent not initialized. Call initialize() first.', {
        component: 'KnowledgeAgent',
        operation: 'ensureInitialized',
        dbPath: this.dbPath,
      });
    }
  }

  /**
   * Close the knowledge agent
   */
  async close(): Promise<void> {
    await this.graph.close();
    this.isInitialized = false;
    logger.info('Knowledge Agent closed');
  }

  // ========================================
  // Legacy Methods (Stub implementations for backward compatibility)
  // These will be replaced with proper knowledge graph operations in future tasks
  // ========================================

  /**
   * Find similar entities using simple similarity matching
   */
  async findSimilar(description: string, type?: string): Promise<SimilarTask[]> {
    this.ensureInitialized();

    const allEntities = await this.graph.getAllEntities();
    const filtered = type
      ? allEntities.filter(e => e.entityType === type)
      : allEntities;

    // Calculate simple similarity based on common words
    const descWords = new Set(description.toLowerCase().split(/\s+/));
    const results: SimilarTask[] = [];

    for (const entity of filtered) {
      const entityText = [
        entity.name,
        ...entity.observations
      ].join(' ').toLowerCase();

      const entityWords = new Set(entityText.split(/\s+/));
      const commonWords = new Set([...descWords].filter(w => entityWords.has(w)));
      const similarity = commonWords.size / Math.max(descWords.size, entityWords.size);

      if (similarity > 0.1) { // Only include if at least 10% similar
        results.push({
          name: entity.name,
          similarity,
          metadata: entity.metadata
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, 10);
  }

  /**
   * Get decision history from knowledge graph
   */
  async getDecisions(): Promise<Decision[]> {
    this.ensureInitialized();

    const decisions = await this.searchNodes('', { entityType: 'decision' });
    return decisions.map(entity => ({
      id: entity.name,
      description: entity.name,
      outcome: entity.observations.find(o => o.includes('outcome:'))?.replace('outcome:', '').trim() || '',
      timestamp: entity.createdAt ?? new Date(0) // Fallback to epoch if no timestamp
    }));
  }

  /**
   * Get lessons learned from knowledge graph
   */
  async getLessonsLearned(): Promise<LessonLearned[]> {
    this.ensureInitialized();

    const lessons = await this.searchNodes('', { entityType: 'lesson_learned' });
    return lessons.map(entity => ({
      id: entity.name,
      lesson: entity.name,
      context: entity.observations.join(' | '),
      timestamp: entity.createdAt ?? new Date(0) // Fallback to epoch if no timestamp
    }));
  }

  /**
   * Get knowledge statistics from graph
   */
  async getStats(): Promise<KnowledgeStats> {
    this.ensureInitialized();

    const graphStats = await this.graph.getStats();
    return {
      totalTasks: graphStats.entityTypeBreakdown['task'] || 0,
      totalDecisions: graphStats.entityTypeBreakdown['decision'] || 0,
      totalLessons: graphStats.entityTypeBreakdown['lesson_learned'] || 0
    };
  }

  /**
   * Record a decision in the knowledge graph
   */
  async recordDecision(decision: {
    name: string;
    reason: string;
    alternatives: string[];
    tradeoffs: string[];
    outcome: string;
    tags: string[];
  }): Promise<Entity> {
    this.ensureInitialized();

    const observations = [
      `reason: ${decision.reason}`,
      `outcome: ${decision.outcome}`,
      ...decision.alternatives.map(alt => `alternative: ${alt}`),
      ...decision.tradeoffs.map(t => `tradeoff: ${t}`),
      ...decision.tags.map(tag => `tag: ${tag}`),
    ];

    const [entity] = await this.createEntities([{
      name: decision.name,
      entityType: 'decision',
      observations,
      metadata: {
        alternatives: decision.alternatives,
        tradeoffs: decision.tradeoffs,
        tags: decision.tags,
        recordedAt: new Date().toISOString(),
      },
    }]);

    logger.info(`Recorded decision: ${decision.name}`);
    return entity;
  }

  /**
   * Record a feature implementation in the knowledge graph
   */
  async recordFeature(feature: {
    name: string;
    description: string;
    implementation: string;
    challenges?: string[];
    tags: string[];
  }): Promise<Entity> {
    this.ensureInitialized();

    const observations = [
      `description: ${feature.description}`,
      `implementation: ${feature.implementation}`,
      ...(feature.challenges || []).map(c => `challenge: ${c}`),
      ...feature.tags.map(tag => `tag: ${tag}`),
    ];

    const [entity] = await this.createEntities([{
      name: feature.name,
      entityType: 'feature',
      observations,
      metadata: {
        challenges: feature.challenges || [],
        tags: feature.tags,
        recordedAt: new Date().toISOString(),
      },
    }]);

    logger.info(`Recorded feature: ${feature.name}`);
    return entity;
  }

  /**
   * Record a bug fix in the knowledge graph
   */
  async recordBugFix(bugFix: {
    name: string;
    rootCause: string;
    solution: string;
    prevention: string;
    tags: string[];
  }): Promise<Entity> {
    this.ensureInitialized();

    const observations = [
      `root_cause: ${bugFix.rootCause}`,
      `solution: ${bugFix.solution}`,
      `prevention: ${bugFix.prevention}`,
      ...bugFix.tags.map(tag => `tag: ${tag}`),
    ];

    const [entity] = await this.createEntities([{
      name: bugFix.name,
      entityType: 'bug_fix',
      observations,
      metadata: {
        rootCause: bugFix.rootCause,
        solution: bugFix.solution,
        prevention: bugFix.prevention,
        tags: bugFix.tags,
        recordedAt: new Date().toISOString(),
      },
    }]);

    logger.info(`Recorded bug fix: ${bugFix.name}`);
    return entity;
  }

  /**
   * Record a best practice in the knowledge graph
   */
  async recordBestPractice(practice: {
    name: string;
    description: string;
    why: string;
    example?: string;
    tags?: string[];
  }): Promise<Entity> {
    this.ensureInitialized();

    const observations = [
      `description: ${practice.description}`,
      `why: ${practice.why}`,
      ...(practice.example ? [`example: ${practice.example}`] : []),
      ...(practice.tags || []).map(tag => `tag: ${tag}`),
    ];

    const [entity] = await this.createEntities([{
      name: practice.name,
      entityType: 'best_practice',
      observations,
      metadata: {
        why: practice.why,
        example: practice.example,
        tags: practice.tags || [],
        recordedAt: new Date().toISOString(),
      },
    }]);

    logger.info(`Recorded best practice: ${practice.name}`);
    return entity;
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
