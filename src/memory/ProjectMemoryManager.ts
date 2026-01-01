/**
 * ProjectMemoryManager - High-Level API for Project Memories
 *
 * User-friendly API for querying project memories stored in the Knowledge Graph.
 * Provides semantic queries and convenient recall methods.
 */

import type { KnowledgeGraph } from '../knowledge-graph';
import type { Entity } from '../knowledge-graph/types';
import { logger } from '../utils/logger.js';

/**
 * Options for recalling recent work
 */
export interface RecallOptions {
  /** Maximum number of entities to return (default: 10) */
  limit?: number;
  /** Filter by specific entity types */
  types?: string[];
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
      types = ['code_change', 'test_result', 'session_snapshot'],
    } = options;

    const results: Entity[] = [];

    // Query each type separately
    for (const type of types) {
      const entities = this.knowledgeGraph.searchEntities({
        type: type as any, // Type assertion needed since KG uses EntityType union
        limit: Math.ceil(limit / types.length),
      });
      results.push(...entities);
    }

    // Sort by creation date (newest first) and limit results
    const sorted = results
      .sort((a, b) => {
        const dateA = a.createdAt?.getTime() || 0;
        const dateB = b.createdAt?.getTime() || 0;
        return dateB - dateA;
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
