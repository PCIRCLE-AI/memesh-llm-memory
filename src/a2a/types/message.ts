/**
 * A2A Protocol Message Types
 * Based on https://a2a-protocol.org/latest/
 */

import type { MessagePart } from './protocol.js';

// Re-export message-related types from protocol and task
export type {
  MessagePart,
  TextPart,
  ImagePart,
  ToolCallPart,
  ToolResultPart,
} from './protocol.js';

export type { Message } from './task.js';

/**
 * Message role types
 */
export type Role = 'user' | 'assistant';

/**
 * Add message to task parameters
 */
export interface AddMessageParams {
  taskId: string;
  role: Role;
  parts: MessagePart[];
  metadata?: Record<string, unknown>;
}

/**
 * Message creation result
 */
export interface MessageCreated {
  id: string;
  taskId: string;
  createdAt: string;
}
