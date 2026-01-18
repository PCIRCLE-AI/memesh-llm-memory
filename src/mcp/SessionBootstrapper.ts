/**
 * Session Bootstrapper
 *
 * Preloads a short memory recap on the first MCP tool call.
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ProjectMemoryManager } from '../memory/ProjectMemoryManager.js';
import { logger } from '../utils/logger.js';

const DEFAULT_MEMORY_LIMIT = 3;

export class SessionBootstrapper {
  private hasInjected = false;

  constructor(
    private projectMemoryManager: ProjectMemoryManager,
    private memoryLimit: number = DEFAULT_MEMORY_LIMIT
  ) {}

  async maybePrepend(result: CallToolResult): Promise<CallToolResult> {
    if (this.hasInjected) {
      return result;
    }

    this.hasInjected = true;
    const message = await this.buildStartupMessage();
    if (!message) {
      return result;
    }

    const content = Array.isArray(result.content) ? result.content : [];

    return {
      ...result,
      content: [
        {
          type: 'text' as const,
          text: message,
        },
        ...content,
      ],
    };
  }

  private async buildStartupMessage(): Promise<string | null> {
    try {
      const memories = await this.projectMemoryManager.recallRecentWork({
        limit: this.memoryLimit,
      });

      if (memories.length === 0) {
        return null;
      }

      let text = '📌 Recent Project Memories\n';
      text += '━'.repeat(60) + '\n\n';

      memories.forEach((memory, index) => {
        text += `${index + 1}. ${memory.entityType}\n`;
        if (memory.createdAt) {
          text += `   Timestamp: ${memory.createdAt.toISOString()}\n`;
        }
        if (memory.observations?.length) {
          const preview = memory.observations.slice(0, 2);
          preview.forEach(obs => {
            text += `   - ${obs}\n`;
          });
          if (memory.observations.length > preview.length) {
            text += `   - ...\n`;
          }
        }
        text += '\n';
      });

      text += '━'.repeat(60) + '\n';

      return text;
    } catch (error) {
      logger.warn('Failed to preload project memories:', error);
      return null;
    }
  }
}
