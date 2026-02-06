/**
 * MCP Tool: a2a-subscribe
 *
 * Get the SSE events endpoint URL for real-time task notifications.
 * Returns endpoint URL, filter options, and usage instructions.
 */

import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { EVENT_TYPES } from '../../a2a/events/types.js';

// Valid task statuses for filtering
const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const;

/**
 * Input schema validation for a2a-subscribe tool
 */
export const A2ASubscribeInputSchema = z.object({
  status: z.enum(VALID_STATUSES).optional(),
  platform: z.string().max(100).optional(),
  skills: z.array(z.string().max(50)).max(20).optional(),
  types: z.array(z.enum(EVENT_TYPES)).max(10).optional(),
});

export type A2ASubscribeInput = z.infer<typeof A2ASubscribeInputSchema>;

/**
 * Handle a2a-subscribe MCP tool invocation
 *
 * Returns SSE endpoint URL with optional filters and usage instructions.
 *
 * @param input - Filter options (status, platform, skills, types)
 * @returns Formatted endpoint information and usage examples
 */
export function handleA2ASubscribe(input: A2ASubscribeInput): CallToolResult {
  // Build query parameters manually to avoid URL-encoding commas for readability
  const params: string[] = [];

  if (input.status) {
    params.push(`status=${input.status}`);
  }
  if (input.platform) {
    params.push(`platform=${encodeURIComponent(input.platform)}`);
  }
  // Skills - URL encode each value (MAJOR-6)
  if (input.skills && input.skills.length > 0) {
    params.push(`skills=${input.skills.map((s) => encodeURIComponent(s)).join(',')}`);
  }
  // Types - URL encode each value (MAJOR-6)
  if (input.types && input.types.length > 0) {
    params.push(`types=${input.types.map((t) => encodeURIComponent(t)).join(',')}`);
  }

  const queryString = params.join('&');
  const baseUrl = '/a2a/events';
  const fullUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

  // Build output
  let output = `SSE Event Subscription Endpoint\n\n`;
  output += `**Endpoint:** ${fullUrl}\n\n`;

  output += `**Usage with curl:**\n`;
  output += `\`\`\`bash\n`;
  output += `curl -N "http://localhost:3000${fullUrl}"\n`;
  output += `\`\`\`\n\n`;

  output += `**Reconnection (with Last-Event-ID):**\n`;
  output += `\`\`\`bash\n`;
  output += `curl -N -H "Last-Event-ID: <event-id>" "http://localhost:3000${fullUrl}"\n`;
  output += `\`\`\`\n\n`;

  output += `**Available Filters:**\n`;
  output += `- \`status\`: pending, in_progress, completed, cancelled\n`;
  output += `- \`platform\`: Filter by creator platform (e.g., claude-code, cursor)\n`;
  output += `- \`skills\`: Comma-separated skills to match (e.g., typescript,testing)\n`;
  output += `- \`types\`: Comma-separated event types\n\n`;

  output += `**Available Event Types:**\n`;
  output += `- task.created, task.claimed, task.released\n`;
  output += `- task.completed, task.cancelled, task.deleted\n`;
  output += `- agent.registered, agent.offline\n`;

  return {
    content: [{ type: 'text', text: output }],
  };
}

/**
 * Tool definition for MCP registration
 */
export const a2aSubscribeToolDefinition = {
  name: 'a2a-subscribe',
  description:
    'Get the SSE events endpoint URL for real-time task notifications. ' +
    'Returns endpoint URL with optional filters and usage instructions.',
  inputSchema: {
    type: 'object' as const,
    properties: {
      status: {
        type: 'string',
        description: 'Filter events by task status',
        enum: VALID_STATUSES,
      },
      platform: {
        type: 'string',
        description: 'Filter events by creator platform',
        maxLength: 100,
      },
      skills: {
        type: 'array',
        description: 'Filter events by required skills (match any)',
        items: { type: 'string', maxLength: 50 },
        maxItems: 20,
      },
      types: {
        type: 'array',
        description: 'Filter events by type',
        items: { type: 'string', enum: EVENT_TYPES },
        maxItems: 10,
      },
    },
    required: [],
  },
};
