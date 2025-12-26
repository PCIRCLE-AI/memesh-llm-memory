// src/evolution/TransferabilityChecker.test.ts
import { describe, it, expect } from 'vitest';
import { TransferabilityChecker } from './TransferabilityChecker.js';
import type { ContextualPattern, PatternContext } from './types.js';

describe('TransferabilityChecker', () => {
  const checker = new TransferabilityChecker();

  describe('calculateContextSimilarity', () => {
    it('should return 1.0 for identical contexts', () => {
      const context1: PatternContext = {
        agent_type: 'code-reviewer',
        task_type: 'security_audit',
        complexity: 'medium',
        config_keys: ['timeout', 'retry_limit'],
      };

      const context2: PatternContext = {
        agent_type: 'code-reviewer',
        task_type: 'security_audit',
        complexity: 'medium',
        config_keys: ['timeout', 'retry_limit'],
      };

      const similarity = checker.calculateContextSimilarity(context1, context2);
      expect(similarity).toBeCloseTo(1.0, 5); // Use toBeCloseTo for floating point
    });

    it('should return 0.0 for completely different contexts', () => {
      const context1: PatternContext = {
        agent_type: 'code-reviewer',
        task_type: 'security_audit',
        complexity: 'high',
        config_keys: ['timeout'],
      };

      const context2: PatternContext = {
        agent_type: 'data-analyst',
        task_type: 'sql_query',
        complexity: 'low',
        config_keys: ['cache_ttl'],
      };

      const similarity = checker.calculateContextSimilarity(context1, context2);
      expect(similarity).toBe(0.0);
    });

    it('should handle partial similarity correctly', () => {
      const context1: PatternContext = {
        agent_type: 'code-reviewer',
        task_type: 'security_audit',
        complexity: 'medium',
        config_keys: ['timeout', 'retry_limit'],
      };

      const context2: PatternContext = {
        agent_type: 'code-reviewer',
        task_type: 'performance_review',
        complexity: 'medium',
        config_keys: ['timeout'],
      };

      const similarity = checker.calculateContextSimilarity(context1, context2);

      // agent_type match: 40%
      // task_type mismatch: 0%
      // complexity match: 20%
      // config_keys Jaccard(2,1,1): 1/(2+1-1) = 0.5, weighted 10% = 5%
      // Total: 40 + 0 + 20 + 5 = 65%
      expect(similarity).toBeCloseTo(0.65, 2);
    });

    it('should weight agent_type changes more heavily than task_type', () => {
      const baseContext: PatternContext = {
        agent_type: 'code-reviewer',
        task_type: 'security_audit',
        complexity: 'medium',
      };

      const agentChanged: PatternContext = {
        agent_type: 'data-analyst',
        task_type: 'security_audit',
        complexity: 'medium',
      };

      const taskChanged: PatternContext = {
        agent_type: 'code-reviewer',
        task_type: 'performance_review',
        complexity: 'medium',
      };

      const agentSimilarity = checker.calculateContextSimilarity(baseContext, agentChanged);
      const taskSimilarity = checker.calculateContextSimilarity(baseContext, taskChanged);

      // Agent change loses 40% weight, task change loses 30% weight
      expect(agentSimilarity).toBeLessThan(taskSimilarity);
      // agentChanged: task match (30%) + complexity match (20%) = 50%
      expect(agentSimilarity).toBeCloseTo(0.50, 2);
      // taskChanged: agent match (40%) + complexity match (20%) = 60%
      expect(taskSimilarity).toBeCloseTo(0.60, 2);
    });
  });

  describe('assessTransferability', () => {
    const sourcePattern: ContextualPattern = {
      id: 'pattern-123',
      type: 'success',
      description: 'High quality code review',
      confidence: 0.85,
      observations: 20,
      success_rate: 0.92,
      avg_execution_time: 5000,
      last_seen: '2025-12-27T10:00:00Z',
      context: {
        agent_type: 'code-reviewer',
        task_type: 'security_audit',
        complexity: 'medium',
      },
    };

    it('should recommend transfer for highly similar contexts', () => {
      const targetContext: PatternContext = {
        agent_type: 'code-reviewer',
        task_type: 'security_audit',
        complexity: 'high', // Only complexity differs
      };

      const result = checker.assessTransferability(
        sourcePattern,
        'agent-a',
        'agent-b',
        targetContext
      );

      // agent match (40%) + task match (30%) = 70%
      expect(result.applicabilityScore).toBeCloseTo(0.70, 2);
      expect(result.contextSimilarity).toBeCloseTo(0.70, 2);
      expect(result.confidence).toBeCloseTo(0.765, 3); // 0.85 * 0.9
      expect(result.reasoning[0]).toContain('Moderate context similarity');
    });

    it('should reject transfer for incompatible contexts', () => {
      const targetContext: PatternContext = {
        agent_type: 'data-analyst',
        task_type: 'sql_query',
        complexity: 'low',
      };

      const result = checker.assessTransferability(
        sourcePattern,
        'agent-a',
        'agent-b',
        targetContext
      );

      expect(result.applicabilityScore).toBeLessThan(0.3);
      expect(result.contextSimilarity).toBeLessThan(0.3);
      expect(result.reasoning[0]).toContain('Very low context similarity');
    });

    it('should apply confidence penalty for transferred patterns', () => {
      const targetContext: PatternContext = {
        agent_type: 'code-reviewer',
        task_type: 'security_audit',
        complexity: 'medium',
      };

      const result = checker.assessTransferability(
        sourcePattern,
        'agent-a',
        'agent-b',
        targetContext
      );

      // Original confidence: 0.85
      // After 10% penalty: 0.85 * 0.9 = 0.765
      expect(result.confidence).toBeCloseTo(0.765, 3);
    });
  });
});
