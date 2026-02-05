import { z } from 'zod';
export declare const TextPartSchema: z.ZodObject<{
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
}, z.core.$strip>;
export declare const ImagePartSchema: z.ZodObject<{
    type: z.ZodLiteral<"image">;
    source: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"url">;
        url: z.ZodString;
        data: z.ZodOptional<z.ZodUndefined>;
        mimeType: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"base64">;
        url: z.ZodOptional<z.ZodUndefined>;
        data: z.ZodString;
        mimeType: z.ZodString;
    }, z.core.$strip>], "type">;
}, z.core.$strip>;
export declare const ToolCallPartSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_call">;
    id: z.ZodString;
    name: z.ZodString;
    input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>;
export declare const ToolResultPartSchema: z.ZodObject<{
    type: z.ZodLiteral<"tool_result">;
    toolCallId: z.ZodString;
    content: z.ZodUnion<readonly [z.ZodString, z.ZodRecord<z.ZodString, z.ZodUnknown>]>;
    isError: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const MessagePartSchema: z.ZodDiscriminatedUnion<[z.ZodObject<{
    type: z.ZodLiteral<"text">;
    text: z.ZodString;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"image">;
    source: z.ZodDiscriminatedUnion<[z.ZodObject<{
        type: z.ZodLiteral<"url">;
        url: z.ZodString;
        data: z.ZodOptional<z.ZodUndefined>;
        mimeType: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>, z.ZodObject<{
        type: z.ZodLiteral<"base64">;
        url: z.ZodOptional<z.ZodUndefined>;
        data: z.ZodString;
        mimeType: z.ZodString;
    }, z.core.$strip>], "type">;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"tool_call">;
    id: z.ZodString;
    name: z.ZodString;
    input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
}, z.core.$strip>, z.ZodObject<{
    type: z.ZodLiteral<"tool_result">;
    toolCallId: z.ZodString;
    content: z.ZodUnion<readonly [z.ZodString, z.ZodRecord<z.ZodString, z.ZodUnknown>]>;
    isError: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>], "type">;
export declare const SendMessageRequestSchema: z.ZodObject<{
    taskId: z.ZodOptional<z.ZodString>;
    message: z.ZodObject<{
        role: z.ZodEnum<{
            user: "user";
            assistant: "assistant";
        }>;
        parts: z.ZodArray<z.ZodDiscriminatedUnion<[z.ZodObject<{
            type: z.ZodLiteral<"text">;
            text: z.ZodString;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"image">;
            source: z.ZodDiscriminatedUnion<[z.ZodObject<{
                type: z.ZodLiteral<"url">;
                url: z.ZodString;
                data: z.ZodOptional<z.ZodUndefined>;
                mimeType: z.ZodOptional<z.ZodString>;
            }, z.core.$strip>, z.ZodObject<{
                type: z.ZodLiteral<"base64">;
                url: z.ZodOptional<z.ZodUndefined>;
                data: z.ZodString;
                mimeType: z.ZodString;
            }, z.core.$strip>], "type">;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"tool_call">;
            id: z.ZodString;
            name: z.ZodString;
            input: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        }, z.core.$strip>, z.ZodObject<{
            type: z.ZodLiteral<"tool_result">;
            toolCallId: z.ZodString;
            content: z.ZodUnion<readonly [z.ZodString, z.ZodRecord<z.ZodString, z.ZodUnknown>]>;
            isError: z.ZodOptional<z.ZodBoolean>;
        }, z.core.$strip>], "type">>;
    }, z.core.$strip>;
}, z.core.$strip>;
export type ValidatedSendMessageRequest = z.infer<typeof SendMessageRequestSchema>;
export interface ValidationResult<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        details?: ValidationErrorDetail[];
    };
}
export interface ValidationErrorDetail {
    path: string;
    message: string;
    code: string;
}
export declare function formatZodError(error: z.ZodError): ValidationResult<never>;
export declare function validateSendMessageRequest(data: unknown): ValidationResult<ValidatedSendMessageRequest>;
//# sourceMappingURL=sendMessageSchema.d.ts.map