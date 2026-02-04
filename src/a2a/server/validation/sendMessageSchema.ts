/**
 * SendMessage Request Validation Schema
 *
 * Provides comprehensive Zod validation for A2A SendMessage endpoint.
 * Validates the discriminated union of MessagePart types with proper
 * size limits and input sanitization.
 *
 * Security features:
 * - Input length limits (prevent DoS)
 * - Type validation via discriminated unions
 * - URL format validation for image sources
 * - Base64 format validation
 * - Size limits for text content and parts array
 */

import { z } from 'zod';

/**
 * Size limits for DoS prevention
 */
const MAX_TEXT_LENGTH = 102400; // 100KB for text content
const MAX_PARTS_COUNT = 100; // Maximum number of parts in a message
const MAX_TOOL_NAME_LENGTH = 256; // Tool names should be reasonable
const MAX_TOOL_ID_LENGTH = 256; // Tool IDs should be reasonable
const MAX_TASK_ID_LENGTH = 256; // Task IDs should be reasonable
const MAX_URL_LENGTH = 2048; // Standard URL length limit
const MAX_BASE64_LENGTH = 10485760; // 10MB for base64 encoded images
const MAX_MIME_TYPE_LENGTH = 128; // MIME types are short strings
const MAX_TOOL_INPUT_SIZE = 102400; // 100KB for tool inputs
const MAX_TOOL_RESULT_SIZE = 1048576; // 1MB for tool results (can be larger)

/**
 * Text part validation schema
 */
export const TextPartSchema = z.object({
  type: z.literal('text'),
  text: z
    .string()
    .min(1, 'Text content cannot be empty')
    .max(MAX_TEXT_LENGTH, `Text content too long (max ${MAX_TEXT_LENGTH} characters)`),
});

/**
 * Image source schema for URL type
 */
const ImageSourceUrlSchema = z.object({
  type: z.literal('url'),
  url: z
    .string()
    .min(1, 'URL cannot be empty')
    .max(MAX_URL_LENGTH, `URL too long (max ${MAX_URL_LENGTH} characters)`)
    .url('Invalid URL format'),
  data: z.undefined().optional(),
  mimeType: z
    .string()
    .max(MAX_MIME_TYPE_LENGTH, `MIME type too long (max ${MAX_MIME_TYPE_LENGTH} characters)`)
    .regex(/^[a-z]+\/[a-z0-9.+-]+$/i, 'Invalid MIME type format')
    .optional(),
});

/**
 * Image source schema for base64 type
 */
const ImageSourceBase64Schema = z.object({
  type: z.literal('base64'),
  url: z.undefined().optional(),
  data: z
    .string()
    .min(1, 'Base64 data cannot be empty')
    .max(MAX_BASE64_LENGTH, `Base64 data too long (max ${MAX_BASE64_LENGTH} bytes)`)
    .regex(/^[A-Za-z0-9+/]*={0,2}$/, 'Invalid base64 format'),
  mimeType: z
    .string()
    .min(1, 'MIME type is required for base64 images')
    .max(MAX_MIME_TYPE_LENGTH, `MIME type too long (max ${MAX_MIME_TYPE_LENGTH} characters)`)
    .regex(/^image\/[a-z0-9.+-]+$/i, 'MIME type must be an image type'),
});

/**
 * Image source discriminated union
 */
const ImageSourceSchema = z.discriminatedUnion('type', [
  ImageSourceUrlSchema,
  ImageSourceBase64Schema,
]);

/**
 * Image part validation schema
 */
export const ImagePartSchema = z.object({
  type: z.literal('image'),
  source: ImageSourceSchema,
});

/**
 * Tool call part validation schema
 */
export const ToolCallPartSchema = z.object({
  type: z.literal('tool_call'),
  id: z
    .string()
    .min(1, 'Tool call ID cannot be empty')
    .max(MAX_TOOL_ID_LENGTH, `Tool call ID too long (max ${MAX_TOOL_ID_LENGTH} characters)`),
  name: z
    .string()
    .min(1, 'Tool name cannot be empty')
    .max(MAX_TOOL_NAME_LENGTH, `Tool name too long (max ${MAX_TOOL_NAME_LENGTH} characters)`)
    .regex(/^[a-zA-Z_][a-zA-Z0-9_-]*$/, 'Tool name must be a valid identifier'),
  input: z
    .record(z.string(), z.unknown())
    .refine(
      (obj) => JSON.stringify(obj).length <= MAX_TOOL_INPUT_SIZE,
      `Tool input too large (max ${MAX_TOOL_INPUT_SIZE} bytes when serialized)`
    ),
});

