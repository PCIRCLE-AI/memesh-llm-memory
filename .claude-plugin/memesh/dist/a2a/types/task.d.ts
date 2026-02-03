import type { MessagePart } from './protocol.js';
export type TaskState = 'SUBMITTED' | 'WORKING' | 'INPUT_REQUIRED' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'REJECTED' | 'TIMEOUT';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';
export interface Task {
    id: string;
    state: TaskState;
    createdAt: string;
    updatedAt: string;
    name?: string;
    description?: string;
    priority?: TaskPriority;
    sessionId?: string;
    messages: Message[];
    artifacts?: Artifact[];
    metadata?: Record<string, unknown>;
}
export interface Message {
    id: string;
    taskId: string;
    role: 'user' | 'assistant';
    parts: MessagePart[];
    createdAt: string;
    metadata?: Record<string, unknown>;
}
export interface Artifact {
    id: string;
    taskId: string;
    type: string;
    name?: string;
    content: string | Buffer;
    encoding?: 'utf-8' | 'base64';
    size?: number;
    createdAt: string;
    metadata?: Record<string, unknown>;
}
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
export interface TaskFilter {
    state?: TaskState | TaskState[];
    priority?: TaskPriority | TaskPriority[];
    createdAfter?: string;
    createdBefore?: string;
    sessionId?: string;
    limit?: number;
    offset?: number;
}
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
export interface UpdateTaskParams {
    state?: TaskState;
    name?: string;
    description?: string;
    priority?: TaskPriority;
    metadata?: Record<string, unknown>;
}
//# sourceMappingURL=task.d.ts.map