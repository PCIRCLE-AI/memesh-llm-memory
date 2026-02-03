export interface ServiceResponse<T> {
    success: boolean;
    data?: T;
    error?: ServiceError;
}
export interface ServiceError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}
export interface SendMessageRequest {
    taskId?: string;
    message: {
        role: 'user' | 'assistant';
        parts: MessagePart[];
    };
}
export interface SendMessageResponse {
    taskId: string;
    status: string;
}
export interface GetTaskRequest {
    taskId: string;
}
export interface ListTasksRequest {
    status?: string;
    limit?: number;
    offset?: number;
}
export interface CancelTaskRequest {
    taskId: string;
    reason?: string;
}
export type MessagePart = TextPart | ImagePart | ToolCallPart | ToolResultPart;
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
//# sourceMappingURL=protocol.d.ts.map