/**
 * Tool result content - can be string or object
 */
const ToolResultContentSchema = z.union([
  z
    .string()
    .max(MAX_TOOL_RESULT_SIZE, `Tool result content too long (max ${MAX_TOOL_RESULT_SIZE} characters)`),
  z
    .record(z.string(), z.unknown())
    .refine(
      (obj) => JSON.stringify(obj).length <= MAX_TOOL_RESULT_SIZE,
      `Tool result object too large (max ${MAX_TOOL_RESULT_SIZE} bytes when serialized)`
    ),
]);

/**
 * Tool result part validation schema
 */
export const ToolResultPartSchema = z.object({
  type: z.literal('tool_result'),
  toolCallId: z
    .string()
    .min(1, 'Tool call ID cannot be empty')
    .max(MAX_TOOL_ID_LENGTH, `Tool call ID too long (max ${MAX_TOOL_ID_LENGTH} characters)`),
  content: ToolResultContentSchema,
  isError: z.boolean().optional(),
});

/**
 * MessagePart discriminated union schema
 *
 * Validates one of:
 * - TextPart: { type: 'text', text: string }
 * - ImagePart: { type: 'image', source: { type: 'url'|'base64', ... } }
 * - ToolCallPart: { type: 'tool_call', id, name, input }
 * - ToolResultPart: { type: 'tool_result', toolCallId, content, isError? }
 */
export const MessagePartSchema = z.discriminatedUnion('type', [
  TextPartSchema,
  ImagePartSchema,
  ToolCallPartSchema,
  ToolResultPartSchema,
]);

/**
 * Message role schema
 */
const MessageRoleSchema = z.enum(['user', 'assistant'] as const, {
  error: 'Role must be "user" or "assistant"',
});

/**
 * Message schema
 */
const MessageSchema = z.object({
  role: MessageRoleSchema,
  parts: z
    .array(MessagePartSchema)
    .min(1, 'Message must have at least one part')
    .max(MAX_PARTS_COUNT, `Too many message parts (max ${MAX_PARTS_COUNT})`),
});

/**
 * SendMessageRequest validation schema
 *
 * Validates the complete request body for the sendMessage endpoint.
 */
export const SendMessageRequestSchema = z.object({
  taskId: z
    .string()
    .max(MAX_TASK_ID_LENGTH, `Task ID too long (max ${MAX_TASK_ID_LENGTH} characters)`)
    .optional(),
  message: MessageSchema,
});

/**
 * Type inference for validated SendMessageRequest
 */
export type ValidatedSendMessageRequest = z.infer<typeof SendMessageRequestSchema>;

/**
 * Validation result type
 */
export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: ValidationErrorDetail[];
  };
}

/**
 * Validation error detail with field path
 */
export interface ValidationErrorDetail {
  path: string;
  message: string;
  code: string;
}

/**
 * Format Zod error to validation result
 *
 * Converts Zod validation errors to a structured error response
 * with field paths for debugging.
 */
export function formatZodError(error: z.ZodError): ValidationResult<never> {
  const details: ValidationErrorDetail[] = error.issues.map((issue) => ({
    path: issue.path.join('.') || 'root',
    message: issue.message,
    code: issue.code,
  }));

  const summaryMessages = details
    .slice(0, 3)
    .map((d) => `${d.path}: ${d.message}`)
    .join('; ');

  const additionalCount = details.length - 3;
  const summary =
    additionalCount > 0
      ? `${summaryMessages}; and ${additionalCount} more error(s)`
      : summaryMessages;

  return {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: `Request validation failed: ${summary}`,
      details,
    },
  };
}

/**
 * Validate SendMessageRequest
 *
 * Validates the request body and returns a typed result.
 *
 * @param data - The raw request body to validate
 * @returns Validation result with typed data or error details
 */
export function validateSendMessageRequest(
  data: unknown
): ValidationResult<ValidatedSendMessageRequest> {
  const result = SendMessageRequestSchema.safeParse(data);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  return formatZodError(result.error);
}
