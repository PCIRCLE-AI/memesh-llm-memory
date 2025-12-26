import { describe, it, expect } from 'vitest';
import { MultiObjectiveOptimizer } from './MultiObjectiveOptimizer.js';
import type { OptimizationCandidate } from './types.js';

describe('MultiObjectiveOptimizer', () => {
  const optimizer = new MultiObjectiveOptimizer();

  it('should identify Pareto-optimal solutions', () => {
    const candidates: OptimizationCandidate[] = [
      {
        id: 'c1',
        objectives: {
          accuracy: 0.9,
          speed: 0.5,
          cost: 0.8,
        },
      },
      {
        id: 'c2',
        objectives: {
          accuracy: 0.7,
          speed: 0.9,
          cost: 0.9,
        },
      },
      {
        id: 'c3',
        objectives: {
          accuracy: 0.6,
          speed: 0.6,
          cost: 0.7,
        },
      },
    ];

    const paretoFront = optimizer.findParetoFront(candidates);

    // c1 and c2 are non-dominated (c3 is dominated by both)
    expect(paretoFront).toHaveLength(2);
    expect(paretoFront.map((c) => c.id)).toContain('c1');
    expect(paretoFront.map((c) => c.id)).toContain('c2');
  });

  it('should select best candidate based on weights', () => {
    const candidates: OptimizationCandidate[] = [
      {
        id: 'fast',
        objectives: {
          accuracy: 0.7,
          speed: 0.95,
          cost: 0.8,
        },
      },
      {
        id: 'accurate',
        objectives: {
          accuracy: 0.95,
          speed: 0.6,
          cost: 0.7,
        },
      },
    ];

    // Prefer accuracy
    const best1 = optimizer.selectBest(candidates, {
      accuracy: 0.7,
      speed: 0.2,
      cost: 0.1,
    });
    expect(best1?.id).toBe('accurate');

    // Prefer speed
    const best2 = optimizer.selectBest(candidates, {
      accuracy: 0.2,
      speed: 0.7,
      cost: 0.1,
    });
    expect(best2?.id).toBe('fast');
  });

  it('should compute dominated count', () => {
    const c1: OptimizationCandidate = {
      id: 'c1',
      objectives: { accuracy: 0.9, speed: 0.8 },
    };
    const c2: OptimizationCandidate = {
      id: 'c2',
      objectives: { accuracy: 0.7, speed: 0.7 },
    };

    expect(optimizer.dominates(c1, c2)).toBe(true);
    expect(optimizer.dominates(c2, c1)).toBe(false);
  });
});
