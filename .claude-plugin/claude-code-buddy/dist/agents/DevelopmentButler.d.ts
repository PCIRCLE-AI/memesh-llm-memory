import { CheckpointDetector } from '../core/CheckpointDetector.js';
import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { WorkflowGuidance } from '../core/WorkflowGuidanceEngine.js';
import type { LearningManager } from '../evolution/LearningManager.js';
import { SessionTokenTracker } from '../core/SessionTokenTracker.js';
import { SessionContextMonitor } from '../core/SessionContextMonitor.js';
import type { SessionHealth } from '../core/SessionContextMonitor.js';
export interface CodeAnalysisResult {
    analyzed: boolean;
    recommendations: string[];
    warnings: string[];
    suggestedAgents: string[];
    suggestedActions: string[];
}
export interface TestAnalysisResult {
    analyzed: boolean;
    status: 'success' | 'needs-attention' | 'failed';
    readyToCommit: boolean;
    recommendations?: string[];
}
export interface CommitReadinessResult {
    ready: boolean;
    blockers: string[];
    preCommitActions: string[];
}
export interface CommitAnalysisResult {
    suggestedAgents: string[];
    suggestedActions: string[];
}
export interface WorkflowState {
    phase: 'idle' | 'code-analysis' | 'test-analysis' | 'commit-ready';
    lastCheckpoint?: string;
    lastTestResults?: {
        total: number;
        passed: number;
        failed: number;
    };
}
export declare class DevelopmentButler {
    private checkpointDetector;
    private toolInterface;
    private initialized;
    private workflowState;
    private guidanceEngine?;
    private feedbackCollector?;
    private activeRequests;
    private tokenTracker;
    private contextMonitor;
    private claudeMdReloader;
    constructor(checkpointDetector: CheckpointDetector, toolInterface: MCPToolInterface, learningManager?: LearningManager);
    private initialize;
    isInitialized(): boolean;
    getTokenTracker(): SessionTokenTracker;
    getContextMonitor(): SessionContextMonitor;
    analyzeCodeChanges(data: Record<string, unknown>): Promise<CodeAnalysisResult>;
    analyzeTestResults(data: Record<string, unknown>): Promise<TestAnalysisResult>;
    checkCommitReadiness(): Promise<CommitReadinessResult>;
    analyzeCommit(data: Record<string, unknown>): Promise<CommitAnalysisResult>;
    commitCompleted(): Promise<void>;
    getWorkflowState(): WorkflowState;
    processCheckpoint(checkpointName: string, data: Record<string, unknown>): Promise<{
        guidance: WorkflowGuidance;
        formattedRequest: string;
        requestId: string;
        sessionHealth: SessionHealth;
    }>;
    private formatWorkflowGuidanceRequest;
    recordUserResponse(requestId: string, response: {
        accepted: boolean;
        wasOverridden: boolean;
        selectedAction?: string;
    }): Promise<void>;
    executeContextReload(requestId: string): Promise<{
        success: boolean;
        resourceUpdate?: unknown;
        error?: string;
    }>;
}
//# sourceMappingURL=DevelopmentButler.d.ts.map