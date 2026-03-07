/**
 * MCP Tool: create-entities
 *
 * Creates new entities in the Knowledge Graph.
 * Allows manual recording of decisions, features, bug fixes, and other knowledge.
 *
 * Automatically tags entities with scope and tech tags based on project context.
 */

import type { KnowledgeGraph } from '../../knowledge-graph/index.js';
import type { EntityType } from '../../knowledge-graph/types.js';

export interface CreateEntitiesArgs {
  /** Array of entities to create */
  entities: Array<{
    /** Entity name (unique identifier) */
    name: string;
    /** Entity type (e.g., 'decision', 'feature', 'bug_fix', 'code_change', 'test_result') */
    entityType: string;
    /** Array of observations (facts, notes, details) */
    observations: string[];
    /** Optional tags (scope and tech tags will be automatically added) */
    tags?: string[];
    /** Optional metadata */
    metadata?: Record<string, unknown>;
  }>;
}

/**
 * MCP Tool definition for creating entities
 */
export const createEntitiesTool = {
  name: 'create-entities',
  description: 'Create new entities in the Knowledge Graph. Record decisions, features, bug fixes, code changes, and other knowledge for future recall.',

  inputSchema: {
    type: 'object' as const,
    properties: {
      entities: {
        type: 'array',
        description: 'Array of entities to create',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Entity name (unique identifier, e.g., "OAuth Integration 2026-01-03")',
            },
            entityType: {
              type: 'string',
              description: 'Entity type (e.g., "decision", "feature", "bug_fix", "code_change", "test_result", "architecture_decision")',
            },
            observations: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of observations (facts, notes, details about this entity)',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional tags. Scope tags (scope:project:xxx) and tech tags (tech:xxx) will be automatically added based on current project context.',
            },
            metadata: {
              type: 'object',
              description: 'Optional metadata',
            },
          },
          required: ['name', 'entityType', 'observations'],
        },
      },
    },
    required: ['entities'],
  },

  /**
   * Handler for create-entities tool
   *
   * Automatically adds scope and tech tags to all created entities.
   *
   * @param args - Tool arguments
   * @param knowledgeGraph - KnowledgeGraph instance
   * @returns Summary of created entities
   */
  async handler(
    args: CreateEntitiesArgs,
    knowledgeGraph: KnowledgeGraph
  ) {
    // Pre-process tags: add scope:project if no scope tag present
    const preparedEntities = args.entities.map(entity => {
      const tags = entity.tags || [];
      const hasScope = tags.some(tag => tag.startsWith('scope:'));
      if (!hasScope) {
        tags.push('scope:project');
      }
      return {
        name: entity.name,
        entityType: entity.entityType,
        observations: entity.observations,
        tags,
        metadata: entity.metadata,
      };
    });

    // Use batch method for single-transaction performance
    const results = knowledgeGraph.createEntitiesBatch(preparedEntities);

    const created = results.filter(r => r.success).map(r => r.name);
    const errors = results
      .filter(r => !r.success)
      .map(r => ({ name: r.name, error: r.error! }));

    return {
      created,
      count: created.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
};
