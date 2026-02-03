/**
 * A2A Tool Handlers
 * Handlers for Agent-to-Agent (A2A) protocol MCP tools
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { ValidationError } from '../../errors/index.js';
import { A2AClient } from '../../a2a/client/A2AClient.js';
import { AgentRegistry } from '../../a2a/storage/AgentRegistry.js';
import {
  A2ASendTaskInputSchema,
  A2AGetTaskInputSchema,
  A2AListTasksInputSchema,
  A2AListAgentsInputSchema,
  formatValidationError,
  type ValidatedA2ASendTaskInput,
  type ValidatedA2AGetTaskInput,
  type ValidatedA2AListTasksInput,
  type ValidatedA2AListAgentsInput,
} from '../validation.js';
import type { Task, TaskStatus, AgentRegistryEntry } from '../../a2a/types/index.js';

/**
 * Special agent ID representing the current agent (self)
 */
const SELF_AGENT_ID = 'self';

/**
 * A2A Tool Handlers
 *
 * Provides MCP tool handlers for Agent-to-Agent protocol operations:
 * - Send tasks to other agents
 * - Get task status from other agents
 * - List own tasks
 * - List available agents
 */
export class A2AToolHandlers {
  private client: A2AClient;
  private registry: AgentRegistry;

  constructor(client?: A2AClient, registry?: AgentRegistry) {
    this.client = client || new A2AClient();
    this.registry = registry || AgentRegistry.getInstance();
  }

