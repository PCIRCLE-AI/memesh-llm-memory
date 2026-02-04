/**
 * A2A Server Validation Module
 *
 * Exports validation schemas and utilities for A2A server endpoints.
 */

export {
  SendMessageRequestSchema,
  MessagePartSchema,
  TextPartSchema,
  ImagePartSchema,
  ToolCallPartSchema,
  ToolResultPartSchema,
  validateSendMessageRequest,
  formatZodError,
  type ValidatedSendMessageRequest,
  type ValidationResult,
  type ValidationErrorDetail,
} from './sendMessageSchema.js';
