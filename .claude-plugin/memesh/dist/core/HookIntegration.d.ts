import { CheckpointDetector } from './CheckpointDetector.js';
import { DevelopmentButler } from '../agents/DevelopmentButler.js';
import { ProjectAutoTracker } from '../memory/ProjectAutoTracker.js';
import type { MCPToolInterface } from './MCPToolInterface.js';
export interface ToolUseData {
    toolName: string;
    arguments?: unknown;
    success: boolean;
    duration?: number;
    tokensUsed?: number;
    output?: string;
}
interface Checkpoint {
    name: string;
    data: Record<string, unknown>;
}
export interface CheckpointContext {
    checkpoint: string;
    data: Record<string, unknown>;
    toolName: string;
}
export declare class HookIntegration {
    private detector;
    private butler;
    private triggerCallbacks;
    private projectMemory?;
    private lastCheckpoint?;
    private testParser;
    private projectAutoTracker?;
    constructor(checkpointDetector: CheckpointDetector, developmentButler: DevelopmentButler, projectAutoTracker?: ProjectAutoTracker);
    initializeProjectMemory(mcp: MCPToolInterface): void;
    detectCheckpointFromToolUse(toolData: ToolUseData): Promise<Checkpoint | null>;
    processToolUse(toolData: ToolUseData): Promise<void>;
    private recordToProjectMemory;
    private static readonly TRACKED_PHASES;
    private recordCheckpointProgress;
    private buildCheckpointDetails;
    private ensureProjectMemoryInitialized;
    onButlerTrigger(callback: (context: CheckpointContext) => void): void;
    private static readonly TEST_FILE_PATTERNS;
    private static readonly TEST_COMMAND_PATTERNS;
    private isTestFile;
    private isTestCommand;
    private isGitAddCommand;
    private isGitCommitCommand;
    private extractGitCommitMessage;
    private findGitCommitSegment;
    private isValidTestResults;
    private shouldRecordError;
    private recordErrorFromOutput;
}
export {};
//# sourceMappingURL=HookIntegration.d.ts.map