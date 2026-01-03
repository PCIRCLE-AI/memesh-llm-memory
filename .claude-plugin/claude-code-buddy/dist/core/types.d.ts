export type ExecutionMode = 'background' | 'foreground' | 'auto';
export type TaskPriority = 'high' | 'medium' | 'low';
export type TaskStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
export interface ExecutionConfig {
    mode: ExecutionMode;
    priority: TaskPriority;
    resourceLimits: {
        maxCPU: number;
        maxMemory: number;
        maxDuration: number;
    };
    callbacks?: {
        onProgress?: (progress: number) => void;
        onComplete?: (result: unknown) => void;
        onError?: (error: Error) => void;
    };
}
export declare const DEFAULT_EXECUTION_CONFIG: ExecutionConfig;
export interface Progress {
    progress: number;
    estimatedTimeRemaining?: number;
    currentStage?: string;
    metadata?: Record<string, any>;
}
export interface SystemResources {
    cpu: {
        usage: number;
        cores: number;
    };
    memory: {
        total: number;
        used: number;
        available: number;
        usagePercent: number;
    };
    activeBackgroundAgents: number;
}
export interface ResourceCheckResult {
    canExecute: boolean;
    reason?: string;
    suggestion?: string;
    resources?: SystemResources;
}
export interface BackgroundTask {
    taskId: string;
    status: TaskStatus;
    task: unknown;
    config: ExecutionConfig;
    startTime: Date;
    endTime?: Date;
    progress?: Progress;
    result?: unknown;
    error?: Error;
}
export interface ExecutionModeSuggestion {
    recommended: ExecutionMode;
    confidence: number;
    reasoning: string;
    alternatives?: Array<{
        mode: ExecutionMode;
        pros: string[];
        cons: string[];
    }>;
}
//# sourceMappingURL=types.d.ts.map