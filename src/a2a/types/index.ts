/**
 * A2A Type Definitions
 *
 * Minimal type definitions retained for local task board storage.
 * Full A2A protocol infrastructure was removed in Phase 0 Step 1.
 */

// ========================================
// Task States & Priority
// ========================================

/**
 * Task lifecycle states
 */
export type TaskState =
  | 'SUBMITTED'
  | 'WORKING'
  | 'INPUT_REQUIRED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED'
  | 'REJECTED'
  | 'TIMEOUT';

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

// ========================================
// Message Parts
// ========================================

export interface TextPart {
  type: 'text';
  text: string;
}

export interface ImagePart {
  type: 'image';
  source: {
    type: 'url' | 'base64';
    url?: string;
    data?: string;
    mimeType?: string;
  };
}

export interface ToolCallPart {
  type: 'tool_call';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultPart {
  type: 'tool_result';
  toolCallId: string;
  content: string | Record<string, unknown>;
  isError?: boolean;
}

export type MessagePart = TextPart | ImagePart | ToolCallPart | ToolResultPart;

// ========================================
// Task & Message Types
// ========================================

export interface Message {
  id: string;
  taskId: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface Artifact {
  id: string;
  taskId: string;
  type: string;
  name?: string;
  content: string | Buffer;
  encoding?: 'utf-8' | 'base64';
  size?: number;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface Task {
  id: string;
  state: TaskState;
  createdAt: string;
  updatedAt: string;
  name?: string;
  description?: string;
  priority?: TaskPriority;
  sessionId?: string;
  messages: Message[];
  artifacts?: Artifact[];
  metadata?: Record<string, unknown>;
}

export interface TaskStatus {
  id: string;
  state: TaskState;
  name?: string;
  priority?: TaskPriority;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  artifactCount: number;
}

export interface TaskFilter {
  state?: TaskState | TaskState[];
  priority?: TaskPriority | TaskPriority[];
  createdAfter?: string;
  createdBefore?: string;
  sessionId?: string;
  limit?: number;
  offset?: number;
}

export interface CreateTaskParams {
  name?: string;
  description?: string;
  priority?: TaskPriority;
  sessionId?: string;
  initialMessage?: {
    role: 'user' | 'assistant';
    parts: MessagePart[];
  };
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskParams {
  state?: TaskState;
  name?: string;
  description?: string;
  priority?: TaskPriority;
  metadata?: Record<string, unknown>;
}

export type Role = 'user' | 'assistant';

export interface AddMessageParams {
  taskId: string;
  role: Role;
  parts: MessagePart[];
  metadata?: Record<string, unknown>;
}

export interface MessageCreated {
  id: string;
  taskId: string;
  createdAt: string;
}

// ========================================
// State Machine
// ========================================

export const VALID_STATE_TRANSITIONS: Record<TaskState, TaskState[]> = {
  SUBMITTED: ['WORKING', 'CANCELED', 'REJECTED'],
  WORKING: ['COMPLETED', 'FAILED', 'TIMEOUT', 'CANCELED', 'INPUT_REQUIRED'],
  INPUT_REQUIRED: ['WORKING', 'CANCELED'],
  COMPLETED: [],
  FAILED: [],
  TIMEOUT: [],
  CANCELED: [],
  REJECTED: [],
};

export function isValidStateTransition(from: TaskState, to: TaskState): boolean {
  return VALID_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminalState(state: TaskState): boolean {
  return VALID_STATE_TRANSITIONS[state].length === 0;
}

// ========================================
// Agent Card Types
// ========================================

export interface AgentCapabilities {
  skills: Skill[];
  supportedFormats?: string[];
  maxMessageSize?: number;
  streaming?: boolean;
  pushNotifications?: boolean;
}

export interface Skill {
  name: string;
  description: string;
  parameters?: SkillParameter[];
  examples?: SkillExample[];
}

export interface SkillParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  required?: boolean;
  default?: unknown;
}

export interface SkillExample {
  description: string;
  input: Record<string, unknown>;
  output?: unknown;
}

export interface AgentRegistryEntry {
  agentId: string;
  baseUrl: string;
  port: number;
  status: 'active' | 'inactive' | 'stale';
  lastHeartbeat: string;
  processPid?: number;
  capabilities?: AgentCapabilities;
  metadata?: Record<string, unknown>;
}

export interface RegisterAgentParams {
  agentId: string;
  baseUrl: string;
  port: number;
  processPid?: number;
  capabilities?: AgentCapabilities;
  metadata?: Record<string, unknown>;
}