  /**
   * Handle a2a-send-task tool
   * Send a task to another A2A agent
   */
  async handleA2ASendTask(args: unknown): Promise<CallToolResult> {
    // Validate input
    const parseResult = A2ASendTaskInputSchema.safeParse(args);
    if (!parseResult.success) {
      throw new ValidationError(formatValidationError(parseResult.error), {
        component: 'A2AToolHandlers',
        method: 'handleA2ASendTask',
        providedArgs: args,
      });
    }

    const input: ValidatedA2ASendTaskInput = parseResult.data;

    try {
      // Send message to create task via A2A client
      const sendResponse = await this.client.sendMessage(input.targetAgentId, {
        message: {
          role: 'user',
          parts: [
            {
              type: 'text',
              text: input.taskDescription,
            },
          ],
        },
      });

      // Get full task details
      const task = await this.client.getTask(input.targetAgentId, sendResponse.taskId);

      return {
        content: [
          {
            type: 'text',
            text: this.formatTaskSentResponse(input.targetAgentId, task),
          },
        ],
      };
    } catch (error) {
      // ✅ FIX MINOR-21: Improve error messages with actionable hints
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to send task to agent ${input.targetAgentId}: ${errorMsg}\n\n` +
        `💡 Troubleshooting tips:\n` +
        `  - Verify the agent ID is correct using 'a2a-list-agents' tool\n` +
        `  - Check if the target agent is running and accessible\n` +
        `  - Ensure MEMESH_A2A_TOKEN is configured in .env file`
      );
    }
  }

  /**
   * Handle a2a-get-task tool
   * Get task status from target agent
   */
  async handleA2AGetTask(args: unknown): Promise<CallToolResult> {
    // Validate input
    const parseResult = A2AGetTaskInputSchema.safeParse(args);
    if (!parseResult.success) {
      throw new ValidationError(formatValidationError(parseResult.error), {
        component: 'A2AToolHandlers',
        method: 'handleA2AGetTask',
        providedArgs: args,
      });
    }

    const input: ValidatedA2AGetTaskInput = parseResult.data;

    try {
      // Get task via A2A client
      const task = await this.client.getTask(input.targetAgentId, input.taskId);

      return {
        content: [
          {
            type: 'text',
            text: this.formatTaskDetailsResponse(task),
          },
        ],
      };
    } catch (error) {
      // ✅ FIX MINOR-21: Improve error messages with actionable hints
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to get task ${input.taskId} from agent ${input.targetAgentId}: ${errorMsg}\n\n` +
        `💡 Troubleshooting tips:\n` +
        `  - Verify the task ID exists using 'a2a-list-tasks' tool\n` +
        `  - Check if the target agent is running and responding\n` +
        `  - Confirm you have permission to access this task`
      );
    }
  }

  /**
   * Handle a2a-list-tasks tool
   * List own tasks (tasks assigned to this agent)
   */
  async handleA2AListTasks(args: unknown): Promise<CallToolResult> {
    // Validate input
    const parseResult = A2AListTasksInputSchema.safeParse(args);
    if (!parseResult.success) {
      throw new ValidationError(formatValidationError(parseResult.error), {
        component: 'A2AToolHandlers',
        method: 'handleA2AListTasks',
        providedArgs: args,
      });
    }

    const input: ValidatedA2AListTasksInput = parseResult.data;

    try {
      // List tasks via A2A client
      const tasks = await this.client.listTasks(SELF_AGENT_ID, {
        status: input.state,
        limit: input.limit,
        offset: input.offset,
      });

      return {
        content: [
          {
            type: 'text',
            text: this.formatTaskListResponse(tasks),
          },
        ],
      };
    } catch (error) {
      // ✅ FIX MINOR-21: Improve error messages with actionable hints
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to list tasks: ${errorMsg}\n\n` +
        `💡 Troubleshooting tips:\n` +
        `  - Verify A2A server is running\n` +
        `  - Check MEMESH_A2A_TOKEN configuration in .env\n` +
        `  - Ensure network connectivity to A2A server`
      );
    }
  }

  /**
   * Handle a2a-list-agents tool
   * List available A2A agents in the registry
   */
  async handleA2AListAgents(args: unknown): Promise<CallToolResult> {
    // Validate input
    const parseResult = A2AListAgentsInputSchema.safeParse(args);
    if (!parseResult.success) {
      throw new ValidationError(formatValidationError(parseResult.error), {
        component: 'A2AToolHandlers',
        method: 'handleA2AListAgents',
        providedArgs: args,
      });
    }

    const input: ValidatedA2AListAgentsInput = parseResult.data;

    try {
      // List agents from registry
      const agents = this.registry.listActive();

      // Filter by status if provided
      const filteredAgents =
        input.status && input.status !== 'all'
          ? agents.filter((agent) => agent.status === input.status)
          : agents;

      return {
        content: [
          {
            type: 'text',
            text: this.formatAgentListResponse(filteredAgents),
          },
        ],
      };
    } catch (error) {
      // ✅ FIX MINOR-21: Improve error messages with actionable hints
      const errorMsg = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Failed to list agents: ${errorMsg}\n\n` +
        `💡 Troubleshooting tips:\n` +
        `  - Check if agent registry is initialized\n` +
        `  - Verify A2A protocol is enabled\n` +
        `  - Try restarting the MCP server`
      );
    }
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  /**
   * Format task sent response
   */
  private formatTaskSentResponse(targetAgentId: string, task: Task): string {
    return [
      `✅ Task sent to agent: ${targetAgentId}`,
      ``,
      `Task ID: ${task.id}`,
      `State: ${task.state}`,
      `Name: ${task.name || 'N/A'}`,
      `Priority: ${task.priority || 'N/A'}`,
      `Created: ${task.createdAt}`,
      ``,
      `Use 'a2a-get-task' to check task status.`,
    ].join('\n');
  }

  /**
   * Format task details response
   */
  private formatTaskDetailsResponse(task: Task): string {
    const lines = [
      `📋 Task Details`,
      ``,
      `Task ID: ${task.id}`,
      `State: ${task.state}`,
      `Name: ${task.name || 'N/A'}`,
      `Description: ${task.description || 'N/A'}`,
      `Priority: ${task.priority || 'N/A'}`,
      `Created: ${task.createdAt}`,
      `Updated: ${task.updatedAt}`,
      ``,
      `Messages: ${task.messages.length}`,
      `Artifacts: ${task.artifacts?.length || 0}`,
    ];

    // Add session ID if present
    if (task.sessionId) {
      lines.push(`Session ID: ${task.sessionId}`);
    }

    // Add latest message if present
    if (task.messages.length > 0) {
      const latestMessage = task.messages[task.messages.length - 1];
      lines.push(``);
      lines.push(`Latest Message (${latestMessage.role}):`);
      latestMessage.parts.forEach((part) => {
        if (part.type === 'text') {
          lines.push(`  ${part.text}`);
        }
      });
    }

    return lines.join('\n');
  }

  /**
   * Format task list response
   */
  private formatTaskListResponse(tasks: TaskStatus[]): string {
    if (tasks.length === 0) {
      return '📋 No tasks found.';
    }

    const lines = [
      `📋 Own Tasks (${tasks.length} total)`,
      ``,
    ];

    tasks.forEach((task, index) => {
      lines.push(
        `${index + 1}. [${task.state}] ${task.id}`,
        `   Name: ${task.name || 'N/A'}`,
        `   Priority: ${task.priority || 'N/A'}`,
        `   Messages: ${task.messageCount} | Artifacts: ${task.artifactCount}`,
        `   Created: ${task.createdAt}`,
        ``
      );
    });

    return lines.join('\n');
  }

  /**
   * Format agent list response
   */
  private formatAgentListResponse(agents: AgentRegistryEntry[]): string {
    if (agents.length === 0) {
      return '🤖 No agents available.';
    }

    const lines = [
      `🤖 Available A2A Agents (${agents.length} total)`,
      ``,
    ];

    agents.forEach((agent, index) => {
      lines.push(
        `${index + 1}. ${agent.agentId}`,
        `   URL: ${agent.baseUrl}`,
        `   Port: ${agent.port}`,
        `   Status: ${agent.status}`,
        `   Last Heartbeat: ${agent.lastHeartbeat}`,
        ``
      );
    });

    return lines.join('\n');
  }
}
