/**
 * Create Relations Tool
 *
 * Creates relations between entities in the Knowledge Graph.
 */

import { z } from 'zod';
import { KnowledgeGraph } from '../../knowledge-graph/index.js';

export const createRelationsTool = {
  name: 'create_relations',
  description:
    '🔗 Knowledge Graph: Create relations between existing entities. ' +
    'Use this to connect related knowledge, show dependencies, or build a knowledge network. ' +
    'Both entities must already exist in the Knowledge Graph.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      relations: {
        type: 'array' as const,
        description: 'Array of relations to create',
        items: {
          type: 'object' as const,
          properties: {
            from: {
              type: 'string' as const,
              description: 'Name of the source entity',
            },
            to: {
              type: 'string' as const,
              description: 'Name of the target entity',
            },
            relationType: {
              type: 'string' as const,
              description:
                'Type of relation (e.g., "depends_on", "related_to", "caused_by")',
            },
            metadata: {
              type: 'object' as const,
              description: 'Optional metadata for the relation',
            },
          },
          required: ['from', 'to', 'relationType'],
        },
      },
    },
    required: ['relations'],
  },

  handler: (
    input: {
      relations: Array<{
        from: string;
        to: string;
        relationType: string;
        metadata?: Record<string, unknown>;
      }>;
    },
    knowledgeGraph: KnowledgeGraph
  ): {
    count: number;
    created: Array<{ from: string; to: string; type: string }>;
    missingEntities?: string[];
    errors?: Array<{ from: string; to: string; relation: string; error: string }>;
  } => {
    const created: Array<{ from: string; to: string; type: string }> = [];
    const missingEntities: Set<string> = new Set();
    const errors: Array<{ from: string; to: string; relation: string; error: string }> = [];

    for (const relation of input.relations) {
      try {
        knowledgeGraph.createRelation({
          from: relation.from,
          to: relation.to,
          relationType: relation.relationType as any,
          metadata: relation.metadata || {},
        });
        created.push({
          from: relation.from,
          to: relation.to,
          type: relation.relationType,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);

        // Check if error is due to missing entity
        if (errorMsg.includes('Entity not found')) {
          if (errorMsg.includes(relation.from)) {
            missingEntities.add(relation.from);
          }
          if (errorMsg.includes(relation.to)) {
            missingEntities.add(relation.to);
          }
        }

        errors.push({
          from: relation.from,
          to: relation.to,
          relation: `${relation.from} -> ${relation.to}`,
          error: errorMsg,
        });
      }
    }

    return {
      count: created.length,
      created,
      ...(missingEntities.size > 0 && { missingEntities: Array.from(missingEntities) }),
      ...(errors.length > 0 && { errors }),
    };
  },
};
