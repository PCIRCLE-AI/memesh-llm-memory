import { z } from 'zod';
import { getCloudClient, isCloudEnabled } from '../../cloud/index.js';
import { logger } from '../../utils/logger.js';
export const CloudSyncInputSchema = z.object({
    action: z.enum(['push', 'pull', 'status']).describe('Sync action: "push" (local→cloud), "pull" (cloud→local), "status" (compare counts)'),
    query: z.string().optional().describe('Optional search query to filter which memories to sync (default: all)'),
    space: z.string().default('default').describe('Cloud memory space to sync with (default: "default")'),
    limit: z.number().min(1).max(500).default(100).describe('Maximum number of memories to sync per batch (default: 100)'),
    dryRun: z.boolean().default(false).describe('Preview what would be synced without actually syncing'),
});
export async function handleCloudSync(input, knowledgeGraph) {
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
async function handleStatus(client, input, kg) {
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
                    delta: status.localCount - status.cloudCount,
                }, null, 2),
            }],
    };
}
async function handlePush(client, input, kg) {
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
                        space: input.space,
                        preview: entities.slice(0, 5).map(e => ({
                            name: e.name,
                            type: e.entityType,
                            observations: e.observations.length,
                        })),
                    }, null, 2),
                }],
        };
    }
    const memories = entities.map(entity => ({
        content: `[${entity.entityType}] ${entity.name}: ${entity.observations.join(' | ')}`,
        space: input.space,
        tags: [entity.entityType, ...(entity.tags || [])],
        source: 'memesh-local',
    }));
    const result = await client.writeMemories(memories);
    logger.info('Cloud sync push completed', {
        succeeded: result.succeeded,
        failed: result.failed,
    });
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    action: 'push',
                    pushed: result.succeeded,
                    failed: result.failed,
                    total: result.total,
                    errorDetails: result.failed > 0
                        ? result.failures.slice(0, 5).map(f => f.errorMessage)
                        : undefined,
                }, null, 2),
            }],
    };
}
async function handlePull(client, input) {
    const memories = await client.searchMemory(input.query || '*', {
        limit: input.limit,
        spaces: input.space !== 'default' ? [input.space] : undefined,
    });
    if (memories.length === 0) {
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
                        wouldPull: memories.length,
                        preview: memories.slice(0, 5).map(m => ({
                            id: m.id,
                            content: m.content.substring(0, 100),
                            tags: m.tags,
                            space: m.space,
                        })),
                    }, null, 2),
                }],
        };
    }
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({
                    success: true,
                    action: 'pull',
                    pulled: memories.length,
                    memories: memories.map(m => ({
                        id: m.id,
                        content: m.content,
                        tags: m.tags,
                        space: m.space,
                        createdAt: m.createdAt,
                    })),
                }, null, 2),
            }],
    };
}
//# sourceMappingURL=memesh-cloud-sync.js.map