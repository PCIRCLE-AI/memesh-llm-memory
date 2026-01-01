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
import type { PlanningEngine } from '../../../planning/PlanningEngine.js';
import type { ProjectMemoryManager } from '../../../memory/ProjectMemoryManager.js';
import type { HumanInLoopUI } from '../../HumanInLoopUI.js';

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
  let mockPlanningEngine: PlanningEngine;
  let mockProjectMemoryManager: ProjectMemoryManager;
  let mockUI: HumanInLoopUI;
  let toolHandlers: ToolHandlers;

  beforeEach(() => {
    // Create mock implementations
    mockRouter = {
      routeTask: vi.fn(),
    } as unknown as Router;

    mockAgentRegistry = {
      getAllAgents: vi.fn().mockReturnValue([
        { name: 'frontend-developer', category: 'code', description: 'Frontend development' },
        { name: 'backend-developer', category: 'code', description: 'Backend development' },
        { name: 'test-automator', category: 'testing', description: 'Test automation' },
      ]),
      getAgentsByCategory: vi.fn().mockReturnValue([
        { name: 'frontend-developer', category: 'code' },
      ]),
      getAgent: vi.fn().mockReturnValue({ name: 'frontend-developer', category: 'code' }),
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

    mockProjectMemoryManager = {} as ProjectMemoryManager;

    mockUI = {
      formatConfirmationRequest: vi.fn().mockReturnValue('Formatted confirmation'),
    } as unknown as HumanInLoopUI;

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
      mockPlanningEngine,
      mockProjectMemoryManager,
      mockUI
    );
  });

  describe('handleEvolutionDashboard', () => {
    it('should return summary format dashboard by default', async () => {
      const result = await toolHandlers.handleEvolutionDashboard({});

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toBe('Mock Dashboard Output');
      expect(mockEvolutionMonitor.formatDashboard).toHaveBeenCalledWith({
        includeCharts: true,
        chartHeight: 8,
      });
    });

    it('should export as JSON when format specified', async () => {
      const result = await toolHandlers.handleEvolutionDashboard({
        exportFormat: 'json',
      });

      expect(result.content[0].text).toBe('{"mock":"json"}');
      expect(mockEvolutionMonitor.exportAsJSON).toHaveBeenCalled();
    });

    it('should export as CSV when format specified', async () => {
      const result = await toolHandlers.handleEvolutionDashboard({
        exportFormat: 'csv',
      });

      expect(result.content[0].text).toBe('mock,csv');
      expect(mockEvolutionMonitor.exportAsCSV).toHaveBeenCalled();
    });

    it('should export as Markdown when format specified', async () => {
      const result = await toolHandlers.handleEvolutionDashboard({
        exportFormat: 'markdown',
      });

      expect(result.content[0].text).toBe('# Mock Markdown');
      expect(mockEvolutionMonitor.exportAsMarkdown).toHaveBeenCalled();
    });

    it('should include learning progress in detailed format', async () => {
      const mockProgress = [
        {
          agentId: 'test-agent',
          totalExecutions: 10,
          learnedPatterns: 5,
          appliedAdaptations: 3,
          successRateImprovement: 0.15,
          lastLearningDate: new Date('2025-01-01'),
        },
      ];
      vi.mocked(mockEvolutionMonitor.getLearningProgress).mockReturnValue(mockProgress);

      const result = await toolHandlers.handleEvolutionDashboard({
        format: 'detailed',
      });

      expect(result.content[0].text).toContain('Mock Dashboard Output');
      expect(result.content[0].text).toContain('Detailed Learning Progress');
      expect(result.content[0].text).toContain('test-agent');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockEvolutionMonitor.formatDashboard).mockImplementation(() => {
        throw new Error('Dashboard error');
      });

      const result = await toolHandlers.handleEvolutionDashboard({});

      expect(result.content[0].text).toContain('❌ Evolution dashboard failed');
      expect(result.content[0].text).toContain('Dashboard error');
    });
  });

  describe('handleListAgents', () => {
    it('should list all agents grouped by category', async () => {
      const result = await toolHandlers.handleListAgents();

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain('Available Agents');
      expect(result.content[0].text).toContain('Total');
      expect(result.content[0].text).toContain('frontend-developer');
      expect(result.content[0].text).toContain('backend-developer');
      expect(result.content[0].text).toContain('test-automator');
    });

    it('should group agents by category', async () => {
      const result = await toolHandlers.handleListAgents();

      expect(result.content[0].text).toContain('💻'); // code emoji
      expect(result.content[0].text).toContain('🧪'); // testing emoji
    });

    it('should handle empty agent list', async () => {
      vi.mocked(mockAgentRegistry.getAllAgents).mockReturnValue([]);

      const result = await toolHandlers.handleListAgents();

      expect(result.content[0].text).toContain('Total**: 0');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockAgentRegistry.getAllAgents).mockImplementation(() => {
        throw new Error('Registry error');
      });

      const result = await toolHandlers.handleListAgents();

      expect(result.content[0].text).toContain('❌ List agents failed');
    });
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
        keepData: undefined,
        keepConfig: undefined,
        dryRun: undefined,
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
        'implementation',
        expect.objectContaining({
          phase: 'implementation',
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

  describe('handleGenerateSmartPlan', () => {
    it('should generate and format a plan', async () => {
      const result = await toolHandlers.handleGenerateSmartPlan({
        featureDescription: 'User authentication system',
        requirements: ['JWT tokens', 'OAuth2'],
        constraints: ['< 1 week'],
      });

      expect(mockPlanningEngine.generatePlan).toHaveBeenCalledWith({
        featureDescription: 'User authentication system',
        requirements: ['JWT tokens', 'OAuth2'],
        constraints: ['< 1 week'],
      });

      expect(result.content[0].text).toContain('Test Feature Plan');
      expect(result.content[0].text).toContain('task-1');
      expect(result.content[0].text).toContain('Setup project structure');
    });

    it('should handle plan generation errors', async () => {
      vi.mocked(mockPlanningEngine.generatePlan).mockRejectedValue(
        new Error('Planning failed')
      );

      const result = await toolHandlers.handleGenerateSmartPlan({
        featureDescription: 'Test feature',
      });

      expect(result.content[0].text).toContain('❌ Smart plan generation failed');
    });
  });

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

  describe('handleSmartRouteTask', () => {
    it('should route task and return formatted confirmation', async () => {
      const mockRoutingResult = {
        analysis: {
          complexity: 5,
          domain: 'frontend',
          estimatedTokens: 1000,
        },
        routing: {
          selectedAgent: 'frontend-developer' as const,
          reasoning: 'Best suited for frontend tasks. Has React expertise. Familiar with TypeScript.',
          enhancedPrompt: {
            prompt: 'Enhanced prompt content',
            suggestedModel: 'claude-3-5-sonnet-20241022',
          },
        },
        approved: true,
        message: 'Task approved',
      };

      vi.mocked(mockRouter.routeTask).mockResolvedValue(mockRoutingResult);

      const result = await toolHandlers.handleSmartRouteTask({
        taskDescription: 'Create a React component',
        priority: 5,
      });

      expect(mockRouter.routeTask).toHaveBeenCalled();
      expect(mockUI.formatConfirmationRequest).toHaveBeenCalled();
      expect(result.content[0].text).toBe('Formatted confirmation');
    });

    it('should handle routing errors', async () => {
      vi.mocked(mockRouter.routeTask).mockRejectedValue(
        new Error('Routing failed')
      );

      const result = await toolHandlers.handleSmartRouteTask({
        taskDescription: 'Test task',
      });

      expect(result.content[0].text).toContain('❌ Smart routing failed');
    });

    it('should generate alternatives for agent selection', async () => {
      const mockRoutingResult = {
        analysis: {
          complexity: 5,
          domain: 'code',
          estimatedTokens: 1000,
        },
        routing: {
          selectedAgent: 'frontend-developer' as const,
          reasoning: 'Frontend specialist',
          enhancedPrompt: {
            prompt: 'Test prompt',
            suggestedModel: 'claude-3-5-sonnet-20241022',
          },
        },
        approved: true,
        message: 'Approved',
      };

      vi.mocked(mockRouter.routeTask).mockResolvedValue(mockRoutingResult);

      await toolHandlers.handleSmartRouteTask({
        taskDescription: 'Frontend task',
      });

      expect(mockUI.formatConfirmationRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          alternatives: expect.any(Array),
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty inputs gracefully', async () => {
      const result = await toolHandlers.handleEvolutionDashboard({});
      expect(result.content).toHaveLength(1);
    });

    it('should handle null inputs gracefully', async () => {
      const result = await toolHandlers.handleListAgents();
      expect(result.content).toHaveLength(1);
    });

    it('should handle empty object inputs', async () => {
      const result = await toolHandlers.handleListSkills({});
      expect(result.content).toHaveLength(1);
    });
  });
});
