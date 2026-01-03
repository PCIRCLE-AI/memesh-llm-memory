/**
 * MCP Tool: create-relations
 *
 * Creates relations between entities in the Knowledge Graph.
 * Allows linking entities to show dependencies, causation, and other relationships.
 */

import type { KnowledgeGraph } from '../../knowledge-graph/index.js';

export interface CreateRelationsArgs {
  /** Array of relations to create */
  relations: Array<{
    /** Source entity name */
    from: string;
    /** Target entity name */
    to: string;
    /** Relation type (e.g., 'depends_on', 'caused_by', 'implements', 'fixes') */
    relationType: string;
    /** Optional metadata */
    metadata?: Record<string, unknown>;
  }>;
}

/**
 * MCP Tool definition for creating relations
 */
export const createRelationsTool = {
  name: 'create-relations',
  description: 'Create relations between entities in the Knowledge Graph. Link entities to show dependencies, causation, implementation, and other relationships.',

  inputSchema: {
    type: 'object' as const,
    properties: {
      relations: {
        type: 'array',
        description: 'Array of relations to create between entities',
        items: {
          type: 'object',
          properties: {
            from: {
              type: 'string',
              description: 'Source entity name (where the relation starts)',
            },
            to: {
              type: 'string',
              description: 'Target entity name (where the relation ends)',
            },
            relationType: {
              type: 'string',
              description: 'Relation type (e.g., "depends_on", "caused_by", "implements", "fixes", "related_to")',
            },
            metadata: {
              type: 'object',
              description: 'Optional metadata',
            },
          },
          required: ['from', 'to', 'relationType'],
        },
      },
    },
    required: ['relations'],
  },

  /**
   * Handler for create-relations tool
   *
   * @param args - Tool arguments
   * @param knowledgeGraph - KnowledgeGraph instance
   * @returns Summary of created relations
   */
  async handler(
    args: CreateRelationsArgs,
    knowledgeGraph: KnowledgeGraph
  ) {
    const created: Array<{ from: string; to: string; type: string }> = [];
    const missingEntities: string[] = [];
    const errors: Array<{ from: string; to: string; error: string }> = [];

    for (const rel of args.relations) {
      try {
        // Verify both entities exist
        const fromEntity = await knowledgeGraph.getEntity(rel.from);
        const toEntity = await knowledgeGraph.getEntity(rel.to);

        if (!fromEntity) {
          if (!missingEntities.includes(rel.from)) {
            missingEntities.push(rel.from);
          }
          continue;
        }

        if (!toEntity) {
          if (!missingEntities.includes(rel.to)) {
            missingEntities.push(rel.to);
          }
          continue;
        }

        // Create relation
        await knowledgeGraph.createRelation({
          from: rel.from,
          to: rel.to,
          relationType: rel.relationType as any,
          metadata: rel.metadata,
        });

        created.push({
          from: rel.from,
          to: rel.to,
          type: rel.relationType,
        });
      } catch (error) {
        errors.push({
          from: rel.from,
          to: rel.to,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      created,
      count: created.length,
      missingEntities: missingEntities.length > 0 ? missingEntities : undefined,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
};
