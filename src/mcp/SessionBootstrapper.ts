/**
 * Session Bootstrapper
 *
 * Preloads a short memory recap on the first MCP tool call.
 */

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { ProjectMemoryManager } from '../memory/ProjectMemoryManager.js';
import type { SessionMemoryPipeline } from '../integrations/session-memory/index.js';
import { logger } from '../utils/logger.js';

const DEFAULT_MEMORY_LIMIT = 3;

export class SessionBootstrapper {
  private hasInjected = false;

  constructor(
    private projectMemoryManager: ProjectMemoryManager | undefined,
    private memoryLimit: number = DEFAULT_MEMORY_LIMIT,
    private sessionMemoryPipeline?: SessionMemoryPipeline,
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
    // Skip if running in cloud-only mode (no local memory systems)
    if (!this.projectMemoryManager) {
      return null;
    }

    let text = '';

    // 1. Collect recent project memories
    try {
      const memories = await this.projectMemoryManager.recallRecentWork({
        limit: this.memoryLimit,
      });

      if (memories.length > 0) {
        text += '📌 Recent Project Memories\n';
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
      }
    } catch (error) {
      logger.error('Failed to preload project memories:', error);
    }

    // 2. Append session memory context from Knowledge Graph (if pipeline available)
    if (this.sessionMemoryPipeline) {
      try {
        const sessionContext = this.sessionMemoryPipeline.generateContext();
        if (sessionContext) {
          text += (text ? '\n' : '') + sessionContext + '\n';
        }
      } catch (error) {
        logger.warn('Failed to generate session memory context:', error);
      }
    }

    return text || null;
  }
}
