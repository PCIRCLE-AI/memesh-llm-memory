/**
 * Create Entities Tool
 *
 * Creates new entities in the Knowledge Graph for manual knowledge recording.
 */

import { z } from 'zod';
import { KnowledgeGraph } from '../../knowledge-graph/index.js';

export const createEntitiesTool = {
  name: 'create_entities',
  description:
    '📝 Knowledge Graph: Create new entities in the Knowledge Graph. ' +
    'Use this to manually record important knowledge, architecture decisions, or lessons learned. ' +
    'Each entity can have multiple observations (facts) attached to it.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      entities: {
        type: 'array' as const,
        description: 'Array of entities to create',
        items: {
          type: 'object' as const,
          properties: {
            name: {
              type: 'string' as const,
              description: 'Unique name for the entity',
            },
            entityType: {
              type: 'string' as const,
              description:
                'Type of entity (e.g., "lesson_learned", "architecture_decision", "project_milestone")',
            },
            observations: {
              type: 'array' as const,
              description: 'Array of facts/observations about this entity',
              items: {
                type: 'string' as const,
              },
            },
            metadata: {
              type: 'object' as const,
              description: 'Optional metadata for the entity',
            },
          },
          required: ['name', 'entityType', 'observations'],
        },
      },
    },
    required: ['entities'],
  },

  handler: (
    input: {
      entities: Array<{
        name: string;
        entityType: string;
        observations: string[];
        metadata?: Record<string, unknown>;
      }>;
    },
    knowledgeGraph: KnowledgeGraph
  ): {
    count: number;
    created: string[];
    errors?: Array<{ name: string; error: string }>;
  } => {
    const created: string[] = [];
    const errors: Array<{ name: string; error: string }> = [];

    for (const entity of input.entities) {
      try {
        knowledgeGraph.createEntity({
          name: entity.name,
          type: entity.entityType as any,
          observations: entity.observations,
          tags: [],
          metadata: entity.metadata || {},
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
      count: created.length,
      created,
      ...(errors.length > 0 && { errors }),
    };
  },
};
