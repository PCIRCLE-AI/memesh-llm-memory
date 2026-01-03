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

    // Process observations sequentially to minimize race condition window
    // Note: For truly atomic updates, KnowledgeGraph would need transaction support
    // Current implementation uses get-then-update pattern which is sufficient
    // for single-user CLI usage but not for concurrent access
    for (const obs of args.observations) {
      try {
        // Get existing entity - capture state at this moment
        const entity = await knowledgeGraph.getEntity(obs.entityName);

        if (!entity) {
          notFound.push(obs.entityName);
          continue;
        }

        // Merge observations and update atomically via ON CONFLICT REPLACE
        // The createEntity uses INSERT OR REPLACE which is atomic at the SQL level
        const mergedObservations = [...entity.observations, ...obs.contents];
        await knowledgeGraph.createEntity({
          name: entity.name,
          entityType: entity.entityType,
          observations: mergedObservations,
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
