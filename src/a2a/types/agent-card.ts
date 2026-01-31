/**
 * A2A Protocol AgentCard Types
 * Based on https://a2a-protocol.org/latest/
 */

/**
 * AgentCard - Agent self-description
 */
export interface AgentCard {
  id: string;
  name: string;
  description?: string;
  version?: string;
  capabilities: AgentCapabilities;
  endpoints: AgentEndpoints;
  metadata?: Record<string, unknown>;
}

/**
 * Agent capabilities
 */
export interface AgentCapabilities {
  skills: Skill[];
  supportedFormats?: string[]; // e.g., ['text/plain', 'image/png']
  maxMessageSize?: number; // bytes
  streaming?: boolean;
  pushNotifications?: boolean;
}

/**
 * Skill that agent can perform
 */
export interface Skill {
  name: string;
  description: string;
  parameters?: SkillParameter[];
  examples?: SkillExample[];
}

/**
 * Skill parameter definition
 */
export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: unknown;
}

/**
 * Skill usage example
 */
export interface SkillExample {
  description: string;
  input: Record<string, unknown>;
  output?: unknown;
}

/**
 * Agent service endpoints
 */
export interface AgentEndpoints {
  baseUrl: string; // e.g., "http://localhost:3001"
  sendMessage?: string; // Default: "/a2a/send-message"
  getTask?: string; // Default: "/a2a/tasks/:taskId"
  listTasks?: string; // Default: "/a2a/tasks"
  cancelTask?: string; // Default: "/a2a/tasks/:taskId/cancel"
  getAgentCard?: string; // Default: "/a2a/agent-card"
}

/**
 * Agent registry entry
 */
export interface AgentRegistryEntry {
  agentId: string;
  baseUrl: string;
  port: number;
  status: 'active' | 'inactive' | 'stale';
  lastHeartbeat: string; // ISO 8601 timestamp
  capabilities?: AgentCapabilities;
  metadata?: Record<string, unknown>;
}

/**
 * Agent registration parameters
 */
export interface RegisterAgentParams {
  agentId: string;
  baseUrl: string;
  port: number;
  capabilities?: AgentCapabilities;
  metadata?: Record<string, unknown>;
}
