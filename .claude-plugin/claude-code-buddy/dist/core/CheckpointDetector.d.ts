export type CheckpointCallback = (data: Record<string, unknown>) => Promise<{
    success: boolean;
}>;
export interface CheckpointMetadata {
    description?: string;
    priority?: string;
    category?: string;
}
export interface CheckpointTriggerResult {
    triggered: boolean;
    checkpointName: string;
    error?: string;
    failedCallbacks?: number;
}
export declare class CheckpointDetector {
    private checkpoints;
    registerCheckpoint(checkpointName: string, callback: CheckpointCallback, metadata?: CheckpointMetadata): boolean;
    addCallback(checkpointName: string, callback: CheckpointCallback): boolean;
    isCheckpointRegistered(checkpointName: string): boolean;
    getRegisteredCheckpoints(): string[];
    triggerCheckpoint(checkpointName: string, data: Record<string, unknown>): Promise<CheckpointTriggerResult>;
    unregisterCheckpoint(checkpointName: string): boolean;
    getCheckpointMetadata(checkpointName: string): CheckpointMetadata | undefined;
}
//# sourceMappingURL=CheckpointDetector.d.ts.map