// src/evolution/ABTestManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ABTestManager } from './ABTestManager.js';
import type { ABTestExperiment, ABTestVariant } from './types.js';

describe('ABTestManager', () => {
  let manager: ABTestManager;

  beforeEach(() => {
    manager = new ABTestManager();
  });

  describe('createExperiment', () => {
    it('should create experiment with valid configuration', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: { feature: false }, description: 'Baseline' },
        { name: 'treatment', config: { feature: true }, description: 'New feature' },
      ];

      const experiment = manager.createExperiment(
        'test-experiment',
        'Test new feature',
        variants,
        [0.5, 0.5],
        'quality_score'
      );

      expect(experiment.id).toBe('test-experiment');
      expect(experiment.name).toBe('Test new feature');
      expect(experiment.variants).toHaveLength(2);
      expect(experiment.trafficSplit).toEqual([0.5, 0.5]);
      expect(experiment.status).toBe('draft');
    });

    it('should validate traffic split sums to 1.0', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: {} },
        { name: 'treatment', config: {} },
      ];

      expect(() => {
        manager.createExperiment(
          'test',
          'Test',
          variants,
          [0.6, 0.6], // Sum = 1.2, invalid
          'quality_score'
        );
      }).toThrow('Traffic split must sum to 1.0');
    });

    it('should validate variants and traffic split have same length', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: {} },
      ];

      expect(() => {
        manager.createExperiment(
          'test',
          'Test',
          variants,
          [0.5, 0.5], // 2 splits for 1 variant
          'quality_score'
        );
      }).toThrow('Variants and traffic split must have same length');
    });

    it('should reject NaN in traffic split', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: {} },
        { name: 'treatment', config: {} },
      ];

      expect(() => {
        manager.createExperiment(
          'test',
          'Test',
          variants,
          [NaN, 0.5],
          'quality_score'
        );
      }).toThrow('Traffic split values must be finite numbers');
    });

    it('should reject Infinity in traffic split', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: {} },
        { name: 'treatment', config: {} },
      ];

      expect(() => {
        manager.createExperiment(
          'test',
          'Test',
          variants,
          [Infinity, 0],
          'quality_score'
        );
      }).toThrow('Traffic split values must be finite numbers');
    });

    it('should reject negative traffic split values', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: {} },
        { name: 'treatment', config: {} },
      ];

      expect(() => {
        manager.createExperiment(
          'test',
          'Test',
          variants,
          [-0.5, 1.5],
          'quality_score'
        );
      }).toThrow('Traffic split values must be between 0 and 1');
    });

    it('should reject traffic split values > 1', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: {} },
        { name: 'treatment', config: {} },
      ];

      expect(() => {
        manager.createExperiment(
          'test',
          'Test',
          variants,
          [0.5, 1.5],
          'quality_score'
        );
      }).toThrow('Traffic split values must be between 0 and 1');
    });

    it('should reject NaN durationDays', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: {} },
        { name: 'treatment', config: {} },
      ];

      expect(() => {
        manager.createExperiment(
          'test',
          'Test',
          variants,
          [0.5, 0.5],
          'quality_score',
          { durationDays: NaN }
        );
      }).toThrow('durationDays must be finite');
    });

    it('should reject negative durationDays', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: {} },
        { name: 'treatment', config: {} },
      ];

      expect(() => {
        manager.createExperiment(
          'test',
          'Test',
          variants,
          [0.5, 0.5],
          'quality_score',
          { durationDays: -5 }
        );
      }).toThrow('durationDays must be positive');
    });

    it('should reject NaN minSampleSize', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: {} },
        { name: 'treatment', config: {} },
      ];

      expect(() => {
        manager.createExperiment(
          'test',
          'Test',
          variants,
          [0.5, 0.5],
          'quality_score',
          { minSampleSize: NaN }
        );
      }).toThrow('minSampleSize must be finite');
    });

    it('should reject non-integer minSampleSize', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: {} },
        { name: 'treatment', config: {} },
      ];

      expect(() => {
        manager.createExperiment(
          'test',
          'Test',
          variants,
          [0.5, 0.5],
          'quality_score',
          { minSampleSize: 30.5 }
        );
      }).toThrow('minSampleSize must be a positive integer');
    });

    it('should reject NaN significanceLevel', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: {} },
        { name: 'treatment', config: {} },
      ];

      expect(() => {
        manager.createExperiment(
          'test',
          'Test',
          variants,
          [0.5, 0.5],
          'quality_score',
          { significanceLevel: NaN }
        );
      }).toThrow('significanceLevel must be finite');
    });

    it('should reject significanceLevel >= 1', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: {} },
        { name: 'treatment', config: {} },
      ];

      expect(() => {
        manager.createExperiment(
          'test',
          'Test',
          variants,
          [0.5, 0.5],
          'quality_score',
          { significanceLevel: 1.0 }
        );
      }).toThrow('significanceLevel must be between 0 and 1');
    });

    it('should reject significanceLevel <= 0', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: {} },
        { name: 'treatment', config: {} },
      ];

      expect(() => {
        manager.createExperiment(
          'test',
          'Test',
          variants,
          [0.5, 0.5],
          'quality_score',
          { significanceLevel: 0 }
        );
      }).toThrow('significanceLevel must be between 0 and 1');
    });
  });

  describe('assignVariant', () => {
    it('should assign variant deterministically based on agent ID', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: {} },
        { name: 'treatment', config: {} },
      ];

      const experiment = manager.createExperiment(
        'test',
        'Test',
        variants,
        [0.5, 0.5],
        'quality_score'
      );

      // Same agent should get same variant
      const assignment1 = manager.assignVariant(experiment.id, 'agent-123');
      const assignment2 = manager.assignVariant(experiment.id, 'agent-123');

      expect(assignment1.variantName).toBe(assignment2.variantName);
    });

    it('should distribute agents according to traffic split', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: {} },
        { name: 'treatment', config: {} },
      ];

      const experiment = manager.createExperiment(
        'test',
        'Test',
        variants,
        [0.5, 0.5],
        'quality_score'
      );

      // Assign many agents and check distribution
      const assignments: Record<string, number> = { control: 0, treatment: 0 };

      for (let i = 0; i < 1000; i++) {
        const assignment = manager.assignVariant(experiment.id, `agent-${i}`);
        assignments[assignment.variantName]++;
      }

      // Should be roughly 50/50 (with tolerance)
      expect(assignments.control).toBeGreaterThan(400);
      expect(assignments.control).toBeLessThan(600);
      expect(assignments.treatment).toBeGreaterThan(400);
      expect(assignments.treatment).toBeLessThan(600);
    });
  });

  describe('analyzeResults', () => {
    it('should analyze experiment with sufficient data', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: {} },
        { name: 'treatment', config: {} },
      ];

      const experiment = manager.createExperiment(
        'test',
        'Test',
        variants,
        [0.5, 0.5],
        'quality_score',
        {
          minSampleSize: 5,
          significanceLevel: 0.05,
        }
      );

      manager.startExperiment(experiment.id);

      // Add metrics for control group (lower quality)
      for (let i = 0; i < 10; i++) {
        manager.addMetric(experiment.id, 'control', {
          quality_score: 0.70 + Math.random() * 0.1,
        });
      }

      // Add metrics for treatment group (higher quality)
      for (let i = 0; i < 10; i++) {
        manager.addMetric(experiment.id, 'treatment', {
          quality_score: 0.80 + Math.random() * 0.1,
        });
      }

      const results = manager.analyzeResults(experiment.id);

      expect(results.experimentId).toBe('test');
      expect(results.variantStats).toHaveProperty('control');
      expect(results.variantStats).toHaveProperty('treatment');
      expect(results.variantStats.control.sampleSize).toBe(10);
      expect(results.variantStats.treatment.sampleSize).toBe(10);
      expect(results.statisticalTests.pValue).toBeDefined();
      expect(results.winner).toBeDefined();
    });

    it('should return no winner for insufficient data', () => {
      const variants: ABTestVariant[] = [
        { name: 'control', config: {} },
        { name: 'treatment', config: {} },
      ];

      const experiment = manager.createExperiment(
        'test',
        'Test',
        variants,
        [0.5, 0.5],
        'quality_score',
        {
          minSampleSize: 100,
          significanceLevel: 0.05,
        }
      );

      manager.startExperiment(experiment.id);

      // Add only a few metrics
      manager.addMetric(experiment.id, 'control', { quality_score: 0.70 });
      manager.addMetric(experiment.id, 'treatment', { quality_score: 0.80 });

      const results = manager.analyzeResults(experiment.id);

      expect(results.winner).toBeNull();
      expect(results.recommendation).toContain('Insufficient');
    });
  });
});
