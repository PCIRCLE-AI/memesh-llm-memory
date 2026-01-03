/**
 * Add Observations Tool
 *
 * Adds new observations to existing entities in the Knowledge Graph.
 */

import { z } from 'zod';
import { KnowledgeGraph } from '../../knowledge-graph/index.js';

export const addObservationsTool = {
  name: 'add_observations',
  description:
    '➕ Knowledge Graph: Add new observations (facts) to existing entities. ' +
    'Use this to update entities with new information or learnings. ' +
    'The entity must already exist in the Knowledge Graph.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      observations: {
        type: 'array' as const,
        description: 'Array of observations to add to entities',
        items: {
          type: 'object' as const,
          properties: {
            entityName: {
              type: 'string' as const,
              description: 'Name of the existing entity to update',
            },
            contents: {
              type: 'array' as const,
              description: 'Array of new observations to add',
              items: {
                type: 'string' as const,
              },
            },
          },
          required: ['entityName', 'contents'],
        },
      },
    },
    required: ['observations'],
  },

  handler: (
    input: {
      observations: Array<{
        entityName: string;
        contents: string[];
      }>;
    },
    knowledgeGraph: KnowledgeGraph
  ): {
    count: number;
    updated: string[];
    notFound?: string[];
    errors?: Array<{ entityName: string; error: string }>;
  } => {
    const updated: string[] = [];
    const notFound: string[] = [];
    const errors: Array<{ entityName: string; error: string }> = [];

    for (const obs of input.observations) {
      try {
        // Get existing entity
        const entity = knowledgeGraph.getEntity(obs.entityName);

        if (!entity) {
          notFound.push(obs.entityName);
          continue;
        }

        // Merge new observations with existing ones
        const mergedObservations = [
          ...(entity.observations || []),
          ...obs.contents,
        ];

        // Update the entity with merged observations
        knowledgeGraph.createEntity({
          name: entity.name,
          type: entity.type,
          observations: mergedObservations,
          tags: entity.tags || [],
          metadata: entity.metadata || {},
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
      count: updated.length,
      updated,
      ...(notFound.length > 0 && { notFound }),
      ...(errors.length > 0 && { errors }),
    };
  },
};
