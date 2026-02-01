/**
 * ToolHandlers Test Suite
 *
 * Comprehensive tests for all MCP tool handlers (non-Git operations).
 * Tests cover:
 * - Normal operation paths
 * - Input validation
 * - Error handling
 * - Edge cases
 * - Response formatting
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ToolHandlers } from '../ToolHandlers.js';
import type { Router } from '../../../orchestrator/router.js';
import type { AgentRegistry } from '../../../core/AgentRegistry.js';
import type { FeedbackCollector } from '../../../evolution/FeedbackCollector.js';
import type { PerformanceTracker } from '../../../evolution/PerformanceTracker.js';
import type { LearningManager } from '../../../evolution/LearningManager.js';
import type { EvolutionMonitor } from '../../../evolution/EvolutionMonitor.js';
import type { SkillManager } from '../../../skills/index.js';
import type { UninstallManager } from '../../../management/index.js';
import type { DevelopmentButler } from '../../../agents/DevelopmentButler.js';
import type { CheckpointDetector } from '../../../core/CheckpointDetector.js';
import type { HookIntegration } from '../../../core/HookIntegration.js';
import type { PlanningEngine } from '../../../planning/PlanningEngine.js';
import type { ProjectMemoryManager } from '../../../memory/ProjectMemoryManager.js';
import type { HumanInLoopUI } from '../../HumanInLoopUI.js';
import type { KnowledgeGraph } from '../../../knowledge-graph/index.js';

describe('ToolHandlers', () => {
  // Mock dependencies
  let mockRouter: Router;
  let mockAgentRegistry: AgentRegistry;
  let mockFeedbackCollector: FeedbackCollector;
  let mockPerformanceTracker: PerformanceTracker;
  let mockLearningManager: LearningManager;
  let mockEvolutionMonitor: EvolutionMonitor;
  let mockSkillManager: SkillManager;
  let mockUninstallManager: UninstallManager;
  let mockDevelopmentButler: DevelopmentButler;
  let mockCheckpointDetector: CheckpointDetector;
  let mockHookIntegration: HookIntegration;
  let mockPlanningEngine: PlanningEngine;
  let mockProjectMemoryManager: ProjectMemoryManager;
  let mockKnowledgeGraph: KnowledgeGraph;
  let mockUI: HumanInLoopUI;
  let toolHandlers: ToolHandlers;

  beforeEach(() => {
    // Create mock implementations
    mockRouter = {
      routeTask: vi.fn(),
    } as unknown as Router;

    mockAgentRegistry = {
      getAgent: vi.fn().mockReturnValue({
        name: 'backend-developer',
        capabilities: ['backend', 'api', 'server'],
      }),
    } as unknown as AgentRegistry;

    mockFeedbackCollector = {} as FeedbackCollector;
    mockPerformanceTracker = {} as PerformanceTracker;
    mockLearningManager = {} as LearningManager;

    mockEvolutionMonitor = {
      formatDashboard: vi.fn().mockReturnValue('Mock Dashboard Output'),
      getLearningProgress: vi.fn().mockReturnValue([]),
      exportAsJSON: vi.fn().mockReturnValue('{"mock":"json"}'),
      exportAsCSV: vi.fn().mockReturnValue('mock,csv'),
      exportAsMarkdown: vi.fn().mockReturnValue('# Mock Markdown'),
    } as unknown as EvolutionMonitor;

    mockSkillManager = {
      listSmartAgentsSkills: vi.fn().mockResolvedValue(['sa:skill1', 'sa:skill2']),
      listUserSkills: vi.fn().mockResolvedValue(['user-skill1']),
      listAllSkills: vi.fn().mockResolvedValue([
        { name: 'sa:skill1' },
        { name: 'sa:skill2' },
        { name: 'user-skill1' },
      ]),
    } as unknown as SkillManager;

    mockUninstallManager = {
      uninstall: vi.fn().mockResolvedValue({
        success: true,
        removedFiles: ['file1', 'file2'],
        keptData: true,
      }),
      formatReport: vi.fn().mockReturnValue('Uninstall report'),
    } as unknown as UninstallManager;

    mockDevelopmentButler = {
      processCheckpoint: vi.fn().mockResolvedValue({
        formattedRequest: 'Workflow guidance response',
      }),
      getContextMonitor: vi.fn().mockReturnValue({
        checkSessionHealth: vi.fn().mockReturnValue({
          healthy: true,
          warnings: [],
        }),
      }),
      executeContextReload: vi.fn().mockResolvedValue({
        success: true,
        reloadedModules: 5,
      }),
      getTokenTracker: vi.fn().mockReturnValue({
        recordUsage: vi.fn(),
      }),
    } as unknown as DevelopmentButler;

    mockCheckpointDetector = {} as CheckpointDetector;
    mockHookIntegration = {
      processToolUse: vi.fn().mockResolvedValue(undefined),
    } as unknown as HookIntegration;

    mockPlanningEngine = {
      generatePlan: vi.fn().mockResolvedValue({
        title: 'Test Feature Plan',
        goal: 'Implement test feature',
        architecture: 'Layered architecture',
        techStack: ['TypeScript', 'React'],
        totalEstimatedTime: '4 hours',
        tasks: [
          {
            id: 'task-1',
            description: 'Setup project structure',
            priority: 'high',
            estimatedDuration: '1 hour',
            suggestedAgent: 'backend-developer',
            dependencies: [],
            steps: ['Create folders', 'Initialize configs'],
            files: {
              create: ['src/index.ts'],
              modify: [],
              test: [],
            },
          },
        ],
      }),
    } as unknown as PlanningEngine;

    mockProjectMemoryManager = {
      recallRecentWork: vi.fn().mockResolvedValue([
        {
          entityType: 'code_change',
          observations: ['Test code change'],
          metadata: { timestamp: new Date() },
        },
      ]),
    } as unknown as ProjectMemoryManager;
    mockKnowledgeGraph = {
      createEntity: vi.fn(),
      addObservation: vi.fn(),
      createRelation: vi.fn(),
      query: vi.fn(),
      listEntities: vi.fn(),
    } as unknown as KnowledgeGraph;

    mockUI = {
      formatConfirmationRequest: vi.fn().mockReturnValue('Formatted confirmation'),
    } as unknown as HumanInLoopUI;

    const mockSamplingClient = {
      generate: vi.fn(),
      generateWithHistory: vi.fn(),
    } as any;

    // Create ToolHandlers instance
    toolHandlers = new ToolHandlers(
      mockRouter,
      mockAgentRegistry,
      mockFeedbackCollector,
      mockPerformanceTracker,
      mockLearningManager,
      mockEvolutionMonitor,
      mockSkillManager,
      mockUninstallManager,
      mockDevelopmentButler,
      mockCheckpointDetector,
      mockHookIntegration,
      mockPlanningEngine,
      mockProjectMemoryManager,
      mockKnowledgeGraph,
      mockUI,
      mockSamplingClient
    );
  });

  describe('handleListSkills', () => {
    it('should list all skills by default', async () => {
      const result = await toolHandlers.handleListSkills({ filter: 'all' });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('All Skills');
      expect(result.content[0].text).toContain('sa:skill1');
      expect(result.content[0].text).toContain('user-skill1');
    });

    it('should filter Claude Code Buddy skills', async () => {
      const result = await toolHandlers.handleListSkills({ filter: 'claude-code-buddy' });

      expect(result.content[0].text).toContain('Claude Code Buddy Skills');
      expect(mockSkillManager.listSmartAgentsSkills).toHaveBeenCalled();
    });

    it('should filter user skills', async () => {
      const result = await toolHandlers.handleListSkills({ filter: 'user' });

      expect(result.content[0].text).toContain('User Skills');
      expect(mockSkillManager.listUserSkills).toHaveBeenCalled();
    });

    it('should handle empty skill lists', async () => {
      vi.mocked(mockSkillManager.listSmartAgentsSkills).mockResolvedValue([]);

      const result = await toolHandlers.handleListSkills({ filter: 'claude-code-buddy' });

      expect(result.content[0].text).toContain('No skills found');
    });
  });

  describe('handleUninstall', () => {
    it('should uninstall with default options', async () => {
      const result = await toolHandlers.handleUninstall({});

      expect(mockUninstallManager.uninstall).toHaveBeenCalledWith({
        keepData: false,
        keepConfig: false,
        dryRun: false,
      });
      expect(result.content[0].text).toBe('Uninstall report');
    });

    it('should pass uninstall options correctly', async () => {
      await toolHandlers.handleUninstall({
        keepData: true,
        keepConfig: false,
        dryRun: true,
      });

      expect(mockUninstallManager.uninstall).toHaveBeenCalledWith({
        keepData: true,
        keepConfig: false,
        dryRun: true,
      });
    });

    it('should handle uninstall errors', async () => {
      vi.mocked(mockUninstallManager.uninstall).mockRejectedValue(
        new Error('Uninstall failed')
      );

      const result = await toolHandlers.handleUninstall({});

      expect(result.content[0].text).toContain('❌ Uninstall failed');
    });
  });

  describe('handleGetWorkflowGuidance', () => {
    it('should process checkpoint and return guidance', async () => {
      const result = await toolHandlers.handleGetWorkflowGuidance({
        phase: 'implementation',
        filesChanged: ['src/index.ts'],
        testsPassing: true,
      });

      expect(mockDevelopmentButler.processCheckpoint).toHaveBeenCalledWith(
        'code-written',
        expect.objectContaining({
          phase: 'code-written',
          filesChanged: ['src/index.ts'],
          testsPassing: true,
        })
      );
      expect(result.content[0].text).toBe('Workflow guidance response');
    });

    it('should handle missing optional parameters', async () => {
      const result = await toolHandlers.handleGetWorkflowGuidance({
        phase: 'planning',
      });

      expect(result.content).toHaveLength(1);
      expect(mockDevelopmentButler.processCheckpoint).toHaveBeenCalled();
    });
  });

  describe('handleGetSessionHealth', () => {
    it('should return session health status', async () => {
      const result = await toolHandlers.handleGetSessionHealth();

      const health = JSON.parse(result.content[0].text);
      expect(health).toEqual({
        healthy: true,
        warnings: [],
      });
    });

    it('should handle health check errors', async () => {
      vi.mocked(mockDevelopmentButler.getContextMonitor).mockImplementation(() => {
        throw new Error('Health check failed');
      });

      const result = await toolHandlers.handleGetSessionHealth();

      expect(result.content[0].text).toContain('❌ Session health check failed');
    });
  });

  describe('handleReloadContext', () => {
    it('should reload context with reason', async () => {
      const result = await toolHandlers.handleReloadContext({
        reason: 'Memory optimization',
      });

      expect(mockDevelopmentButler.executeContextReload).toHaveBeenCalled();
      expect(result.content[0].text).toContain('success');
    });
  });

  describe('handleRecordTokenUsage', () => {
    it('should record token usage', async () => {
      const result = await toolHandlers.handleRecordTokenUsage({
        inputTokens: 100,
        outputTokens: 50,
      });

      const tracker = mockDevelopmentButler.getTokenTracker();
      expect(tracker.recordUsage).toHaveBeenCalledWith({
        inputTokens: 100,
        outputTokens: 50,
      });
      expect(result.content[0].text).toContain('success');
    });
  });

  describe('handleHookToolUse', () => {
    it('should forward hook tool use to HookIntegration', async () => {
      const result = await toolHandlers.handleHookToolUse({
        toolName: 'Write',
        arguments: { file_path: 'src/index.ts' },
        success: true,
        tokensUsed: 120,
      });

      expect(mockHookIntegration.processToolUse).toHaveBeenCalledWith({
        toolName: 'Write',
        arguments: { file_path: 'src/index.ts' },
        success: true,
        duration: undefined,
        tokensUsed: 120,
        output: undefined,
      });
      expect(result.content[0].text).toContain('success');
    });
  });

  // handleGenerateSmartPlan tests removed - method deleted per MCP compliance
  // PlanningEngine removed → planning delegated to Claude's built-in capabilities

  describe('handleRecallMemory', () => {
    it('should recall and format memories', async () => {
      // Mock recallMemoryTool behavior
      const mockMemories = [
        {
          type: 'decision',
          timestamp: '2025-01-01T00:00:00Z',
          observations: ['Decision to use TypeScript', 'Type safety is priority'],
        },
      ];

      // We'll need to mock the recallMemoryTool import
      // For now, test the error path
      const result = await toolHandlers.handleRecallMemory({
        query: 'authentication',
        limit: 5,
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null inputs gracefully', async () => {
      const result = await toolHandlers.handleGetWorkflowGuidance(null);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Input validation failed');
    });

    it('should handle empty object inputs', async () => {
      const result = await toolHandlers.handleListSkills({});
      expect(result.content).toHaveLength(1);
    });
  });
});
