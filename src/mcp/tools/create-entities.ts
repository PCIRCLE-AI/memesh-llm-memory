/**
 * MCP Tool: create-entities
 *
 * Creates new entities in the Knowledge Graph.
 * Allows manual recording of decisions, features, bug fixes, and other knowledge.
 */

import type { KnowledgeGraph } from '../../knowledge-graph/index.js';

export interface CreateEntitiesArgs {
  /** Array of entities to create */
  entities: Array<{
    /** Entity name (unique identifier) */
    name: string;
    /** Entity type (e.g., 'decision', 'feature', 'bug_fix', 'code_change', 'test_result') */
    entityType: string;
    /** Array of observations (facts, notes, details) */
    observations: string[];
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
   * @param args - Tool arguments
   * @param knowledgeGraph - KnowledgeGraph instance
   * @returns Summary of created entities
   */
  async handler(
    args: CreateEntitiesArgs,
    knowledgeGraph: KnowledgeGraph
  ) {
    const created: string[] = [];
    const errors: Array<{ name: string; error: string }> = [];

    for (const entity of args.entities) {
      try {
        await knowledgeGraph.createEntity({
          name: entity.name,
          type: entity.entityType as any,
          observations: entity.observations,
          metadata: entity.metadata,
        });
        created.push(entity.name);
      } catch (error) {
        errors.push({
          name: entity.name,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      created,
      count: created.length,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
};
