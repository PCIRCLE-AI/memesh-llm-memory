/**
 * FeedbackCollector Test
 *
 * Tests for feedback collection from routing and task completion
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedbackCollector } from '../../src/evolution/FeedbackCollector.js';
import { LearningManager } from '../../src/evolution/LearningManager.js';
import { PerformanceTracker } from '../../src/evolution/PerformanceTracker.js';

describe('FeedbackCollector', () => {
  let collector: FeedbackCollector;
  let mockLearningManager: LearningManager;

  beforeEach(() => {
    const performanceTracker = new PerformanceTracker();
    mockLearningManager = new LearningManager(performanceTracker);
    collector = new FeedbackCollector(mockLearningManager);
  });

  describe('recordRoutingApproval', () => {
    it('should record accepted recommendation', () => {
      const feedback = collector.recordRoutingApproval({
        taskId: 'task-1',
        recommendedAgent: 'code-reviewer',
        selectedAgent: 'code-reviewer',
        wasOverridden: false,
        confidence: 0.85,
      });

      expect(feedback.type).toBe('positive');
      expect(feedback.rating).toBe(5);
      expect(feedback.agentId).toBe('code-reviewer');
      expect(feedback.feedback).toContain('approved');
    });

    it('should record overridden recommendation', () => {
      const feedback = collector.recordRoutingApproval({
        taskId: 'task-2',
        recommendedAgent: 'code-reviewer',
        selectedAgent: 'security-auditor',
        wasOverridden: true,
        confidence: 0.75,
      });

      expect(feedback.type).toBe('negative');
      expect(feedback.rating).toBe(2);
      expect(feedback.agentId).toBe('code-reviewer');
      expect(feedback.feedback).toContain('overrode');
      expect(feedback.suggestions).toBeDefined();
      expect(feedback.suggestions!.length).toBeGreaterThan(0);
    });

    it('should include confidence in feedback', () => {
      const feedback = collector.recordRoutingApproval({
        taskId: 'task-3',
        recommendedAgent: 'debugger',
        selectedAgent: 'debugger',
        wasOverridden: false,
        confidence: 0.92,
      });

      expect(feedback.feedback).toContain('92%');
    });
  });

  describe('recordTaskCompletion', () => {
    it('should record successful task completion', () => {
      const feedback = collector.recordTaskCompletion({
        taskId: 'task-4',
        agentId: 'test-writer',
        success: true,
        qualityScore: 0.95,
        durationMs: 2000,
        userRating: 5,
        userComment: 'Excellent work',
      });

      expect(feedback.type).toBe('positive');
      expect(feedback.rating).toBe(5);
      expect(feedback.agentId).toBe('test-writer');
      expect(feedback.feedback).toContain('Excellent work');
    });

    it('should record failed task completion', () => {
      const feedback = collector.recordTaskCompletion({
        taskId: 'task-5',
        agentId: 'refactorer',
        success: false,
        qualityScore: 0.3,
        durationMs: 5000,
      });

      expect(feedback.type).toBe('negative');
      expect(feedback.rating).toBe(1);
      expect(feedback.issues).toBeDefined();
      expect(feedback.issues!).toContain('Task failed');
    });

    it('should infer rating from quality score', () => {
      const feedback = collector.recordTaskCompletion({
        taskId: 'task-6',
        agentId: 'api-designer',
        success: true,
        qualityScore: 0.85,
        durationMs: 3000,
      });

      expect(feedback.rating).toBe(4); // 0.8-0.9 = 4 stars
    });

    it('should flag low quality score', () => {
      const feedback = collector.recordTaskCompletion({
        taskId: 'task-7',
        agentId: 'db-optimizer',
        success: true,
        qualityScore: 0.55,
        durationMs: 4000,
      });

      expect(feedback.issues).toBeDefined();
      expect(feedback.issues!.some(i => i.includes('quality score'))).toBe(true);
    });

    it('should flag slow execution', () => {
      const feedback = collector.recordTaskCompletion({
        taskId: 'task-8',
        agentId: 'frontend-specialist',
        success: true,
        qualityScore: 0.9,
        durationMs: 35000, // > 30s
      });

      expect(feedback.issues).toBeDefined();
      expect(feedback.issues!.some(i => i.includes('Slow execution'))).toBe(true);
    });
  });
});
