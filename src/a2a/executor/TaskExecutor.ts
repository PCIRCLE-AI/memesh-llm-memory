/**
 * Task Executor
 * Phase 0.5 - Simplified executor that echoes responses
 * Phase 1 will add MCP client task delegation
 *
 * IMPORTANT: MeMesh is an MCP Server, not a standalone AI agent.
 * Tasks should be delegated to the connected MCP client (Claude Code/Claude Desktop),
 * NOT executed directly via Claude API.
 */

import type { TaskQueue } from '../storage/TaskQueue.js';
import type { MessagePart } from '../types/index.js';

export class TaskExecutor {
  constructor(private taskQueue: TaskQueue) {}

  /**
   * Execute a task (Phase 0.5: Simple echo, no MCP delegation)
   * Phase 1 will delegate tasks to connected MCP client
   */
  async executeTask(taskId: string): Promise<void> {
    // Get the task
    const task = this.taskQueue.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Transition to WORKING state
    this.taskQueue.updateTaskStatus(taskId, { state: 'WORKING' });

    try {
      // Small delay to ensure WORKING state is observable in tests
      // In production, this would be replaced by MCP client processing time
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Extract user message content
      const userMessage = this.extractUserMessage(task.messages);

      // Phase 0.5: Generate simple echo response
      const responseText = this.generateEchoResponse(userMessage);

      // Add assistant response message
      this.taskQueue.addMessage({
        taskId,
        role: 'assistant',
        parts: [{ type: 'text', text: responseText }],
      });

      // Create artifact with the response
      this.taskQueue.addArtifact({
        taskId,
        type: 'text/plain',
        name: 'response.txt',
        content: responseText,
        encoding: 'utf-8',
      });

      // Transition to COMPLETED state
      this.taskQueue.updateTaskStatus(taskId, { state: 'COMPLETED' });
    } catch (error) {
      // On error, transition to FAILED state
      this.taskQueue.updateTaskStatus(taskId, { state: 'FAILED' });
      throw error;
    }
  }

  /**
   * Extract text content from user messages
   */
  private extractUserMessage(messages: Array<{ role: string; parts: MessagePart[] }>): string {
    const userMessages = messages.filter((msg) => msg.role === 'user');

    if (userMessages.length === 0) {
      return '(No user message provided)';
    }

    // Extract text from all user message parts
    const textParts: string[] = [];
    for (const msg of userMessages) {
      for (const part of msg.parts) {
        if (part.type === 'text') {
          textParts.push(part.text);
        }
      }
    }

    return textParts.join('\n') || '(No text content in messages)';
  }

  /**
   * Generate simple echo response (Phase 0.5)
   * Phase 1 will delegate to connected MCP client
   */
  private generateEchoResponse(userMessage: string): string {
    return `Echo: ${userMessage}\n\n[Phase 0.5 - Simplified executor response. Phase 1 will delegate to MCP client.]`;
  }
}
