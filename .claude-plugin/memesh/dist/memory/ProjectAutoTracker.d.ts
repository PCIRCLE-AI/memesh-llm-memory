import type { MCPToolInterface } from '../core/MCPToolInterface.js';
export declare enum CheckpointPriority {
    NORMAL = 1,
    IMPORTANT = 2,
    CRITICAL = 3
}
export interface TestResult {
    passed: number;
    failed: number;
    total: number;
    failures: string[];
}
export declare class ProjectAutoTracker {
    private mcp;
    private snapshotThreshold;
    private currentTokenCount;
    private pendingFiles;
    private pendingDescriptions;
    private pendingTimer?;
    private pendingSince?;
    private aggregationWindowMs;
    private recentMemories;
    private mergeWindowMs;
    constructor(mcp: MCPToolInterface);
    getSnapshotThreshold(): number;
    getCurrentTokenCount(): number;
    addTokens(count: number): Promise<void>;
    recordCodeChange(files: string[], description: string): Promise<void>;
    recordTaskStart(data: {
        task_description: string;
        goal: string;
        reason?: string;
        expected_outcome?: string;
        priority?: string;
    }): Promise<void>;
    recordDecision(data: {
        decision_description: string;
        context: string;
        options_considered?: string[];
        chosen_option: string;
        rationale: string;
        trade_offs?: string;
        confidence?: string;
    }): Promise<void>;
    recordProgressMilestone(data: {
        milestone_description: string;
        significance: string;
        impact?: string;
        learnings?: string;
        next_steps?: string;
    }): Promise<void>;
    recordError(data: {
        error_type: string;
        error_message: string;
        context: string;
        root_cause?: string;
        resolution: string;
        prevention?: string;
    }): Promise<void>;
    recordTestResult(result: TestResult): Promise<void>;
    recordWorkflowCheckpoint(checkpoint: string, details?: string[]): Promise<void>;
    recordCommit(details: {
        message?: string;
        command?: string;
        output?: string;
    }): Promise<void>;
    private createSnapshot;
    flushPendingCodeChanges(reason: string): Promise<void>;
    private shouldSkipDueToRecent;
    private cleanupOldMemories;
    private clearPendingState;
    private static readonly MAX_FILES_IN_OBSERVATION;
    private static readonly CHECKPOINT_PRIORITIES;
    private getPriorityForCheckpoint;
    private schedulePendingFlush;
    createFileChangeHook(): (files: string[], description: string) => Promise<void>;
    createTestResultHook(): (result: TestResult) => Promise<void>;
    createTokenHook(): (count: number) => Promise<void>;
}
//# sourceMappingURL=ProjectAutoTracker.d.ts.map