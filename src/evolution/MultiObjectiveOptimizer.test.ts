/**
 * MultiObjectiveOptimizer - Validation Tests
 *
 * Tests for NaN/Infinity validation in weight parameters
 */

import { describe, it, expect } from 'vitest';
import { MultiObjectiveOptimizer } from './MultiObjectiveOptimizer.js';
import type { OptimizationCandidate } from './types.js';

describe('MultiObjectiveOptimizer - Validation', () => {
  const optimizer = new MultiObjectiveOptimizer();

  const createCandidate = (id: string, objectives: Record<string, number>): OptimizationCandidate => ({
    id,
    objectives,
  });

  describe('selectBest - weight validation', () => {
    const candidates = [
      createCandidate('c1', { quality: 0.8, cost: 0.6 }),
      createCandidate('c2', { quality: 0.7, cost: 0.8 }),
    ];

    it('should accept valid weights', () => {
      const result = optimizer.selectBest(candidates, { quality: 0.6, cost: 0.4 });
      expect(result).toBeDefined();
      // c1: 0.8*0.6 + 0.6*0.4 = 0.72, c2: 0.7*0.6 + 0.8*0.4 = 0.74
      expect(result?.id).toBe('c2'); // c2 has better weighted score
    });

    it('should reject NaN in weights', () => {
      const result = optimizer.selectBest(candidates, { quality: NaN, cost: 0.5 });
      expect(result).toBeUndefined();
    });

    it('should reject Infinity in weights', () => {
      const result = optimizer.selectBest(candidates, { quality: Infinity, cost: 0.5 });
      expect(result).toBeUndefined();
    });

    it('should reject negative Infinity in weights', () => {
      const result = optimizer.selectBest(candidates, { quality: -Infinity, cost: 0.5 });
      expect(result).toBeUndefined();
    });

    it('should reject negative weights', () => {
      const result = optimizer.selectBest(candidates, { quality: -0.5, cost: 0.5 });
      expect(result).toBeUndefined();
    });

    it('should reject weights > 1', () => {
      const result = optimizer.selectBest(candidates, { quality: 1.5, cost: 0.5 });
      expect(result).toBeUndefined();
    });

    it('should handle zero weights', () => {
      const result = optimizer.selectBest(candidates, { quality: 0, cost: 1.0 });
      expect(result).toBeDefined();
      expect(result?.id).toBe('c2'); // c2 has better cost
    });

    it('should handle empty candidates', () => {
      const result = optimizer.selectBest([], { quality: 0.5, cost: 0.5 });
      expect(result).toBeUndefined();
    });

    it('should handle empty weights', () => {
      const result = optimizer.selectBest(candidates, {});
      expect(result).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('should handle very small valid weights', () => {
      const candidates = [createCandidate('c1', { quality: 0.8 })];
      const result = optimizer.selectBest(candidates, { quality: Number.MIN_VALUE });
      expect(result).toBeDefined();
    });

    it('should handle weight boundary values', () => {
      const candidates = [
        createCandidate('c1', { quality: 0.8, cost: 0.6 }),
        createCandidate('c2', { quality: 0.7, cost: 0.8 }),
      ];

      // Test with weights at boundaries (0 and 1)
      const result1 = optimizer.selectBest(candidates, { quality: 1.0, cost: 0.0 });
      expect(result1).toBeDefined();

      const result2 = optimizer.selectBest(candidates, { quality: 0.0, cost: 1.0 });
      expect(result2).toBeDefined();
    });

    it('should handle multiple invalid weights gracefully', () => {
      const candidates = [createCandidate('c1', { quality: 0.8 })];
      const result = optimizer.selectBest(candidates, {
        quality: NaN,
        cost: Infinity,
        speed: -1
      });
      expect(result).toBeUndefined();
    });
  });

  describe('findParetoFront', () => {
    it('should handle candidates with NaN/Infinity objectives', () => {
      const candidates = [
        createCandidate('c1', { quality: 0.8, cost: 0.6 }),
        createCandidate('c2', { quality: NaN, cost: 0.5 }),
        createCandidate('c3', { quality: 0.7, cost: Infinity }),
      ];

      const pareto = optimizer.findParetoFront(candidates);
      // Should still return valid candidates
      expect(pareto.length).toBeGreaterThan(0);
    });

    it('should handle empty candidates', () => {
      const pareto = optimizer.findParetoFront([]);
      expect(pareto).toEqual([]);
    });

    it('should handle single candidate', () => {
      const candidates = [createCandidate('c1', { quality: 0.8 })];
      const pareto = optimizer.findParetoFront(candidates);
      expect(pareto).toEqual(candidates);
    });
  });
});
