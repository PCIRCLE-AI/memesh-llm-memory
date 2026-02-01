/**
 * ProjectMemoryManager - High-Level API for Project Memories
 *
 * User-friendly API for querying project memories stored in the Knowledge Graph.
 * Provides semantic queries and convenient recall methods.
 */

import type { KnowledgeGraph } from '../knowledge-graph/index.js';
import type { Entity, EntityType } from '../knowledge-graph/types.js';

/** Memory-related entity types for project tracking */
export type MemoryEntityType =
  | 'code_change'
  | 'test_result'
  | 'session_snapshot'
  | 'project_snapshot'
  | 'workflow_checkpoint'
  | 'commit';

/**
 * Options for recalling recent work
 */
export interface RecallOptions {
  /** Maximum number of entities to return (default: 10) */
  limit?: number;
  /** Filter by specific entity types (must be valid EntityType values) */
  types?: EntityType[];
  /** Filter by date range (not implemented yet) */
  since?: Date;
}

/**
 * ProjectMemoryManager provides high-level APIs for querying project memories
 */
export class ProjectMemoryManager {
  private knowledgeGraph: KnowledgeGraph;

  constructor(knowledgeGraph: KnowledgeGraph) {
    this.knowledgeGraph = knowledgeGraph;
  }

  /**
   * Recall recent work from previous sessions
   *
   * @param options - Query options
   * @returns Array of recent entities (code changes, test results, etc.)
   *
   * @example
   * ```typescript
   * const recent = await manager.recallRecentWork({ limit: 5 });
   * logger.info(`Found ${recent.length} recent activities`);
   * ```
   */
  async recallRecentWork(options: RecallOptions = {}): Promise<Entity[]> {
    const {
      limit = 10,
      types = ['code_change', 'test_result', 'workflow_checkpoint', 'commit', 'session_snapshot'] as EntityType[],
    } = options;

    const results: Entity[] = [];

    // Query each type separately
    for (const entityType of types) {
      const entities = this.knowledgeGraph.searchEntities({
        entityType,
        limit: Math.ceil(limit / types.length),
      });
      results.push(...entities);
    }

    // ✅ FIX LOW-1: Sort by creation date (newest first) with explicit null handling
    const sorted = results
      .sort((a, b) => {
        // Entities without timestamps go to the end
        if (!a.createdAt && !b.createdAt) return 0;
        if (!a.createdAt) return 1;   // a goes after b
        if (!b.createdAt) return -1;  // b goes after a

        // Both have timestamps - sort newest first
        return b.createdAt.getTime() - a.createdAt.getTime();
      })
      .slice(0, limit);

    return sorted;
  }

  /**
   * Search project memories by query string
   *
   * @param query - Search query (matches entity names)
   * @param limit - Maximum number of results (default: 10)
   * @returns Array of matching entities
   *
   * @example
   * ```typescript
   * const results = await manager.search('authentication', 5);
   * logger.info(`Found ${results.length} results`);
   * ```
   */
  async search(query: string, limit: number = 10): Promise<Entity[]> {
    return this.knowledgeGraph.searchEntities({
      namePattern: query,
      limit,
    });
  }
}
