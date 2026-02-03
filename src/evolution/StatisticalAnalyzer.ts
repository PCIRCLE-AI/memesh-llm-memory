// src/evolution/StatisticalAnalyzer.ts

import { logger } from '../utils/logger.js';

/**
 * Result of Welch's t-test
 */
export interface WelchTTestResult {
  /**
   * t-statistic
   */
  tStatistic: number;

  /**
   * p-value (two-tailed)
   */
  pValue: number;

  /**
   * Degrees of freedom
   */
  degreesOfFreedom: number;

  /**
   * Whether the result is statistically significant
   */
  significant: boolean;
}

/**
 * Statistical Analyzer for A/B Testing
 *
 * Provides statistical methods for analyzing experiment results
 */
export class StatisticalAnalyzer {
  /**
   * Calculate mean (average) of a dataset
   *
   * @param data - Array of numbers
   * @returns Mean value
   */
  calculateMean(data: number[]): number {
    if (data.length === 0) {
      return 0;
    }
    const sum = data.reduce((acc, val) => acc + val, 0);
    return sum / data.length;
  }

  /**
   * Calculate standard deviation of a dataset
   *
   * @param data - Array of numbers
   * @returns Standard deviation
   */
  calculateStdDev(data: number[]): number {
    if (data.length === 0) {
      return 0;
    }

    const mean = this.calculateMean(data);
    const squaredDiffs = data.map((val) => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / data.length;
    return Math.sqrt(variance);
  }

  /**
   * Perform Welch's t-test (doesn't assume equal variances)
   *
   * @param control - Control group data
   * @param treatment - Treatment group data
   * @returns t-test result
   */
  welchTTest(control: number[], treatment: number[]): WelchTTestResult {
    const n1 = control.length;
    const n2 = treatment.length;

    // ✅ Validate sample sizes
    if (n1 < 2 || n2 < 2) {
      throw new Error('Sample sizes must be at least 2 for t-test');
    }

    const mean1 = this.calculateMean(control);
    const mean2 = this.calculateMean(treatment);

    const stdDev1 = this.calculateStdDev(control);
    const stdDev2 = this.calculateStdDev(treatment);

    // Calculate t-statistic
    const variance1 = Math.pow(stdDev1, 2) / n1;
    const variance2 = Math.pow(stdDev2, 2) / n2;

    const varianceSum = variance1 + variance2;

    // ✅ Check for zero variance sum (both groups have no variance)
    if (varianceSum === 0) {
      // Both groups have zero variance
      return {
        tStatistic: 0,
        pValue: 1.0,
        degreesOfFreedom: n1 + n2 - 2,
        significant: false,
      };
    }

    const tStatistic = (mean1 - mean2) / Math.sqrt(varianceSum);

    // ✅ Check for invalid t-statistic (Infinity or NaN)
    if (!Number.isFinite(tStatistic)) {
      logger.warn('[StatisticalAnalyzer] Invalid t-statistic', {
        mean1,
        mean2,
        variance1,
        variance2,
        tStatistic,
      });
      return {
        tStatistic: 0,
        pValue: 1.0,
        degreesOfFreedom: n1 + n2 - 2,
        significant: false,
      };
    }

    // Calculate Welch-Satterthwaite degrees of freedom
    const numerator = Math.pow(varianceSum, 2);
    const denominator =
      Math.pow(variance1, 2) / (n1 - 1) + Math.pow(variance2, 2) / (n2 - 1);

    // ✅ Check for zero denominator
    if (denominator === 0 || !Number.isFinite(denominator)) {
      // Both groups have zero variance - no difference to test
      return {
        tStatistic: 0,
        pValue: 1.0,
        degreesOfFreedom: n1 + n2 - 2,
        significant: false,
      };
    }

    const degreesOfFreedom = numerator / denominator;

    // ✅ Validate result
    if (!Number.isFinite(degreesOfFreedom)) {
      logger.warn('[StatisticalAnalyzer] Invalid degrees of freedom', {
        numerator,
        denominator,
        degreesOfFreedom,
      });
      return {
        tStatistic: 0,
        pValue: 1.0,
        degreesOfFreedom: n1 + n2 - 2,
        significant: false,
      };
    }

    // Calculate p-value (two-tailed) using t-distribution approximation
    const pValue = this.tDistributionPValue(
      Math.abs(tStatistic),
      degreesOfFreedom
    );

    // ✅ Validate p-value
    const twoTailedPValue = pValue * 2;
    if (!Number.isFinite(twoTailedPValue)) {
      logger.warn('[StatisticalAnalyzer] Invalid p-value', {
        tStatistic,
        degreesOfFreedom,
        pValue,
      });
      return {
        tStatistic,
        pValue: 1.0,
        degreesOfFreedom,
        significant: false,
      };
    }

    return {
      tStatistic,
      pValue: twoTailedPValue, // Two-tailed
      degreesOfFreedom,
      significant: twoTailedPValue < 0.05, // 95% confidence level
    };
  }

  /**
   * Calculate p-value from t-distribution (approximation)
   *
   * @param t - t-statistic (absolute value)
   * @param df - degrees of freedom
   * @returns One-tailed p-value
   */
  private tDistributionPValue(t: number, df: number): number {
    // Approximation using normal distribution for large df
    // For small df, use more accurate formula
    if (df > 30) {
      // Use normal approximation
      return this.normalCDF(-t);
    }

    // For smaller df, use a more accurate approximation
    // This is a simplified version - production code should use a proper library
    const x = df / (df + t * t);
    const beta = this.incompleteBeta(x, df / 2, 0.5);
    return beta / 2;
  }

  /**
   * Approximate CDF of standard normal distribution
   *
   * @param z - z-score
   * @returns P(Z <= z)
   */
  private normalCDF(z: number): number {
    // Approximation using error function
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989423 * Math.exp((-z * z) / 2);
    const prob =
      d *
      t *
      (0.3193815 +
        t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));

    return z > 0 ? 1 - prob : prob;
  }

