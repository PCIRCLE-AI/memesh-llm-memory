import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { Router } from '../../orchestrator/router.js';
import { AgentRegistry } from '../../core/AgentRegistry.js';
import { FeedbackCollector } from '../../evolution/FeedbackCollector.js';
import { PerformanceTracker } from '../../evolution/PerformanceTracker.js';
import { LearningManager } from '../../evolution/LearningManager.js';
import { EvolutionMonitor } from '../../evolution/EvolutionMonitor.js';
import { SkillManager } from '../../skills/index.js';
import { UninstallManager } from '../../management/index.js';
import { DevelopmentButler } from '../../agents/DevelopmentButler.js';
import { CheckpointDetector } from '../../core/CheckpointDetector.js';
import { PlanningEngine } from '../../planning/PlanningEngine.js';
import { ProjectMemoryManager } from '../../memory/ProjectMemoryManager.js';
import { KnowledgeGraph } from '../../knowledge-graph/index.js';
import { HumanInLoopUI } from '../HumanInLoopUI.js';
import type { DevOpsEngineerAgent } from '../../agents/DevOpsEngineerAgent.js';
import type { WorkflowOrchestrator } from '../../agents/WorkflowOrchestrator.js';
export declare class ToolHandlers {
    private router;
    private agentRegistry;
    private feedbackCollector;
    private performanceTracker;
    private learningManager;
    private evolutionMonitor;
    private skillManager;
    private uninstallManager;
    private developmentButler;
    private checkpointDetector;
    private planningEngine;
    private projectMemoryManager;
    private knowledgeGraph;
    private ui;
    private devopsEngineer;
    private workflowOrchestrator;
    constructor(router: Router, agentRegistry: AgentRegistry, feedbackCollector: FeedbackCollector, performanceTracker: PerformanceTracker, learningManager: LearningManager, evolutionMonitor: EvolutionMonitor, skillManager: SkillManager, uninstallManager: UninstallManager, developmentButler: DevelopmentButler, checkpointDetector: CheckpointDetector, planningEngine: PlanningEngine, projectMemoryManager: ProjectMemoryManager, knowledgeGraph: KnowledgeGraph, ui: HumanInLoopUI, devopsEngineer: DevOpsEngineerAgent, workflowOrchestrator: WorkflowOrchestrator);
    handleListAgents(): Promise<CallToolResult>;
    handleListSkills(input: {
        filter?: string;
    }): Promise<CallToolResult>;
    handleUninstall(input: {
        keepData?: boolean;
        keepConfig?: boolean;
        dryRun?: boolean;
    }): Promise<CallToolResult>;
    handleGetWorkflowGuidance(input: {
        phase: string;
        filesChanged?: string[];
        testsPassing?: boolean;
    }): Promise<CallToolResult>;
    handleGetSessionHealth(): Promise<CallToolResult>;
    handleReloadContext(input: {
        reason: string;
    }): Promise<CallToolResult>;
    handleRecordTokenUsage(input: {
        inputTokens: number;
        outputTokens: number;
    }): Promise<CallToolResult>;
    handleGenerateSmartPlan(input: {
        featureDescription: string;
        requirements?: string[];
        constraints?: string[];
    }): Promise<CallToolResult>;
    handleRecallMemory(input: {
        query: string;
        limit?: number;
    }): Promise<CallToolResult>;
    handleCreateEntities(input: {
        entities: Array<{
            name: string;
            entityType: string;
            observations: string[];
            metadata?: Record<string, unknown>;
        }>;
    }): Promise<CallToolResult>;
    handleAddObservations(input: {
        observations: Array<{
            entityName: string;
            contents: string[];
        }>;
    }): Promise<CallToolResult>;
    handleCreateRelations(input: {
        relations: Array<{
            from: string;
            to: string;
            relationType: string;
            metadata?: Record<string, unknown>;
        }>;
    }): Promise<CallToolResult>;
    handleGenerateCIConfig(input: {
        platform: 'github-actions' | 'gitlab-ci';
        testCommand: string;
        buildCommand: string;
        deployCommand?: string;
        nodeVersion?: string;
        enableCaching?: boolean;
    }): Promise<CallToolResult>;
    handleAnalyzeDeployment(input: {
        testCommand?: string;
        buildCommand?: string;
    }): Promise<CallToolResult>;
    handleSetupCI(input: {
        platform: 'github-actions' | 'gitlab-ci';
        testCommand: string;
        buildCommand: string;
    }): Promise<CallToolResult>;
    handleCreateWorkflow(input: {
        description: string;
        platform?: 'opal' | 'n8n' | 'auto';
        priority?: 'speed' | 'production';
    }): Promise<CallToolResult>;
    handleListWorkflows(input: {
        platform?: 'opal' | 'n8n' | 'all';
    }): Promise<CallToolResult>;
}
//# sourceMappingURL=ToolHandlers.d.ts.map