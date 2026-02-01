// src/mcp/resources/handlers/AgentStatusHandler.ts
import { ResourceContent } from '../ResourceRegistry.js';
import { URITemplateParams } from '../URITemplateHandler.js';
import { NotFoundError } from '../../../errors/index.js';

/**
 * Agent Status Resource Handler
 *
 * Provides real-time status information for registered agents.
 * URI Template: ccb://agent/{agentType}/status
 */

const VALID_AGENT_TYPES = [
  'code-reviewer',
  'test-writer',
  'development-butler',
  'e2e-healing',
  'knowledge-graph',
] as const;

interface AgentStatus {
  agentType: string;
  status: 'active' | 'idle' | 'unavailable';
  capabilities: string[];
  lastActive?: string;
}

export class AgentStatusHandler {
  /**
   * Handle agent status request
   *
   * @param params - URI template parameters
   * @returns Resource content with agent status
   */
  async handle(params: URITemplateParams): Promise<ResourceContent> {
    const agentType = params.agentType;

    if (!agentType) {
      throw new Error('Missing required parameter: agentType');
    }

    if (!VALID_AGENT_TYPES.includes(agentType as any)) {
      throw new NotFoundError(
        `Unknown agent type: ${agentType}`,
        'agent',
        agentType,
        { validTypes: VALID_AGENT_TYPES }
      );
    }

    // Get agent status (in real implementation, query from AgentRegistry)
    const status: AgentStatus = {
      agentType,
      status: 'active',
      capabilities: this.getAgentCapabilities(agentType),
      lastActive: new Date().toISOString(),
    };

    return {
      uri: `ccb://agent/${agentType}/status`,
      mimeType: 'application/json',
      text: JSON.stringify(status, null, 2),
    };
  }

  /**
   * Get capabilities for agent type
   *
   * @param agentType - Agent type
   * @returns Array of capability strings
   */
  private getAgentCapabilities(agentType: string): string[] {
    const capabilities: Record<string, string[]> = {
      'code-reviewer': ['review', 'analyze', 'suggest'],
      'test-writer': ['generate-tests', 'test-analysis'],
      'development-butler': ['project-setup', 'dependency-management'],
      'e2e-healing': ['test-healing', 'failure-analysis'],
      'knowledge-graph': ['memory', 'learning', 'recall'],
    };

    return capabilities[agentType] || [];
  }
}
