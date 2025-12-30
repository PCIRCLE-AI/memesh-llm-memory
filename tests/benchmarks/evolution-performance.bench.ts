/**
 * Evolution System Performance Benchmark
 *
 * Measures performance of evolution system components:
 * - Task routing throughput
 * - Performance tracking overhead
 * - Pattern analysis speed
 * - Adaptation application latency
 * - Dashboard generation time
 *
 * Run: npx vitest bench tests/benchmarks/evolution-performance.bench.ts
 */

import { describe, bench, beforeEach } from 'vitest';
import { Router } from '../../src/orchestrator/router.js';
import { Task } from '../../src/orchestrator/types.js';
import { PerformanceTracker } from '../../src/evolution/PerformanceTracker.js';
import { LearningManager } from '../../src/evolution/LearningManager.js';
import { AdaptationEngine } from '../../src/evolution/AdaptationEngine.js';
import { EvolutionMonitor } from '../../src/evolution/EvolutionMonitor.js';

describe('Evolution System Performance Benchmarks', () => {
  let router: Router;
  let performanceTracker: PerformanceTracker;
  let learningManager: LearningManager;
  let adaptationEngine: AdaptationEngine;
  let monitor: EvolutionMonitor;

  beforeEach(() => {
    router = new Router();
    performanceTracker = router.getPerformanceTracker();
    learningManager = router.getLearningManager();
    adaptationEngine = router.getAdaptationEngine();
    monitor = new EvolutionMonitor(
      performanceTracker,
      learningManager,
      adaptationEngine
    );
  });

  describe('Task Routing Performance', () => {
    bench('single task routing', async () => {
      const task: Task = {
        id: `bench-task-${Date.now()}`,
        description: 'Review code quality',
        priority: 5,
      };

      await router.routeTask(task);
    });

    bench('batch task routing (10 tasks)', async () => {
      const tasks: Task[] = Array.from({ length: 10 }, (_, i) => ({
        id: `batch-task-${i}`,
        description: `Task ${i}`,
        priority: 5,
      }));

      await router.routeBatch(tasks);
    });

    bench('batch task routing (50 tasks)', async () => {
      const tasks: Task[] = Array.from({ length: 50 }, (_, i) => ({
        id: `batch-task-${i}`,
        description: `Task ${i}`,
        priority: 5,
      }));

      await router.routeBatch(tasks);
    });
  });

  describe('Performance Tracking Overhead', () => {
    bench('track single metric', () => {
      performanceTracker.track({
        agentId: 'code-reviewer',
        taskType: 'code-review',
        success: true,
        durationMs: 100,
        cost: 0.01,
        qualityScore: 0.9,
      });
    });

    bench('track 100 metrics', () => {
      for (let i = 0; i < 100; i++) {
        performanceTracker.track({
          agentId: 'code-reviewer',
          taskType: 'code-review',
          success: true,
          durationMs: 100 + i,
          cost: 0.01,
          qualityScore: 0.9,
        });
      }
    });

    bench('get evolution stats', () => {
      performanceTracker.getEvolutionStats('code-reviewer');
    });

    bench('get all metrics with filters', () => {
      performanceTracker.getMetrics({
        agentId: 'code-reviewer',
        taskType: 'code-review',
      });
    });
  });

  describe('Pattern Analysis Performance', () => {
    bench('analyze patterns (5 observations)', () => {
      // Add 5 observations
      for (let i = 0; i < 5; i++) {
        performanceTracker.track({
          agentId: 'pattern-agent',
          taskType: 'pattern-task',
          success: true,
          durationMs: 100,
          cost: 0.01,
          qualityScore: 0.9,
        });
      }

      learningManager.analyzePatterns('pattern-agent');
    });

    bench('get patterns for agent', () => {
      learningManager.getPatterns('code-reviewer');
    });

    bench('get recommendations', () => {
      learningManager.getRecommendations('code-reviewer', 'code-review');
    });
  });

  describe('Adaptation Application Performance', () => {
    bench('adapt execution (no patterns)', async () => {
      await adaptationEngine.adaptExecution('code-reviewer', 'code-review', {
        complexity: 5,
        estimatedTokens: 1000,
      });
    });

    bench('get agent config', () => {
      adaptationEngine.getAgentConfig('code-reviewer');
    });
  });

  describe('Dashboard Generation Performance', () => {
    bench('get dashboard summary', () => {
      monitor.getDashboardSummary();
    });

    bench('get learning progress (all 22 evolution configs)', () => {
      monitor.getLearningProgress();
    });

    bench('format dashboard', () => {
      monitor.formatDashboard();
    });

    bench('get agent stats', () => {
      monitor.getAgentStats('code-reviewer');
    });
  });

  describe('System Status Performance', () => {
    bench('get system status', async () => {
      await router.getSystemStatus();
    });

    bench('get cost tracker stats', () => {
      router.getCostTracker().getStats();
    });

    bench('generate cost report', () => {
      router.getCostTracker().generateReport();
    });
  });

  describe('Concurrent Operations', () => {
    bench('concurrent task routing (10 parallel)', async () => {
      const tasks: Task[] = Array.from({ length: 10 }, (_, i) => ({
        id: `concurrent-task-${i}`,
        description: `Concurrent task ${i}`,
        priority: 5,
      }));

      await Promise.all(tasks.map(task => router.routeTask(task)));
    });

    bench('concurrent performance tracking (100 parallel)', () => {
      const promises = Array.from({ length: 100 }, (_, i) =>
        Promise.resolve(
          performanceTracker.track({
            agentId: 'code-reviewer',
            taskType: 'code-review',
            success: true,
            durationMs: 100,
            cost: 0.01,
            qualityScore: 0.9,
          })
        )
      );

      return Promise.all(promises);
    });
  });

  describe('Memory Usage', () => {
    bench('track 1000 metrics (memory test)', () => {
      for (let i = 0; i < 1000; i++) {
        performanceTracker.track({
          agentId: 'code-reviewer',
          taskType: 'code-review',
          success: true,
          durationMs: 100,
          cost: 0.01,
          qualityScore: 0.9,
        });
      }
    });
  });
});

/**
 * Performance Targets (for reference):
 *
 * Task Routing:
 * - Single task: < 100ms
 * - Batch (10 tasks): < 500ms
 * - Batch (50 tasks): < 2000ms
 *
 * Performance Tracking:
 * - Single metric: < 1ms
 * - 100 metrics: < 10ms
 * - Get stats: < 5ms
 *
 * Pattern Analysis:
 * - Analyze patterns: < 50ms
 * - Get patterns: < 1ms
 * - Get recommendations: < 5ms
 *
 * Dashboard:
 * - Get summary: < 10ms
 * - Get progress: < 20ms
 * - Format dashboard: < 50ms
 *
 * Concurrent:
 * - 10 parallel tasks: < 500ms
 * - 100 parallel tracking: < 20ms
 *
 * Memory:
 * - 1000 metrics: < 100MB
 */
