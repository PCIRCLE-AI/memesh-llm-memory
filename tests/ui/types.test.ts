/**
 * UI Types Test Suite
 *
 * Tests for Terminal UI type definitions
 */

import { describe, it, expect } from 'vitest';
import {
  UIEventType,
  ProgressIndicator,
  AgentStatus,
  SuccessEvent,
  ErrorEvent,
  AttributionEntry,
  MetricsSnapshot,
  DashboardState,
  DashboardConfig,
} from '../../src/ui/types.js';

describe('UI Types', () => {
  describe('UIEventType', () => {
    it('should have all required event types', () => {
      expect(UIEventType.PROGRESS).toBe('progress');
      expect(UIEventType.AGENT_START).toBe('agent_start');
      expect(UIEventType.AGENT_COMPLETE).toBe('agent_complete');
      expect(UIEventType.SUCCESS).toBe('success');
      expect(UIEventType.ERROR).toBe('error');
      expect(UIEventType.METRICS_UPDATE).toBe('metrics_update');
    });
  });

  describe('ProgressIndicator', () => {
    it('should create valid progress indicator', () => {
      const progress: ProgressIndicator = {
        agentId: 'test-agent-1',
        agentType: 'code-reviewer',
        taskDescription: 'Reviewing code',
        progress: 0.5,
        currentStage: 'analyzing',
        startTime: new Date(),
      };

      expect(progress.agentId).toBe('test-agent-1');
      expect(progress.progress).toBe(0.5);
      expect(progress.currentStage).toBe('analyzing');
    });

    it('should allow optional endTime', () => {
      const progress: ProgressIndicator = {
        agentId: 'test-agent-2',
        agentType: 'debugger',
        taskDescription: 'Debugging issue',
        progress: 1.0,
        currentStage: 'completed',
        startTime: new Date(),
        endTime: new Date(),
      };

      expect(progress.endTime).toBeDefined();
    });
  });

  describe('AgentStatus', () => {
    it('should create valid agent status', () => {
      const status: AgentStatus = {
        agentId: 'agent-1',
        agentType: 'frontend-developer',
        status: 'running',
        progress: 0.3,
        currentTask: 'Building component',
        startTime: new Date(),
      };

      expect(status.status).toBe('running');
      expect(status.progress).toBe(0.3);
    });
  });

  describe('SuccessEvent', () => {
    it('should create valid success event', () => {
      const success: SuccessEvent = {
        agentId: 'agent-1',
        agentType: 'test-automator',
        taskDescription: 'Running tests',
        result: { testsPass: true, coverage: 95 },
        duration: 5000,
        timestamp: new Date(),
      };

      expect(success.result.testsPass).toBe(true);
      expect(success.duration).toBe(5000);
    });
  });

  describe('ErrorEvent', () => {
    it('should create valid error event', () => {
      const error: ErrorEvent = {
        agentId: 'agent-2',
        agentType: 'backend-developer',
        taskDescription: 'API implementation',
        error: new Error('Database connection failed'),
        timestamp: new Date(),
      };

      expect(error.error).toBeInstanceOf(Error);
      expect(error.error.message).toBe('Database connection failed');
    });
  });

  describe('AttributionEntry', () => {
    it('should create valid attribution entry for success', () => {
      const entry: AttributionEntry = {
        type: 'success',
        agentType: 'code-reviewer',
        taskDescription: 'Code review completed',
        timestamp: new Date(),
        result: { issues: 0 },
      };

      expect(entry.type).toBe('success');
      expect(entry.result).toBeDefined();
    });

    it('should create valid attribution entry for error', () => {
      const entry: AttributionEntry = {
        type: 'error',
        agentType: 'deployment-engineer',
        taskDescription: 'Deployment failed',
        timestamp: new Date(),
        error: new Error('Connection timeout'),
      };

      expect(entry.type).toBe('error');
      expect(entry.error).toBeInstanceOf(Error);
    });
  });

  describe('MetricsSnapshot', () => {
    it('should create valid metrics snapshot', () => {
      const metrics: MetricsSnapshot = {
        sessionStart: new Date(),
        totalTasks: 10,
        completedTasks: 7,
        failedTasks: 1,
        agentUsageCount: {
          'code-reviewer': 3,
          'debugger': 2,
          'test-automator': 2,
        },
        estimatedTimeSaved: 3600,
        tokensUsed: 50000,
      };

      expect(metrics.totalTasks).toBe(10);
      expect(metrics.completedTasks).toBe(7);
      expect(metrics.agentUsageCount['code-reviewer']).toBe(3);
    });
  });

  describe('DashboardState', () => {
    it('should create valid dashboard state', () => {
      const state: DashboardState = {
        activeAgents: new Map([
          ['agent-1', {
            agentId: 'agent-1',
            agentType: 'frontend-developer',
            status: 'running',
            progress: 0.5,
            currentTask: 'Building UI',
            startTime: new Date(),
          }],
        ]),
        recentEvents: [],
        metrics: {
          sessionStart: new Date(),
          totalTasks: 5,
          completedTasks: 2,
          failedTasks: 0,
          agentUsageCount: { 'frontend-developer': 1 },
          estimatedTimeSaved: 1800,
          tokensUsed: 25000,
        },
      };

      expect(state.activeAgents.size).toBe(1);
      expect(state.metrics.totalTasks).toBe(5);
    });
  });

  describe('DashboardConfig', () => {
    it('should create valid dashboard config', () => {
      const config: DashboardConfig = {
        updateInterval: 100,
        maxRecentEvents: 10,
        showSpinner: true,
        showMetrics: true,
        showAttribution: true,
      };

      expect(config.updateInterval).toBe(100);
      expect(config.maxRecentEvents).toBe(10);
      expect(config.showSpinner).toBe(true);
    });

    it('should use default values when not specified', () => {
      const config: DashboardConfig = {
        updateInterval: 100,
        maxRecentEvents: 10,
      };

      // TypeScript should allow optional fields
      expect(config.updateInterval).toBe(100);
    });
  });
});
