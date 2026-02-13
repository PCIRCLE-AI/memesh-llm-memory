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
   * Search project memories by query string with project isolation
   *
   * @param query - Search query (matches entity names)
   * @param options - Search options
   * @param options.limit - Maximum number of results (default: 10)
   * @param options.projectPath - Current project path (for filtering)
   * @param options.allProjects - Search across all projects (default: false)
   * @returns Array of matching entities
   *
   * @example
   * ```typescript
   * // Search current project only
   * const results = await manager.search('authentication', {
   *   limit: 5,
   *   projectPath: process.cwd()
   * });
   *
   * // Search all projects
   * const allResults = await manager.search('authentication', {
   *   limit: 5,
   *   allProjects: true
   * });
   * ```
   */
  async search(
    query: string,
    options: {
      limit?: number;
      projectPath?: string;
      allProjects?: boolean;
    } = {}
  ): Promise<Entity[]> {
    const { limit = 10, projectPath, allProjects = false } = options;

    // If allProjects is true, search without tag filtering
    if (allProjects) {
      return this.knowledgeGraph.searchEntities({
        namePattern: query,
        limit,
      });
    }

    // If projectPath provided, filter by project scope + global scope
    if (projectPath) {
      // Search for project-scoped memories
      const projectResults = this.knowledgeGraph.searchEntities({
        namePattern: query,
        tag: 'scope:project',
        limit,
      });

      // Search for global-scoped memories
      const globalResults = this.knowledgeGraph.searchEntities({
        namePattern: query,
        tag: 'scope:global',
        limit,
      });

      // Merge and deduplicate by entity name
      const merged = new Map<string, Entity>();
      for (const entity of [...projectResults, ...globalResults]) {
        if (!merged.has(entity.name)) {
          merged.set(entity.name, entity);
        }
      }

      // Return up to limit results
      return Array.from(merged.values()).slice(0, limit);
    }

    // Fallback: no project filtering (legacy behavior)
    return this.knowledgeGraph.searchEntities({
      namePattern: query,
      limit,
    });
  }
}
