/**
 * ProgressRenderer Test Suite
 *
 * Tests for the ProgressRenderer terminal rendering component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ProgressRenderer } from '../../src/ui/ProgressRenderer.js';
import { DashboardState, DashboardConfig } from '../../src/ui/types.js';

describe('ProgressRenderer', () => {
  let renderer: ProgressRenderer;
  const defaultConfig: DashboardConfig = {
    updateInterval: 100,
    maxRecentEvents: 10,
    showSpinner: true,
    showMetrics: true,
    showAttribution: true,
  };

  beforeEach(() => {
    renderer = new ProgressRenderer(defaultConfig);
  });

  afterEach(() => {
    if (renderer) {
      renderer.stop();
    }
  });

  describe('Initialization', () => {
    it('should create renderer with default config', () => {
      expect(renderer).toBeDefined();
    });

    it('should not be running initially', () => {
      expect(renderer.isRunning()).toBe(false);
    });
  });

  describe('Lifecycle', () => {
    it('should start rendering with callback', () => {
      const getState = vi.fn().mockReturnValue({
        activeAgents: new Map(),
        recentEvents: [],
        metrics: {
          sessionStart: new Date(),
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          agentUsageCount: {},
          estimatedTimeSaved: 0,
          tokensUsed: 0,
        },
      });

      renderer.start(getState);
      expect(renderer.isRunning()).toBe(true);
      expect(getState).toHaveBeenCalled();

      renderer.stop();
      expect(renderer.isRunning()).toBe(false);
    });

    it('should stop rendering and clear interval', (done) => {
      const getState = vi.fn().mockReturnValue({
        activeAgents: new Map(),
        recentEvents: [],
        metrics: {
          sessionStart: new Date(),
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          agentUsageCount: {},
          estimatedTimeSaved: 0,
          tokensUsed: 0,
        },
      });

      renderer.start(getState);
      expect(renderer.isRunning()).toBe(true);

      setTimeout(() => {
        renderer.stop();
        expect(renderer.isRunning()).toBe(false);
        done();
      }, 50);
    });
  });

  describe('Throttling', () => {
    it('should throttle render calls to minimum interval', (done) => {
      const getState = vi.fn().mockReturnValue({
        activeAgents: new Map(),
        recentEvents: [],
        metrics: {
          sessionStart: new Date(),
          totalTasks: 0,
          completedTasks: 0,
          failedTasks: 0,
          agentUsageCount: {},
          estimatedTimeSaved: 0,
          tokensUsed: 0,
        },
      });

      renderer.start(getState);

      // Wait for some updates
      setTimeout(() => {
        const callCount = getState.mock.calls.length;
        renderer.stop();

        // Should not call too frequently (100ms interval + 100ms throttle = ~200ms per call minimum)
        // In 250ms, should have ~1-2 calls, not 25 calls
        expect(callCount).toBeLessThan(5);
        expect(callCount).toBeGreaterThan(0);
        done();
      }, 250);
    });
  });

  describe('Rendering', () => {
    it('should render dashboard with active agents', () => {
      const state: DashboardState = {
        activeAgents: new Map([
          [
            'agent-1',
            {
              agentId: 'agent-1',
              agentType: 'code-reviewer',
              status: 'running',
              progress: 0.5,
              currentTask: 'Reviewing code',
              startTime: new Date(),
            },
          ],
        ]),
        recentEvents: [],
        metrics: {
          sessionStart: new Date(),
          totalTasks: 10,
          completedTasks: 5,
          failedTasks: 1,
          agentUsageCount: { 'code-reviewer': 3 },
          estimatedTimeSaved: 1800,
          tokensUsed: 25000,
        },
      };

      const output = renderer['renderDashboard'](state);

      expect(output).toContain('code-reviewer');
      expect(output).toContain('Reviewing code');
      expect(output).toContain('50%');
    });

    it('should render metrics section', () => {
      const state: DashboardState = {
        activeAgents: new Map(),
        recentEvents: [],
        metrics: {
          sessionStart: new Date(),
          totalTasks: 10,
          completedTasks: 7,
          failedTasks: 2,
          agentUsageCount: { 'debugger': 2, 'test-automator': 1 },
          estimatedTimeSaved: 3600,
          tokensUsed: 50000,
        },
      };

      const output = renderer['renderDashboard'](state);

      expect(output).toContain('Tasks');
      expect(output).toContain('7/10');
      expect(output).toContain('Time Saved');
      expect(output).toContain('1h');
    });
  });

  describe('Configuration', () => {
    it('should respect showMetrics config', () => {
      const configWithoutMetrics: DashboardConfig = {
        ...defaultConfig,
        showMetrics: false,
      };
      const rendererNoMetrics = new ProgressRenderer(configWithoutMetrics);

      const state: DashboardState = {
        activeAgents: new Map(),
        recentEvents: [],
        metrics: {
          sessionStart: new Date(),
          totalTasks: 10,
          completedTasks: 5,
          failedTasks: 0,
          agentUsageCount: {},
          estimatedTimeSaved: 0,
          tokensUsed: 0,
        },
      };

      const output = rendererNoMetrics['renderDashboard'](state);

      // Should not contain metrics section
      expect(output).not.toContain('Time Saved');

      rendererNoMetrics.stop();
    });
  });
});
