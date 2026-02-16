import { z } from 'zod';
import { getCloudClient, isCloudEnabled } from '../../cloud/index.js';
import { logger } from '../../utils/logger.js';
export const AgentRegisterInputSchema = z.object({
    agentType: z.string().describe('Type of agent (e.g., "claude-code", "assistant", "analyzer")'),
    agentName: z.string().optional().describe('Optional human-readable name for the agent'),
    agentVersion: z.string().optional().describe('Optional version string (e.g., "1.0.0")'),
    capabilities: z.record(z.string(), z.unknown()).optional().describe('Optional capabilities object describing what the agent can do'),
});
export async function handleAgentRegister(input) {
    if (!isCloudEnabled()) {
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        message: 'MeMesh Cloud is not configured. Set MEMESH_API_KEY to enable agent registration.',
                        hint: 'Get your API key at https://memesh.ai/settings',
                    }, null, 2),
                }],
        };
    }
    const client = getCloudClient();
    try {
        const agentInfo = await client.registerAgent({
            agentType: input.agentType,
            agentName: input.agentName,
            agentVersion: input.agentVersion,
            capabilities: input.capabilities,
        });
        logger.info('Agent successfully registered with MeMesh Cloud', {
            agentId: agentInfo.id,
            agentType: agentInfo.agentType,
            agentName: agentInfo.agentName,
        });
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: true,
                        agent: {
                            id: agentInfo.id,
                            type: agentInfo.agentType,
                            name: agentInfo.agentName,
                            version: agentInfo.agentVersion,
                            status: agentInfo.status,
                            capabilities: agentInfo.capabilities,
                            createdAt: agentInfo.createdAt,
                            lastHeartbeat: agentInfo.lastHeartbeat,
                            pendingMessages: agentInfo.pendingMessages,
                        },
                        message: 'Agent successfully registered with MeMesh Cloud',
                    }, null, 2),
                }],
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Agent registration failed', {
            agentType: input.agentType,
            error: errorMessage,
        });
        return {
            content: [{
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        message: 'Agent registration failed',
                        error: errorMessage,
                        agentType: input.agentType,
                    }, null, 2),
                }],
        };
    }
}
//# sourceMappingURL=memesh-agent-register.js.map