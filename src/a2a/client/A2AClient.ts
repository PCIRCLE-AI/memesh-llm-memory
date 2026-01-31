/**
 * A2A HTTP Client
 * Client for making HTTP requests to other A2A agents
 */

import type {
  SendMessageRequest,
  SendMessageResponse,
  ServiceResponse,
  Task,
  TaskStatus,
  AgentCard,
} from '../types/index.js';
import { AgentRegistry } from '../storage/AgentRegistry.js';

export class A2AClient {
  private registry: AgentRegistry;

  constructor() {
    this.registry = AgentRegistry.getInstance();
  }

  async sendMessage(
    targetAgentId: string,
    request: SendMessageRequest
  ): Promise<SendMessageResponse> {
    try {
      const agent = this.registry.get(targetAgentId);
      if (!agent) {
        throw new Error(`Agent not found: ${targetAgentId}`);
      }

      const url = `${agent.baseUrl}/a2a/send-message`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      return await this.handleResponse<SendMessageResponse>(response);
    } catch (error) {
      throw new Error(
        `Failed to send message to ${targetAgentId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getTask(targetAgentId: string, taskId: string): Promise<Task> {
    try {
      const agent = this.registry.get(targetAgentId);
      if (!agent) {
        throw new Error(`Agent not found: ${targetAgentId}`);
      }

      const url = `${agent.baseUrl}/a2a/tasks/${taskId}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      return await this.handleResponse<Task>(response);
    } catch (error) {
      throw new Error(
        `Failed to get task ${taskId} from ${targetAgentId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async listTasks(
    targetAgentId: string,
    params?: { status?: string; limit?: number; offset?: number }
  ): Promise<TaskStatus[]> {
    try {
      const agent = this.registry.get(targetAgentId);
      if (!agent) {
        throw new Error(`Agent not found: ${targetAgentId}`);
      }

      const queryParams = new URLSearchParams();
      if (params?.status) queryParams.set('status', params.status);
      if (params?.limit) queryParams.set('limit', params.limit.toString());
      if (params?.offset) queryParams.set('offset', params.offset.toString());

      const url = `${agent.baseUrl}/a2a/tasks?${queryParams.toString()}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      return await this.handleResponse<TaskStatus[]>(response);
    } catch (error) {
      throw new Error(
        `Failed to list tasks from ${targetAgentId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async getAgentCard(targetAgentId: string): Promise<AgentCard> {
    try {
      const agent = this.registry.get(targetAgentId);
      if (!agent) {
        throw new Error(`Agent not found: ${targetAgentId}`);
      }

      const url = `${agent.baseUrl}/a2a/agent-card`;

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      return await this.handleResponse<AgentCard>(response);
    } catch (error) {
      throw new Error(
        `Failed to get agent card from ${targetAgentId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async cancelTask(targetAgentId: string, taskId: string): Promise<void> {
    try {
      const agent = this.registry.get(targetAgentId);
      if (!agent) {
        throw new Error(`Agent not found: ${targetAgentId}`);
      }

      const url = `${agent.baseUrl}/a2a/tasks/${taskId}/cancel`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      await this.handleResponse<{ taskId: string; status: string }>(response);
    } catch (error) {
      throw new Error(
        `Failed to cancel task ${taskId} on ${targetAgentId}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP error ${response.status}`;
      try {
        const errorData = (await response.json()) as ServiceResponse<T>;
        if (errorData.error) {
          errorMessage = errorData.error.message;
        }
      } catch {
        // Ignore JSON parsing error
      }
      throw new Error(errorMessage);
    }

    const result = (await response.json()) as ServiceResponse<T>;

    if (!result.success || !result.data) {
      const error = result.error || { code: 'UNKNOWN', message: 'Unknown error' };
      throw new Error(`[${error.code}] ${error.message}`);
    }

    return result.data;
  }

  listAvailableAgents(): string[] {
    return this.registry.listActive().map((agent) => agent.agentId);
  }
}
