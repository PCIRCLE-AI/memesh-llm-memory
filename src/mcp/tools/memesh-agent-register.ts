/**
 * MeMesh Agent Registration Tool
 *
 * MCP tool handler for registering this agent with MeMesh Cloud.
 * Allows agents to register themselves and receive agent-specific capabilities.
 *
 * API contracts aligned with memesh-cloud NestJS server (2026-02).
 */

import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getCloudClient, isCloudEnabled } from '../../cloud/index.js';
import { logger } from '../../utils/logger.js';

// -- Input Schema -----------------------------------------------------------

// Valid agentType values per MeMesh Cloud API (verified 2026-02-16)
const VALID_AGENT_TYPES = ['chatgpt', 'claude', 'gemini', 'grok', 'deepseek', 'codex', 'cursor', 'custom'] as const;

export const AgentRegisterInputSchema = z.object({
  agentType: z.enum(VALID_AGENT_TYPES).describe(
    'Type of agent. Valid: "claude", "chatgpt", "gemini", "grok", "deepseek", "codex", "cursor", "custom"'
  ),
  agentName: z.string().optional().describe(
    'Optional agent name (no spaces — use hyphens, e.g., "my-agent")'
  ),
  agentVersion: z.string().optional().describe(
    'Optional version string (e.g., "1.0.0")'
  ),
  capabilities: z.record(z.string(), z.unknown()).optional().describe(
    'Optional capabilities object describing what the agent can do'
  ),
});

export type AgentRegisterInput = z.infer<typeof AgentRegisterInputSchema>;

// -- Handler ----------------------------------------------------------------

/**
 * Handle agent registration with MeMesh Cloud.
 *
 * @param input - Validated agent registration input parameters
 * @returns MCP CallToolResult with registration results
 */
export async function handleAgentRegister(
  input: AgentRegisterInput
): Promise<CallToolResult> {
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
    // Sanitize agentName: strip spaces, lowercase (API rejects spaces with misleading 409)
    const sanitizedName = input.agentName
      ? input.agentName.replace(/\s+/g, '-').toLowerCase()
      : undefined;

    // Register agent with Cloud API
    const agentInfo = await client.registerAgent({
      agentType: input.agentType,
      agentName: sanitizedName,
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
  } catch (error) {
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
