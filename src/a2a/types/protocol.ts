/**
 * A2A Protocol Base Types
 * Based on https://a2a-protocol.org/latest/
 */

/**
 * Service operation result wrapper
 */
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
}

/**
 * Service error structure
 */
export interface ServiceError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Request parameters for SendMessage
 */
export interface SendMessageRequest {
  taskId?: string; // Optional - creates new task if not provided
  message: {
    role: 'user' | 'assistant';
    parts: MessagePart[];
  };
}

/**
 * Response from SendMessage
 */
export interface SendMessageResponse {
  taskId: string;
  status: string;
}

/**
 * Request parameters for GetTask
 */
export interface GetTaskRequest {
  taskId: string;
}

/**
 * Request parameters for ListTasks
 */
export interface ListTasksRequest {
  status?: string;
  limit?: number;
  offset?: number;
}

/**
 * Request parameters for CancelTask
 */
export interface CancelTaskRequest {
  taskId: string;
  reason?: string;
}

/**
 * Message part types
 */
export type MessagePart = TextPart | ImagePart | ToolCallPart | ToolResultPart;

/**
 * Text content part
 */
export interface TextPart {
  type: 'text';
  text: string;
}

/**
 * Image content part
 */
export interface ImagePart {
  type: 'image';
  source: {
    type: 'url' | 'base64';
    url?: string;
    data?: string;
    mimeType?: string;
  };
}

/**
 * Tool call part
 */
export interface ToolCallPart {
  type: 'tool_call';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Tool result part
 */
export interface ToolResultPart {
  type: 'tool_result';
  toolCallId: string;
  content: string | Record<string, unknown>;
  isError?: boolean;
}
