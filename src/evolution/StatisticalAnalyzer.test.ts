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
    it('should calculate sample standard deviation correctly', () => {
      // Using Bessel's correction (n-1) for sample standard deviation
      // Data: [2, 4, 4, 4, 5, 5, 7, 9], mean = 5
      // Sample variance = sum((x - mean)^2) / (n-1) = 32 / 7 ≈ 4.571
      // Sample std dev = sqrt(4.571) ≈ 2.138
      const stdDev = analyzer.calculateStdDev([2, 4, 4, 4, 5, 5, 7, 9]);
      expect(stdDev).toBeCloseTo(2.138, 2);
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

  // CRITICAL-5: Division by zero and small sample size tests
  describe('CRITICAL-5: Division by zero in t-test', () => {
    it('should throw error for sample size < 2 (control)', () => {
      const control = [20];
      const treatment = [30, 32, 34];

      expect(() => analyzer.welchTTest(control, treatment)).toThrow(
        'Sample sizes must be at least 2 for t-test'
      );
    });

    it('should throw error for sample size < 2 (treatment)', () => {
      const control = [20, 22, 24];
      const treatment = [30];

      expect(() => analyzer.welchTTest(control, treatment)).toThrow(
        'Sample sizes must be at least 2 for t-test'
      );
    });

    it('should throw error for empty control array', () => {
      const control: number[] = [];
      const treatment = [30, 32, 34];

      expect(() => analyzer.welchTTest(control, treatment)).toThrow(
        'Sample sizes must be at least 2 for t-test'
      );
    });

    it('should throw error for empty treatment array', () => {
      const control = [20, 22, 24];
      const treatment: number[] = [];

      expect(() => analyzer.welchTTest(control, treatment)).toThrow(
        'Sample sizes must be at least 2 for t-test'
      );
    });

    it('should handle zero variance samples (all identical values)', () => {
      const control = [20, 20, 20];
      const treatment = [20, 20, 20];

      const result = analyzer.welchTTest(control, treatment);

      // Zero variance → denominator = 0 → should return default values
      expect(result.tStatistic).toBe(0);
      expect(result.pValue).toBe(1.0);
      expect(result.degreesOfFreedom).toBe(4); // n1 + n2 - 2
      expect(result.significant).toBe(false);
    });

    it('should handle zero variance in control group only', () => {
      const control = [20, 20, 20];
      const treatment = [30, 32, 34];

      const result = analyzer.welchTTest(control, treatment);

      // Should handle gracefully with partial zero variance
      expect(result.tStatistic).toBeDefined();
      expect(result.pValue).toBeDefined();
      expect(result.degreesOfFreedom).toBeGreaterThan(0);
      expect(Number.isFinite(result.tStatistic)).toBe(true);
      expect(Number.isFinite(result.pValue)).toBe(true);
      expect(Number.isFinite(result.degreesOfFreedom)).toBe(true);
    });

    it('should handle zero variance in treatment group only', () => {
      const control = [20, 22, 24];
      const treatment = [30, 30, 30];

      const result = analyzer.welchTTest(control, treatment);

      // Should handle gracefully with partial zero variance
      expect(result.tStatistic).toBeDefined();
      expect(result.pValue).toBeDefined();
      expect(result.degreesOfFreedom).toBeGreaterThan(0);
      expect(Number.isFinite(result.tStatistic)).toBe(true);
      expect(Number.isFinite(result.pValue)).toBe(true);
      expect(Number.isFinite(result.degreesOfFreedom)).toBe(true);
    });

    it('should handle minimum valid sample size (n=2 each)', () => {
      const control = [20, 24];
      const treatment = [30, 34];

      const result = analyzer.welchTTest(control, treatment);

      expect(result.tStatistic).toBeDefined();
      expect(result.pValue).toBeDefined();
      expect(result.degreesOfFreedom).toBeGreaterThan(0);
      expect(Number.isFinite(result.tStatistic)).toBe(true);
      expect(Number.isFinite(result.pValue)).toBe(true);
      expect(Number.isFinite(result.degreesOfFreedom)).toBe(true);
    });

    it('should calculate significant field correctly for p < 0.05', () => {
      const control = [20, 21, 22, 23, 24];
      const treatment = [30, 31, 32, 33, 34];

      const result = analyzer.welchTTest(control, treatment);

      // Large difference → should be significant
      expect(result.pValue).toBeLessThan(0.05);
      expect(result.significant).toBe(true);
    });

    it('should calculate significant field correctly for p >= 0.05', () => {
      const control = [20, 21, 22, 23, 24];
      const treatment = [20, 21, 22, 23, 24];

      const result = analyzer.welchTTest(control, treatment);

      // No difference → should not be significant
      expect(result.pValue).toBeGreaterThan(0.05);
      expect(result.significant).toBe(false);
    });

    it('should handle very small variance without division by zero', () => {
      const control = [20, 20.0001, 20.0002];
      const treatment = [30, 30.0001, 30.0002];

      const result = analyzer.welchTTest(control, treatment);

      // Should not produce NaN or Infinity
      expect(Number.isFinite(result.tStatistic)).toBe(true);
      expect(Number.isFinite(result.pValue)).toBe(true);
      expect(Number.isFinite(result.degreesOfFreedom)).toBe(true);
    });
  });
});
