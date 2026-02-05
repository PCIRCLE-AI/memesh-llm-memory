/**
 * A2A Protocol Task Types
 * Based on https://a2a-protocol.org/latest/
 */

import type { MessagePart } from './protocol.js';

/**
 * Task lifecycle states
 */
export type TaskState =
  | 'SUBMITTED' // Initial state when task is created
  | 'WORKING' // Agent has started processing the task
  | 'INPUT_REQUIRED' // Task requires input from user
  | 'COMPLETED' // Task completed successfully
  | 'FAILED' // Task failed with error
  | 'CANCELED' // Task was canceled
  | 'REJECTED' // Task was rejected (invalid or cannot be processed)
  | 'TIMEOUT'; // Task exceeded time limit

/**
 * Task priority levels
 */
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Core Task structure
 */
export interface Task {
  id: string;
  state: TaskState;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp
  name?: string;
  description?: string;
  priority?: TaskPriority;
  sessionId?: string;
  messages: Message[];
  artifacts?: Artifact[];
  metadata?: Record<string, unknown>;
}

/**
 * Message in task history
 */
export interface Message {
  id: string;
  taskId: string;
  role: 'user' | 'assistant';
  parts: MessagePart[];
  createdAt: string; // ISO 8601 timestamp
  metadata?: Record<string, unknown>;
}

/**
 * Artifact produced by task
 */
export interface Artifact {
  id: string;
  taskId: string;
  type: string; // MIME type or custom type
  name?: string;
  content: string | Buffer; // Text or binary content
  encoding?: 'utf-8' | 'base64';
  size?: number; // bytes
  createdAt: string; // ISO 8601 timestamp
  metadata?: Record<string, unknown>;
}

/**
 * Task status information (lightweight version for lists)
 */
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

/**
 * Task filter criteria
 */
export interface TaskFilter {
  state?: TaskState | TaskState[];
  priority?: TaskPriority | TaskPriority[];
  createdAfter?: string; // ISO 8601 timestamp
  createdBefore?: string; // ISO 8601 timestamp
  sessionId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Task creation parameters
 */
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

/**
 * Task update parameters
 */
export interface UpdateTaskParams {
  state?: TaskState;
  name?: string;
  description?: string;
  priority?: TaskPriority;
  metadata?: Record<string, unknown>;
}

/**
 * Valid state transitions map
 * Defines which state transitions are allowed in the task lifecycle
 */
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

/**
 * Check if a state transition is valid
 *
 * @param from - Current state
 * @param to - Target state
 * @returns true if transition is valid
 *
 * @example
 * isValidStateTransition('SUBMITTED', 'WORKING') // true
 * isValidStateTransition('SUBMITTED', 'COMPLETED') // false (must go through WORKING)
 * isValidStateTransition('COMPLETED', 'WORKING') // false (terminal state)
 */
export function isValidStateTransition(from: TaskState, to: TaskState): boolean {
  return VALID_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Check if a state is terminal (no further transitions allowed)
 *
 * @param state - State to check
 * @returns true if state is terminal
 *
 * @example
 * isTerminalState('COMPLETED') // true
 * isTerminalState('WORKING') // false
 */
export function isTerminalState(state: TaskState): boolean {
  return VALID_STATE_TRANSITIONS[state].length === 0;
}
