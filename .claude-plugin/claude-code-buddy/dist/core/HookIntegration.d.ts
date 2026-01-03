import { CheckpointDetector } from './CheckpointDetector.js';
import { DevelopmentButler } from '../agents/DevelopmentButler.js';
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
    constructor(checkpointDetector: CheckpointDetector, developmentButler: DevelopmentButler);
    initializeProjectMemory(mcp: MCPToolInterface): void;
    detectCheckpointFromToolUse(toolData: ToolUseData): Promise<Checkpoint | null>;
    processToolUse(toolData: ToolUseData): Promise<void>;
    private recordToProjectMemory;
    onButlerTrigger(callback: (context: CheckpointContext) => void): void;
    private isTestFile;
    private isTestCommand;
    private isGitAddCommand;
    private parseTestOutput;
}
export {};
//# sourceMappingURL=HookIntegration.d.ts.map