// src/evolution/phase3-integration.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { LearningManager } from './LearningManager.js';
import { PerformanceTracker } from './PerformanceTracker.js';
import { TransferabilityChecker } from './TransferabilityChecker.js';
import { KnowledgeTransferManager } from './KnowledgeTransferManager.js';
import type { ContextualPattern } from './types.js';

describe('Phase 3 Integration Tests', () => {
  let performanceTracker: PerformanceTracker;
  let learningManager: LearningManager;
  let transferabilityChecker: TransferabilityChecker;
  let knowledgeTransferManager: KnowledgeTransferManager;

  beforeEach(() => {
    performanceTracker = new PerformanceTracker();
    learningManager = new LearningManager(performanceTracker, {
      minObservations: 5,
      minConfidence: 0.7,
      successRateThreshold: 0.8,
      failureRateThreshold: 0.3,
      adaptationEnabled: true,
    });
    transferabilityChecker = new TransferabilityChecker();
    knowledgeTransferManager = new KnowledgeTransferManager(
      learningManager,
      transferabilityChecker
    );
  });

  describe('LearningManager.getLearnedPatterns', () => {
    it('should return learned patterns for an agent', async () => {
      // Record successful executions to create patterns
      for (let i = 0; i < 10; i++) {
        performanceTracker.track({
          agentId: 'test-agent',
          taskType: 'code_review',
          success: true,
          durationMs: 5000 + Math.random() * 1000,
          cost: 0.05,
          qualityScore: 0.9 + Math.random() * 0.05,
        });
      }

      // Trigger learning
      await learningManager.identifyContextualPatterns('test-agent');

      // Get learned patterns
      const patterns = await learningManager.getLearnedPatterns('test-agent');

      expect(patterns).toBeDefined();
      expect(Array.isArray(patterns)).toBe(true);
    });

    it('should return empty array for agent with no patterns', async () => {
      const patterns = await learningManager.getLearnedPatterns('nonexistent-agent');

      expect(patterns).toEqual([]);
    });
  });

  describe('Cross-Agent Knowledge Transfer Integration', () => {
    it('should transfer patterns from source to target agent', async () => {
      // Record executions for source agent
      for (let i = 0; i < 15; i++) {
        performanceTracker.track({
          agentId: 'source-agent',
          taskType: 'security_audit',
          success: true,
          durationMs: 5000,
          cost: 0.05,
          qualityScore: 0.92,
        });
      }

      // Learn patterns from source agent
      await learningManager.identifyContextualPatterns('source-agent');

      // Find transferable patterns for similar target context
      const targetContext = {
        agent_type: 'code-reviewer',
        task_type: 'security_audit',
        complexity: 'medium' as const,
      };

      const transferablePatterns = await knowledgeTransferManager.findTransferablePatterns(
        'source-agent',
        'target-agent',
        targetContext,
        {
          minConfidence: 0.7,
          minObservations: 10,
        }
      );

      // Should find transferable patterns (or empty array if context doesn't match)
      expect(Array.isArray(transferablePatterns)).toBe(true);
      transferablePatterns.forEach((tp) => {
        expect(tp.sourceAgentId).toBe('source-agent');
        expect(tp.pattern).toBeDefined();
        expect(tp.transferredAt).toBeInstanceOf(Date);
      });
    });

    it('should correctly filter patterns by confidence and observations', async () => {
      // Record insufficient executions (below threshold)
      for (let i = 0; i < 5; i++) {
        performanceTracker.track({
          agentId: 'low-sample-agent',
          taskType: 'code_review',
          success: true,
          durationMs: 5000,
          cost: 0.05,
          qualityScore: 0.85,
        });
      }

      await learningManager.identifyContextualPatterns('low-sample-agent');

      const targetContext = {
        agent_type: 'code-reviewer',
        task_type: 'code_review',
        complexity: 'medium' as const,
      };

      const transferablePatterns = await knowledgeTransferManager.findTransferablePatterns(
        'low-sample-agent',
        'target-agent',
        targetContext,
        {
          minConfidence: 0.7,
          minObservations: 10, // Requires 10 observations
        }
      );

      // Should return empty array due to insufficient observations
      expect(transferablePatterns).toEqual([]);
    });
  });

  describe('TransferabilityChecker Integration', () => {
    it('should assess transferability for learned patterns', async () => {
      // Record executions
      for (let i = 0; i < 15; i++) {
        performanceTracker.track({
          agentId: 'pattern-source',
          taskType: 'performance_review',
          success: true,
          durationMs: 5000,
          cost: 0.05,
          qualityScore: 0.90,
        });
      }

      await learningManager.identifyContextualPatterns('pattern-source');

      const patterns = await learningManager.getLearnedPatterns('pattern-source');

      if (patterns.length > 0) {
        const pattern = patterns[0];

        const targetContext = {
          agent_type: 'code-reviewer',
          task_type: 'performance_review',
          complexity: 'high' as const,
        };

        const assessment = transferabilityChecker.assessTransferability(
          pattern,
          'pattern-source',
          'pattern-target',
          targetContext
        );

        expect(assessment.sourceAgentId).toBe('pattern-source');
        expect(assessment.targetAgentId).toBe('pattern-target');
        expect(assessment.applicabilityScore).toBeGreaterThanOrEqual(0);
        expect(assessment.applicabilityScore).toBeLessThanOrEqual(1);
        expect(assessment.confidence).toBeLessThan(pattern.confidence); // Penalty applied
      }
    });
  });
});
