import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { AgentRegistry } from '../../core/AgentRegistry.js';
import { SkillManager } from '../../skills/index.js';
import { UninstallManager } from '../../management/index.js';
import { CheckpointDetector } from '../../core/CheckpointDetector.js';
import { HookIntegration } from '../../core/HookIntegration.js';
import { ProjectMemoryManager } from '../../memory/ProjectMemoryManager.js';
import { UnifiedMemoryStore } from '../../memory/UnifiedMemoryStore.js';
import { KnowledgeGraph } from '../../knowledge-graph/index.js';
import { HumanInLoopUI } from '../HumanInLoopUI.js';
import { SamplingClient } from '../SamplingClient.js';
export declare class ToolHandlers {
    private agentRegistry;
    private skillManager;
    private uninstallManager;
    private checkpointDetector;
    private hookIntegration;
    private projectMemoryManager;
    private knowledgeGraph;
    private ui;
    private samplingClient;
    private memoryRateLimiter;
    private unifiedMemoryStore;
    private mistakePatternEngine;
    private userPreferenceEngine;
    constructor(agentRegistry: AgentRegistry, skillManager: SkillManager, uninstallManager: UninstallManager, checkpointDetector: CheckpointDetector, hookIntegration: HookIntegration, projectMemoryManager: ProjectMemoryManager | undefined, knowledgeGraph: KnowledgeGraph | undefined, ui: HumanInLoopUI, samplingClient: SamplingClient, unifiedMemoryStore: UnifiedMemoryStore | undefined);
    private isCloudOnlyMode;
    private cloudOnlyModeError;
    handleListSkills(args: unknown): Promise<CallToolResult>;
    handleUninstall(args: unknown): Promise<CallToolResult>;
    handleHookToolUse(args: unknown): Promise<CallToolResult>;
    handleRecallMemory(args: unknown): Promise<CallToolResult>;
    handleCreateEntities(args: unknown): Promise<CallToolResult>;
    handleBuddyRecordMistake(args: unknown): Promise<CallToolResult>;
    handleAddObservations(args: unknown): Promise<CallToolResult>;
    handleCreateRelations(args: unknown): Promise<CallToolResult>;
    handleGenerateTests(args: unknown): Promise<CallToolResult>;
}
//# sourceMappingURL=ToolHandlers.d.ts.map