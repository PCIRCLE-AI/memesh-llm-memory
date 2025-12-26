// src/evolution/types.test.ts
import { describe, it, expect } from 'vitest';
import type { PatternTransferability, TransferablePattern } from './types.js';

describe('Phase 3 Types', () => {
  describe('PatternTransferability', () => {
    it('should define transferability with all required fields', () => {
      const transferability: PatternTransferability = {
        sourceAgentId: 'agent-a',
        targetAgentId: 'agent-b',
        patternId: 'pattern-123',
        applicabilityScore: 0.85,
        contextSimilarity: 0.90,
        confidence: 0.80,
        reasoning: ['Similar task types', 'Compatible context'],
      };

      expect(transferability.applicabilityScore).toBeGreaterThan(0);
      expect(transferability.reasoning).toBeInstanceOf(Array);
    });
  });

  describe('TransferablePattern', () => {
    it('should wrap pattern with transfer metadata', () => {
      const transferablePattern: TransferablePattern = {
        pattern: {
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
        },
        sourceAgentId: 'agent-a',
        transferredAt: new Date('2025-12-27T12:00:00Z'),
        originalConfidence: 0.85,
        adaptedForContext: {
          agent_type: 'code-reviewer',
          task_type: 'performance_review',
        },
      };

      expect(transferablePattern.pattern.id).toBe('pattern-123');
      expect(transferablePattern.sourceAgentId).toBe('agent-a');
    });
  });
});
