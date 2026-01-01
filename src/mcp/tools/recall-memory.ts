/**
 * MCP Tool: recall-memory
 *
 * Recalls project memory from previous sessions stored in the Knowledge Graph.
 * Returns recent code changes, test results, and work context.
 */

import type { ProjectMemoryManager } from '../../memory/ProjectMemoryManager.js';

export interface RecallMemoryArgs {
  /** Maximum number of memories to return (default: 10) */
  limit?: number;
  /** Optional search query to filter memories (placeholder for future use) */
  query?: string;
}

/**
 * MCP Tool definition for recalling project memory
 */
export const recallMemoryTool = {
  name: 'recall-memory',
  description: 'Recall project memory from previous sessions. Returns recent code changes, test results, and work context.',

  inputSchema: {
    type: 'object' as const,
    properties: {
      limit: {
        type: 'number',
        description: 'Maximum number of memories to return (default: 10)',
        default: 10,
      },
      query: {
        type: 'string',
        description: 'Optional search query to filter memories',
      },
    },
  },

  /**
   * Handler for recall-memory tool
   *
   * @param args - Tool arguments
   * @param memoryManager - ProjectMemoryManager instance
   * @returns Formatted memory objects
   */
  async handler(
    args: RecallMemoryArgs,
    memoryManager: ProjectMemoryManager
  ) {
    const memories = await memoryManager.recallRecentWork({
      limit: args.limit || 10,
    });

    return {
      memories: memories.map(m => ({
        type: m.type,
        observations: m.observations,
        timestamp: m.metadata?.timestamp,
      })),
    };
  },
};
