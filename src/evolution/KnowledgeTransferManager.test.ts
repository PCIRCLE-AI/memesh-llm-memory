// src/evolution/KnowledgeTransferManager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { KnowledgeTransferManager } from './KnowledgeTransferManager.js';
import type { LearningManager } from './LearningManager.js';
import type { TransferabilityChecker } from './TransferabilityChecker.js';
import type { ContextualPattern, PatternContext } from './types.js';

describe('KnowledgeTransferManager', () => {
  let manager: KnowledgeTransferManager;
  let mockLearningManager: LearningManager;
  let mockTransferabilityChecker: TransferabilityChecker;

  beforeEach(() => {
    // Mock LearningManager
    mockLearningManager = {
      getLearnedPatterns: vi.fn(),
    } as unknown as LearningManager;

    // Mock TransferabilityChecker
    mockTransferabilityChecker = {
      assessTransferability: vi.fn(),
    } as unknown as TransferabilityChecker;

    manager = new KnowledgeTransferManager(
      mockLearningManager,
      mockTransferabilityChecker
    );
  });

  describe('findTransferablePatterns', () => {
    it('should filter patterns by minimum confidence and observations', async () => {
      const sourcePatterns: ContextualPattern[] = [
        {
          id: 'pattern-1',
          type: 'success',
          description: 'High confidence, many observations',
          confidence: 0.85,
          observations: 25,
          success_rate: 0.92,
          avg_execution_time: 5000,
          last_seen: '2025-12-27T10:00:00Z',
          context: {
            agent_type: 'code-reviewer',
            task_type: 'security_audit',
            complexity: 'medium',
          },
        },
        {
          id: 'pattern-2',
          type: 'success',
          description: 'Low confidence',
          confidence: 0.45,
          observations: 30,
          success_rate: 0.50,
          avg_execution_time: 6000,
          last_seen: '2025-12-27T10:00:00Z',
          context: {
            agent_type: 'code-reviewer',
            task_type: 'performance_review',
            complexity: 'low',
          },
        },
        {
          id: 'pattern-3',
          type: 'success',
          description: 'Few observations',
          confidence: 0.90,
          observations: 3,
          success_rate: 1.0,
          avg_execution_time: 4000,
          last_seen: '2025-12-27T10:00:00Z',
          context: {
            agent_type: 'code-reviewer',
            task_type: 'code_quality',
            complexity: 'high',
          },
        },
      ];

      vi.mocked(mockLearningManager.getLearnedPatterns).mockResolvedValue(
        sourcePatterns
      );

      // Mock assessment return value
      vi.mocked(mockTransferabilityChecker.assessTransferability).mockReturnValue({
        sourceAgentId: 'agent-a',
        targetAgentId: 'agent-b',
        patternId: 'pattern-1',
        applicabilityScore: 0.80,
        contextSimilarity: 0.80,
        confidence: 0.765,
        reasoning: ['High context similarity'],
      });

      const targetContext: PatternContext = {
        agent_type: 'code-reviewer',
        task_type: 'security_audit',
        complexity: 'high',
      };

      const results = await manager.findTransferablePatterns(
        'agent-a',
        'agent-b',
        targetContext,
        { minConfidence: 0.70, minObservations: 10 }
      );

      // Should only consider pattern-1 (confidence >= 0.70 AND observations >= 10)
      expect(mockLearningManager.getLearnedPatterns).toHaveBeenCalledWith('agent-a');
      expect(mockTransferabilityChecker.assessTransferability).toHaveBeenCalledTimes(1);
      expect(mockTransferabilityChecker.assessTransferability).toHaveBeenCalledWith(
        sourcePatterns[0],
        'agent-a',
        'agent-b',
        targetContext
      );
    });

    it('should return only highly applicable patterns', async () => {
      const sourcePatterns: ContextualPattern[] = [
        {
          id: 'pattern-high',
          type: 'success',
          description: 'Highly applicable',
          confidence: 0.85,
          observations: 25,
          success_rate: 0.92,
          avg_execution_time: 5000,
          last_seen: '2025-12-27T10:00:00Z',
          context: {
            agent_type: 'code-reviewer',
            task_type: 'security_audit',
            complexity: 'medium',
          },
        },
        {
          id: 'pattern-low',
          type: 'success',
          description: 'Low applicability',
          confidence: 0.80,
          observations: 20,
          success_rate: 0.85,
          avg_execution_time: 6000,
          last_seen: '2025-12-27T10:00:00Z',
          context: {
            agent_type: 'data-analyst',
            task_type: 'sql_query',
            complexity: 'low',
          },
        },
      ];

      vi.mocked(mockLearningManager.getLearnedPatterns).mockResolvedValue(
        sourcePatterns
      );

      // Mock high applicability for first pattern
      vi.mocked(mockTransferabilityChecker.assessTransferability)
        .mockReturnValueOnce({
          sourceAgentId: 'agent-a',
          targetAgentId: 'agent-b',
          patternId: 'pattern-high',
          applicabilityScore: 0.85,
          contextSimilarity: 0.85,
          confidence: 0.765,
          reasoning: ['High context similarity'],
        })
        // Mock low applicability for second pattern
        .mockReturnValueOnce({
          sourceAgentId: 'agent-a',
          targetAgentId: 'agent-b',
          patternId: 'pattern-low',
          applicabilityScore: 0.30,
          contextSimilarity: 0.30,
          confidence: 0.72,
          reasoning: ['Low context similarity'],
        });

      const targetContext: PatternContext = {
        agent_type: 'code-reviewer',
        task_type: 'security_audit',
        complexity: 'high',
      };

      const results = await manager.findTransferablePatterns(
        'agent-a',
        'agent-b',
        targetContext,
        { minConfidence: 0.70, minObservations: 10 }
      );

      // Should only return pattern with applicabilityScore >= 0.7
      expect(results).toHaveLength(1);
      expect(results[0].pattern.id).toBe('pattern-high');
      expect(results[0].sourceAgentId).toBe('agent-a');
      expect(results[0].originalConfidence).toBe(0.85);
      expect(results[0].transferredAt).toBeInstanceOf(Date);
    });

    it('should return empty array when no patterns meet criteria', async () => {
      vi.mocked(mockLearningManager.getLearnedPatterns).mockResolvedValue([]);

      const targetContext: PatternContext = {
        agent_type: 'code-reviewer',
        task_type: 'security_audit',
        complexity: 'medium',
      };

      const results = await manager.findTransferablePatterns(
        'agent-a',
        'agent-b',
        targetContext
      );

      expect(results).toEqual([]);
    });

    it('should use default thresholds when not provided', async () => {
      const sourcePatterns: ContextualPattern[] = [
        {
          id: 'pattern-1',
          type: 'success',
          description: 'Test pattern',
          confidence: 0.60,
          observations: 8,
          success_rate: 0.80,
          avg_execution_time: 5000,
          last_seen: '2025-12-27T10:00:00Z',
          context: {
            agent_type: 'code-reviewer',
            task_type: 'security_audit',
            complexity: 'medium',
          },
        },
      ];

      vi.mocked(mockLearningManager.getLearnedPatterns).mockResolvedValue(
        sourcePatterns
      );

      const targetContext: PatternContext = {
        agent_type: 'code-reviewer',
        task_type: 'security_audit',
        complexity: 'medium',
      };

      await manager.findTransferablePatterns('agent-a', 'agent-b', targetContext);

      // Default: minConfidence=0.7, minObservations=10
      // Pattern has confidence=0.60 < 0.7, so should be filtered out
      expect(mockTransferabilityChecker.assessTransferability).not.toHaveBeenCalled();
    });
  });
});
