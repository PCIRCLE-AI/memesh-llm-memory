/**
 * A2A Event Types
 *
 * Type definitions for real-time event notifications in the A2A Protocol.
 * These events are used for SSE (Server-Sent Events) streaming to notify
 * clients about task and agent lifecycle changes.
 */

import { TaskStatus } from '../storage/TaskBoard.js';

/**
 * All supported event types for the A2A Protocol
 *
 * Task events:
 * - task.created: A new task has been added to the board
 * - task.claimed: An agent has claimed ownership of a task
 * - task.released: A task has been released back to pending
 * - task.completed: A task has been marked as completed
 * - task.cancelled: A task has been cancelled
 * - task.deleted: A task has been permanently deleted
 *
 * Agent events:
 * - agent.registered: A new agent has registered or updated
 * - agent.offline: An agent has gone offline
 */
export const EVENT_TYPES = [
  'task.created',
  'task.claimed',
  'task.released',
  'task.completed',
  'task.cancelled',
  'task.deleted',
  'agent.registered',
  'agent.offline',
] as const;

/**
 * Union type of all valid event types
 */
export type EventType = (typeof EVENT_TYPES)[number];

/**
 * Task event data payload
 *
 * Contains information about the task that triggered the event.
 * The status field can include 'cancelled' which is not a standard TaskStatus.
 */
export interface TaskEventData {
  /** Unique task identifier */
  taskId: string;
  /** Task subject/title */
  subject: string;
  /** Current task status (includes 'cancelled' for cancel events) */
  status: TaskStatus | 'cancelled';
  /** Agent ID that owns the task, or null if unassigned */
  owner: string | null;
  /** Platform that created the task */
  creator_platform: string;
  /** Agent ID that performed the action (optional) */
  actor?: string;
}

/**
 * Agent event data payload
 *
 * Contains information about the agent that triggered the event.
 */
export interface AgentEventData {
  /** Unique agent identifier */
  agentId: string;
  /** Platform the agent is running on */
  platform: string;
  /** List of skills the agent has (optional) */
  skills?: string[];
}

/**
 * Base A2A event structure
 *
 * All events follow this structure for consistent handling.
 * The generic parameter T allows type-safe access to event data.
 *
 * @template T - The type of the event data payload
 */
export interface A2AEvent<T = TaskEventData | AgentEventData> {
  /** Unique event identifier */
  id: string;
  /** Type of the event */
  type: EventType;
  /** Unix timestamp in milliseconds when the event occurred */
  timestamp: number;
  /** Event-specific data payload */
  data: T;
}

/**
 * Type guard to check if an event type is a task event
 *
 * @param type - The event type to check
 * @returns true if the event type starts with 'task.'
 */
export function isTaskEvent(type: EventType): boolean {
  return type.startsWith('task.');
}

/**
 * Type guard to check if an event type is an agent event
 *
 * @param type - The event type to check
 * @returns true if the event type starts with 'agent.'
 */
export function isAgentEvent(type: EventType): boolean {
  return type.startsWith('agent.');
}
