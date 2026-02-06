/**
 * MeMesh Cloud Sync Tool
 *
 * MCP tool handler for syncing local Knowledge Graph with MeMesh Cloud.
 * Supports: push (local→cloud), pull (cloud→local), status (compare).
 */

import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getCloudClient, isCloudEnabled } from '../../cloud/index.js';
import type { CloudMemoryWriteRequest } from '../../cloud/index.js';
import { logger } from '../../utils/logger.js';

// -- Input Schema -----------------------------------------------------------

export const CloudSyncInputSchema = z.object({
  action: z.enum(['push', 'pull', 'status']).describe(
    'Sync action: "push" (local→cloud), "pull" (cloud→local), "status" (compare counts)'
  ),
  query: z.string().optional().describe(
    'Optional search query to filter which memories to sync (default: all)'
  ),
  limit: z.number().min(1).max(500).default(100).describe(
    'Maximum number of memories to sync per batch (default: 100)'
  ),
  dryRun: z.boolean().default(false).describe(
    'Preview what would be synced without actually syncing'
  ),
});

export type CloudSyncInput = z.infer<typeof CloudSyncInputSchema>;

// -- KG Interface (minimal subset needed for sync) --------------------------

interface KGLike {
  searchEntities(query: { namePattern?: string; limit?: number }): Array<{
    name: string;
    entityType: string;
    observations: string[];
    tags?: string[];
    metadata?: Record<string, unknown>;
    contentHash?: string;
  }>;
}

// -- Handler ----------------------------------------------------------------

export async function handleCloudSync(
  input: CloudSyncInput,
  knowledgeGraph?: KGLike
): Promise<CallToolResult> {
  if (!isCloudEnabled()) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          message: 'MeMesh Cloud is not configured. Set MEMESH_API_KEY to enable cloud sync.',
          action: input.action,
          hint: 'Get your API key at https://memesh.ai/settings',
        }, null, 2),
      }],
    };
  }

  const client = getCloudClient();

  switch (input.action) {
    case 'status':
      return handleStatus(client, input, knowledgeGraph);
    case 'push':
      return handlePush(client, input, knowledgeGraph);
    case 'pull':
      return handlePull(client, input);
  }
}

// -- Action Handlers --------------------------------------------------------

async function handleStatus(
  client: ReturnType<typeof getCloudClient>,
  input: CloudSyncInput,
  kg?: KGLike
): Promise<CallToolResult> {
  const localCount = kg
    ? kg.searchEntities({ namePattern: input.query || undefined, limit: 1000 }).length
    : 0;

  const status = await client.getSyncStatus(localCount);

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        action: 'status',
        connected: status.connected,
        local: { count: status.localCount },
        cloud: { count: status.cloudCount },
        lastSync: status.lastSync || 'never',
        delta: status.localCount - status.cloudCount,
      }, null, 2),
    }],
  };
}

async function handlePush(
  client: ReturnType<typeof getCloudClient>,
  input: CloudSyncInput,
  kg?: KGLike
): Promise<CallToolResult> {
  if (!kg) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: false,
          action: 'push',
          message: 'Knowledge Graph not available - cannot push local memories',
        }, null, 2),
      }],
    };
  }

  const entities = kg.searchEntities({
    namePattern: input.query || undefined,
    limit: input.limit,
  });

  if (entities.length === 0) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          action: 'push',
          pushed: 0,
          message: 'No local memories to push',
        }, null, 2),
      }],
    };
  }

  if (input.dryRun) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          action: 'push',
          dryRun: true,
          wouldPush: entities.length,
          preview: entities.slice(0, 5).map(e => ({
            name: e.name,
            type: e.entityType,
            observations: e.observations.length,
          })),
        }, null, 2),
      }],
    };
  }

  // Convert KG entities to Cloud memory format
  const memories: CloudMemoryWriteRequest[] = entities.map(entity => ({
    content: `[${entity.entityType}] ${entity.name}: ${entity.observations.join(' | ')}`,
    tags: [entity.entityType, ...(entity.tags || [])],
    metadata: {
      ...entity.metadata,
      entityName: entity.name,
      entityType: entity.entityType,
      source: 'local-kg',
    },
    contentHash: entity.contentHash,
  }));

  const result = await client.writeMemories(memories);

  logger.info('Cloud sync push completed', {
    pushed: result.ids.length,
    errors: result.errors.length,
  });

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        action: 'push',
        pushed: result.ids.length,
        errors: result.errors.length,
        errorDetails: result.errors.length > 0 ? result.errors.slice(0, 5) : undefined,
      }, null, 2),
    }],
  };
}

async function handlePull(
  client: ReturnType<typeof getCloudClient>,
  input: CloudSyncInput
): Promise<CallToolResult> {
  const searchResult = await client.searchMemory(
    input.query || '*',
    { limit: input.limit }
  );

  if (searchResult.memories.length === 0) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          action: 'pull',
          pulled: 0,
          message: 'No cloud memories found matching query',
        }, null, 2),
      }],
    };
  }

  if (input.dryRun) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          action: 'pull',
          dryRun: true,
          wouldPull: searchResult.memories.length,
          hasMore: searchResult.hasMore,
          preview: searchResult.memories.slice(0, 5).map(m => ({
            id: m.id,
            content: m.content.substring(0, 100),
            tags: m.tags,
          })),
        }, null, 2),
      }],
    };
  }

  // Pull returns cloud memories for the agent to review/process.
  // Full bidirectional sync with KG entity creation will be added
  // when MeMesh Cloud API stabilizes its entity format.
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        action: 'pull',
        pulled: searchResult.memories.length,
        hasMore: searchResult.hasMore,
        memories: searchResult.memories.map(m => ({
          id: m.id,
          content: m.content,
          tags: m.tags,
          createdAt: m.createdAt,
        })),
      }, null, 2),
    }],
  };
}
