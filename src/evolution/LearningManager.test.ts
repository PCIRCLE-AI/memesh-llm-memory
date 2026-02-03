/**
 * LearningManager - Validation Tests
 *
 * Tests for NaN/Infinity validation in config and filter parameters
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LearningManager } from './LearningManager.js';
import type { LearnedPattern } from './types.js';

describe('LearningManager - Validation', () => {
  describe('constructor config validation', () => {
    it('should accept valid config', () => {
      const manager = new LearningManager({ maxPatternsPerAgent: 50 });
      expect(manager).toBeDefined();
    });

    it('should reject NaN maxPatternsPerAgent', () => {
      expect(() => {
        new LearningManager({ maxPatternsPerAgent: NaN });
      }).toThrow('maxPatternsPerAgent must be finite');
    });

    it('should reject Infinity maxPatternsPerAgent', () => {
      expect(() => {
        new LearningManager({ maxPatternsPerAgent: Infinity });
      }).toThrow('maxPatternsPerAgent must be finite');
    });

    it('should reject negative Infinity maxPatternsPerAgent', () => {
      expect(() => {
        new LearningManager({ maxPatternsPerAgent: -Infinity });
      }).toThrow('maxPatternsPerAgent must be finite');
    });

    it('should reject non-integer maxPatternsPerAgent', () => {
      expect(() => {
        new LearningManager({ maxPatternsPerAgent: 50.5 });
      }).toThrow('maxPatternsPerAgent must be a positive integer');
    });

    it('should reject negative maxPatternsPerAgent', () => {
      expect(() => {
        new LearningManager({ maxPatternsPerAgent: -10 });
      }).toThrow('maxPatternsPerAgent must be a positive integer');
    });

    it('should reject zero maxPatternsPerAgent', () => {
      expect(() => {
        new LearningManager({ maxPatternsPerAgent: 0 });
      }).toThrow('maxPatternsPerAgent must be a positive integer');
    });
  });

  describe('getPatterns minConfidence validation', () => {
    let manager: LearningManager;

    beforeEach(() => {
      manager = new LearningManager();

      // Add test patterns
      const pattern: LearnedPattern = {
        id: 'pattern-1',
        agentId: 'agent-1',
        taskType: 'test',
        type: 'success',
        condition: 'test condition',
        action: 'test action',
        outcome: 'test outcome',
        confidence: 0.8,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      manager.addPattern(pattern);
    });

    it('should accept valid minConfidence', () => {
      const patterns = manager.getPatterns('agent-1', { minConfidence: 0.5 });
      expect(patterns).toHaveLength(1);
    });

    it('should reject NaN minConfidence', () => {
      expect(() => {
        manager.getPatterns('agent-1', { minConfidence: NaN });
      }).toThrow('minConfidence must be finite');
    });

    it('should reject Infinity minConfidence', () => {
      expect(() => {
        manager.getPatterns('agent-1', { minConfidence: Infinity });
      }).toThrow('minConfidence must be finite');
    });

    it('should reject negative Infinity minConfidence', () => {
      expect(() => {
        manager.getPatterns('agent-1', { minConfidence: -Infinity });
      }).toThrow('minConfidence must be finite');
    });

    it('should reject negative minConfidence', () => {
      expect(() => {
        manager.getPatterns('agent-1', { minConfidence: -0.5 });
      }).toThrow('minConfidence must be between 0 and 1');
    });

    it('should reject minConfidence > 1', () => {
      expect(() => {
        manager.getPatterns('agent-1', { minConfidence: 1.5 });
      }).toThrow('minConfidence must be between 0 and 1');
    });

    it('should handle minConfidence = 0', () => {
      const patterns = manager.getPatterns('agent-1', { minConfidence: 0 });
      expect(patterns).toHaveLength(1);
    });

    it('should handle minConfidence = 1', () => {
      const patterns = manager.getPatterns('agent-1', { minConfidence: 1.0 });
      expect(patterns).toHaveLength(0); // pattern has confidence 0.8
    });
  });

  describe('edge cases', () => {
    it('should handle very large maxPatternsPerAgent', () => {
      const manager = new LearningManager({
        maxPatternsPerAgent: Number.MAX_SAFE_INTEGER,
      });
      expect(manager).toBeDefined();
    });

    it('should handle decimal minConfidence values', () => {
      const manager = new LearningManager();
      const pattern: LearnedPattern = {
        id: 'pattern-1',
        agentId: 'agent-1',
        taskType: 'test',
        type: 'success',
        condition: 'test condition',
        action: 'test action',
        outcome: 'test outcome',
        confidence: 0.75,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      manager.addPattern(pattern);

      const patterns = manager.getPatterns('agent-1', { minConfidence: 0.7499 });
      expect(patterns).toHaveLength(1);
    });
  });
});
