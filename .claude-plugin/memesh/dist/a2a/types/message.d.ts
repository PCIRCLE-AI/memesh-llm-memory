import type { MessagePart } from './protocol.js';
export type { MessagePart, TextPart, ImagePart, ToolCallPart, ToolResultPart, } from './protocol.js';
export type { Message } from './task.js';
export type Role = 'user' | 'assistant';
export interface AddMessageParams {
    taskId: string;
    role: Role;
    parts: MessagePart[];
    metadata?: Record<string, unknown>;
}
export interface MessageCreated {
    id: string;
    taskId: string;
    createdAt: string;
}
//# sourceMappingURL=message.d.ts.map