  /**
   * Incomplete beta function approximation
   *
   * @param x - value
   * @param a - parameter a
   * @param b - parameter b
   * @returns Approximation of incomplete beta
   */
  private incompleteBeta(x: number, a: number, b: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Simple approximation for beta distribution
    // Production code should use a proper statistical library
    const lnBeta =
      this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b);
    const front = Math.exp(
      Math.log(x) * a + Math.log(1 - x) * b - lnBeta
    ) / a;

    // Continued fraction approximation
    let f = 1.0;
    let c = 1.0;
    let d = 0.0;

    for (let m = 0; m <= 100; m++) {
      const aa = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m));
      d = 1 + aa * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      f *= d * c;

      const aa2 = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1));
      d = 1 + aa2 * d;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa2 / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const delta = d * c;
      f *= delta;

      if (Math.abs(delta - 1.0) < 1e-8) break;
    }

    return front * f;
  }

  /**
   * Logarithm of gamma function approximation (Stirling's approximation)
   *
   * @param x - value
   * @returns ln(Gamma(x))
   */
  private logGamma(x: number): number {
    const cof = [
      76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
    ];

    let y = x;
    let tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;

    for (let j = 0; j < 6; j++) {
      ser += cof[j] / ++y;
    }

    return -tmp + Math.log((2.5066282746310005 * ser) / x);
  }

  /**
   * Calculate effect size (Cohen's d)
   *
   * @param control - Control group data
   * @param treatment - Treatment group data
   * @returns Cohen's d
   */
  calculateEffectSize(control: number[], treatment: number[]): number {
    const mean1 = this.calculateMean(control);
    const mean2 = this.calculateMean(treatment);

    const stdDev1 = this.calculateStdDev(control);
    const stdDev2 = this.calculateStdDev(treatment);

    // Pooled standard deviation
    const n1 = control.length;
    const n2 = treatment.length;

    const pooledVariance =
      ((n1 - 1) * Math.pow(stdDev1, 2) + (n2 - 1) * Math.pow(stdDev2, 2)) /
      (n1 + n2 - 2);

    const pooledStdDev = Math.sqrt(pooledVariance);

    if (pooledStdDev === 0) {
      return 0;
    }

    return (mean1 - mean2) / pooledStdDev;
  }

  /**
   * Calculate confidence interval for a dataset
   *
   * @param data - Array of numbers
   * @param confidence - Confidence level (e.g., 0.95 for 95%)
   * @returns [lower bound, upper bound]
   */
  calculateConfidenceInterval(
    data: number[],
    confidence: number = 0.95
  ): [number, number] {
    const mean = this.calculateMean(data);
    const stdDev = this.calculateStdDev(data);
    const n = data.length;

    // t-critical value approximation for given confidence level
    const alpha = 1 - confidence;
    const df = n - 1;

    // For large samples, use normal approximation
    // For small samples, this is a rough approximation
    const tCritical = this.getTCritical(alpha / 2, df);

    const marginOfError = tCritical * (stdDev / Math.sqrt(n));

    return [mean - marginOfError, mean + marginOfError];
  }

  /**
   * Get t-critical value for given alpha and degrees of freedom
   *
   * @param alpha - significance level (one-tailed)
   * @param df - degrees of freedom
   * @returns t-critical value
   */
  private getTCritical(alpha: number, df: number): number {
    // For simplicity, use normal approximation for all df
    // This provides reasonable accuracy and correctly handles different confidence levels
    // Production code should use a proper statistical library with exact t-distribution
    const zCritical = this.getZCritical(alpha);

    // Apply small correction for small df (rough approximation)
    if (df < 30) {
      // Increase critical value slightly for smaller samples
      const correction = 1 + (30 - df) * 0.02;
      return zCritical * correction;
    }

    return zCritical;
  }

  /**
   * Get z-critical value for given alpha (normal distribution)
   *
   * @param alpha - significance level (one-tailed)
   * @returns z-critical value
   */
  private getZCritical(alpha: number): number {
    // Common values
    if (Math.abs(alpha - 0.025) < 0.001) return 1.96; // 95% CI
    if (Math.abs(alpha - 0.05) < 0.001) return 1.645; // 90% CI
    if (Math.abs(alpha - 0.005) < 0.001) return 2.576; // 99% CI

    // Approximation for other values
    return Math.sqrt(2) * this.erfInv(1 - 2 * alpha);
  }

  /**
   * Inverse error function approximation
   *
   * @param x - value
   * @returns erf^-1(x)
   */
  private erfInv(x: number): number {
    const a = 0.147;
    const b = 2 / (Math.PI * a) + Math.log(1 - x * x) / 2;
    const sqrt1 = Math.sqrt(b * b - Math.log(1 - x * x) / a);
    const sqrt2 = Math.sqrt(sqrt1 - b);
    return sqrt2 * Math.sign(x);
  }
}
