import { z } from 'zod';
const MAX_TEXT_LENGTH = 102400;
const MAX_PARTS_COUNT = 100;
const MAX_TOOL_NAME_LENGTH = 256;
const MAX_TOOL_ID_LENGTH = 256;
const MAX_TASK_ID_LENGTH = 256;
const MAX_URL_LENGTH = 2048;
const MAX_BASE64_LENGTH = 10485760;
const MAX_MIME_TYPE_LENGTH = 128;
const MAX_TOOL_INPUT_SIZE = 102400;
const MAX_TOOL_RESULT_SIZE = 1048576;
export const TextPartSchema = z.object({
    type: z.literal('text'),
    text: z
        .string()
        .min(1, 'Text content cannot be empty')
        .max(MAX_TEXT_LENGTH, `Text content too long (max ${MAX_TEXT_LENGTH} characters)`),
});
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
const ImageSourceSchema = z.discriminatedUnion('type', [
    ImageSourceUrlSchema,
    ImageSourceBase64Schema,
]);
export const ImagePartSchema = z.object({
    type: z.literal('image'),
    source: ImageSourceSchema,
});
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
        .refine((obj) => JSON.stringify(obj).length <= MAX_TOOL_INPUT_SIZE, `Tool input too large (max ${MAX_TOOL_INPUT_SIZE} bytes when serialized)`),
});
const ToolResultContentSchema = z.union([
    z
        .string()
        .max(MAX_TOOL_RESULT_SIZE, `Tool result content too long (max ${MAX_TOOL_RESULT_SIZE} characters)`),
    z
        .record(z.string(), z.unknown())
        .refine((obj) => JSON.stringify(obj).length <= MAX_TOOL_RESULT_SIZE, `Tool result object too large (max ${MAX_TOOL_RESULT_SIZE} bytes when serialized)`),
]);
export const ToolResultPartSchema = z.object({
    type: z.literal('tool_result'),
    toolCallId: z
        .string()
        .min(1, 'Tool call ID cannot be empty')
        .max(MAX_TOOL_ID_LENGTH, `Tool call ID too long (max ${MAX_TOOL_ID_LENGTH} characters)`),
    content: ToolResultContentSchema,
    isError: z.boolean().optional(),
});
export const MessagePartSchema = z.discriminatedUnion('type', [
    TextPartSchema,
    ImagePartSchema,
    ToolCallPartSchema,
    ToolResultPartSchema,
]);
const MessageRoleSchema = z.enum(['user', 'assistant'], {
    error: 'Role must be "user" or "assistant"',
});
const MessageSchema = z.object({
    role: MessageRoleSchema,
    parts: z
        .array(MessagePartSchema)
        .min(1, 'Message must have at least one part')
        .max(MAX_PARTS_COUNT, `Too many message parts (max ${MAX_PARTS_COUNT})`),
});
export const SendMessageRequestSchema = z.object({
    taskId: z
        .string()
        .max(MAX_TASK_ID_LENGTH, `Task ID too long (max ${MAX_TASK_ID_LENGTH} characters)`)
        .optional(),
    message: MessageSchema,
});
export function formatZodError(error) {
    const details = error.issues.map((issue) => ({
        path: issue.path.join('.') || 'root',
        message: issue.message,
        code: issue.code,
    }));
    const summaryMessages = details
        .slice(0, 3)
        .map((d) => `${d.path}: ${d.message}`)
        .join('; ');
    const additionalCount = details.length - 3;
    const summary = additionalCount > 0
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
export function validateSendMessageRequest(data) {
    const result = SendMessageRequestSchema.safeParse(data);
    if (result.success) {
        return {
            success: true,
            data: result.data,
        };
    }
    return formatZodError(result.error);
}
//# sourceMappingURL=sendMessageSchema.js.map