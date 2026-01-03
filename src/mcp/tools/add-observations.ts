/**
 * MCP Tool: add-observations
 *
 * Adds new observations to existing entities in the Knowledge Graph.
 * Allows updating entities with additional information.
 */

import type { KnowledgeGraph } from '../../knowledge-graph/index.js';

export interface AddObservationsArgs {
  /** Array of observations to add */
  observations: Array<{
    /** Entity name to add observations to */
    entityName: string;
    /** Array of observation contents to add */
    contents: string[];
  }>;
}

/**
 * MCP Tool definition for adding observations
 */
export const addObservationsTool = {
  name: 'add-observations',
  description: 'Add new observations to existing entities in the Knowledge Graph. Update entities with additional information, notes, or findings.',

  inputSchema: {
    type: 'object' as const,
    properties: {
      observations: {
        type: 'array',
        description: 'Array of observations to add to existing entities',
        items: {
          type: 'object',
          properties: {
            entityName: {
              type: 'string',
              description: 'Name of the entity to add observations to',
            },
            contents: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of observation contents to add',
            },
          },
          required: ['entityName', 'contents'],
        },
      },
    },
    required: ['observations'],
  },

  /**
   * Handler for add-observations tool
   *
   * @param args - Tool arguments
   * @param knowledgeGraph - KnowledgeGraph instance
   * @returns Summary of updated entities
   */
  async handler(
    args: AddObservationsArgs,
    knowledgeGraph: KnowledgeGraph
  ) {
    const updated: string[] = [];
    const notFound: string[] = [];
    const errors: Array<{ entityName: string; error: string }> = [];

    for (const obs of args.observations) {
      try {
        // Get existing entity
        const entity = await knowledgeGraph.getEntity(obs.entityName);

        if (!entity) {
          notFound.push(obs.entityName);
          continue;
        }

        // Update entity with new observations by re-creating it
        // (createEntity handles updates via ON CONFLICT)
        await knowledgeGraph.createEntity({
          name: entity.name,
          type: entity.type,
          observations: [...entity.observations, ...obs.contents],
          metadata: entity.metadata,
        });

        updated.push(obs.entityName);
      } catch (error) {
        errors.push({
          entityName: obs.entityName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      updated,
      count: updated.length,
      notFound: notFound.length > 0 ? notFound : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
};
