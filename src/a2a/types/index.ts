/**
 * A2A Protocol Type Definitions
 * Exports all types for A2A (Agent-to-Agent) Protocol implementation
 */

// Protocol base types
export type {
  ServiceResponse,
  ServiceError,
  SendMessageRequest,
  SendMessageResponse,
  GetTaskRequest,
  ListTasksRequest,
  CancelTaskRequest,
  MessagePart,
  TextPart,
  ImagePart,
  ToolCallPart,
  ToolResultPart,
} from './protocol.js';

// Task types
export type {
  Task,
  TaskState,
  TaskPriority,
  TaskStatus,
  TaskFilter,
  CreateTaskParams,
  UpdateTaskParams,
  Artifact,
} from './task.js';

// Task state machine
export { VALID_STATE_TRANSITIONS, isValidStateTransition, isTerminalState } from './task.js';

// Message types
export type {
  Message,
  Role,
  AddMessageParams,
  MessageCreated,
} from './message.js';

// AgentCard types
export type {
  AgentCard,
  AgentCapabilities,
  Skill,
  SkillParameter,
  SkillExample,
  AgentEndpoints,
  AgentRegistryEntry,
  RegisterAgentParams,
} from './agent-card.js';

// Rate limit types
export type {
  RateLimitConfig,
  TokenBucket,
  RateLimitError,
  RateLimitStats,
} from './rateLimit.js';

// Task result types
export type { TaskResult } from './TaskResult.js';
