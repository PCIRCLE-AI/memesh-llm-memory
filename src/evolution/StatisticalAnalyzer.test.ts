// src/evolution/StatisticalAnalyzer.test.ts
import { describe, it, expect } from 'vitest';
import { StatisticalAnalyzer } from './StatisticalAnalyzer.js';

describe('StatisticalAnalyzer', () => {
  const analyzer = new StatisticalAnalyzer();

  describe('calculateMean', () => {
    it('should calculate mean correctly', () => {
      expect(analyzer.calculateMean([1, 2, 3, 4, 5])).toBe(3);
      expect(analyzer.calculateMean([10, 20, 30])).toBe(20);
    });

    it('should handle single value', () => {
      expect(analyzer.calculateMean([42])).toBe(42);
    });
  });

  describe('calculateStdDev', () => {
    it('should calculate standard deviation correctly', () => {
      const stdDev = analyzer.calculateStdDev([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(stdDev).toBeCloseTo(2.0, 1);
    });

    it('should return 0 for uniform data', () => {
      expect(analyzer.calculateStdDev([5, 5, 5, 5])).toBe(0);
    });
  });

  describe('welchTTest', () => {
    it('should calculate t-statistic and p-value for different samples', () => {
      const control = [23, 25, 27, 29, 31];
      const treatment = [33, 35, 37, 39, 41];

      const result = analyzer.welchTTest(control, treatment);

      expect(result.tStatistic).toBeLessThan(0); // Control < Treatment
      expect(result.pValue).toBeLessThan(0.05); // Significant difference
      expect(result.degreesOfFreedom).toBeGreaterThan(0);
    });

    it('should return high p-value for similar samples', () => {
      const control = [20, 21, 22, 23, 24];
      const treatment = [20, 21, 22, 23, 24];

      const result = analyzer.welchTTest(control, treatment);

      expect(Math.abs(result.tStatistic)).toBeCloseTo(0, 1);
      expect(result.pValue).toBeGreaterThan(0.05); // Not significant
    });
  });

  describe('calculateEffectSize', () => {
    it('should calculate Cohen\'s d for effect size', () => {
      const control = [20, 22, 24, 26, 28];
      const treatment = [30, 32, 34, 36, 38];

      const effectSize = analyzer.calculateEffectSize(control, treatment);

      // Large effect size (difference > 2 pooled std devs)
      expect(Math.abs(effectSize)).toBeGreaterThan(2.0);
    });

    it('should return 0 for identical samples', () => {
      const control = [20, 20, 20];
      const treatment = [20, 20, 20];

      const effectSize = analyzer.calculateEffectSize(control, treatment);
      expect(effectSize).toBe(0);
    });

    it('should handle negative effect (control > treatment)', () => {
      const control = [30, 32, 34];
      const treatment = [20, 22, 24];

      const effectSize = analyzer.calculateEffectSize(control, treatment);
      expect(effectSize).toBeGreaterThan(0); // Positive because control > treatment
    });
  });

  describe('calculateConfidenceInterval', () => {
    it('should calculate 95% confidence interval', () => {
      const data = [20, 22, 24, 26, 28, 30, 32, 34, 36, 38];

      const [lower, upper] = analyzer.calculateConfidenceInterval(data, 0.95);

      const mean = analyzer.calculateMean(data);
      expect(lower).toBeLessThan(mean);
      expect(upper).toBeGreaterThan(mean);
      expect(upper - lower).toBeGreaterThan(0); // Positive interval width
    });

    it('should have narrower interval for higher confidence', () => {
      const data = [20, 22, 24, 26, 28, 30, 32, 34, 36, 38];

      const [lower90, upper90] = analyzer.calculateConfidenceInterval(data, 0.90);
      const [lower95, upper95] = analyzer.calculateConfidenceInterval(data, 0.95);

      // 95% CI should be wider than 90% CI
      expect(upper95 - lower95).toBeGreaterThan(upper90 - lower90);
    });
  });
});
