// src/evolution/ABTestManager.ts
import crypto from 'crypto';
import { StatisticalAnalyzer } from './StatisticalAnalyzer.js';
import type {
  ABTestExperiment,
  ABTestVariant,
  ABTestAssignment,
  ABTestResults,
  VariantStatistics,
} from './types.js';
import { ValidationError, NotFoundError } from '../errors/index.js';

/**
 * Options for creating an A/B test experiment
 */
export interface CreateExperimentOptions {
  /**
   * Experiment duration in days
   * @default 7
   */
  durationDays?: number;

  /**
   * Minimum sample size per variant
   * @default 30
   */
  minSampleSize?: number;

  /**
   * Statistical significance threshold (p-value)
   * @default 0.05
   */
  significanceLevel?: number;

  /**
   * Secondary metrics to track
   */
  secondaryMetrics?: string[];
}

/**
 * A/B Test Manager
 *
 * Manages A/B testing experiments for agent configurations
 */
export class ABTestManager {
  private experiments: Map<string, ABTestExperiment> = new Map();
  private assignments: Map<string, ABTestAssignment[]> = new Map();
  private metrics: Map<string, Map<string, Record<string, number>[]>> = new Map();
  private analyzer: StatisticalAnalyzer = new StatisticalAnalyzer();

  /**
   * Create a new A/B test experiment
   *
   * @param id - Unique experiment ID
   * @param name - Human-readable name
   * @param variants - Test variants
   * @param trafficSplit - Traffic distribution (must sum to 1.0)
   * @param successMetric - Primary success metric
   * @param options - Additional options
   * @returns Created experiment
   */
  createExperiment(
    id: string,
    name: string,
    variants: ABTestVariant[],
    trafficSplit: number[],
    successMetric: 'quality_score' | 'cost' | 'duration' | 'user_satisfaction',
    options: CreateExperimentOptions = {}
  ): ABTestExperiment {
    // Validate inputs
    if (variants.length !== trafficSplit.length) {
      throw new ValidationError('Variants and traffic split must have same length', {
        component: 'ABTestManager',
        method: 'createExperiment',
        variantsLength: variants.length,
        trafficSplitLength: trafficSplit.length,
        constraint: 'variants.length === trafficSplit.length',
      });
    }

    // Validate trafficSplit array values - must be finite, non-negative, and sum to 1.0
    for (let i = 0; i < trafficSplit.length; i++) {
      const value = trafficSplit[i];
      if (!Number.isFinite(value)) {
        throw new ValidationError('Traffic split values must be finite numbers', {
          component: 'ABTestManager',
          method: 'createExperiment',
          index: i,
          value,
          constraint: 'Number.isFinite(value)',
        });
      }
      if (value < 0 || value > 1) {
        throw new ValidationError('Traffic split values must be between 0 and 1', {
          component: 'ABTestManager',
          method: 'createExperiment',
          index: i,
          value,
          constraint: '0 <= value <= 1',
        });
      }
    }

    const sum = trafficSplit.reduce((acc, val) => acc + val, 0);
    if (Math.abs(sum - 1.0) > 0.001) {
      throw new ValidationError('Traffic split must sum to 1.0', {
        component: 'ABTestManager',
        method: 'createExperiment',
        actualSum: sum,
        constraint: 'sum(trafficSplit) === 1.0',
      });
    }

    // Validate options
    if (options.durationDays !== undefined) {
      if (!Number.isFinite(options.durationDays)) {
        throw new ValidationError('durationDays must be finite', {
          component: 'ABTestManager',
          method: 'createExperiment',
          value: options.durationDays,
          constraint: 'Number.isFinite(durationDays)',
        });
      }
      if (options.durationDays <= 0) {
        throw new ValidationError('durationDays must be positive', {
          component: 'ABTestManager',
          method: 'createExperiment',
          value: options.durationDays,
          constraint: 'durationDays > 0',
        });
      }
    }

    if (options.minSampleSize !== undefined) {
      if (!Number.isFinite(options.minSampleSize)) {
        throw new ValidationError('minSampleSize must be finite', {
          component: 'ABTestManager',
          method: 'createExperiment',
          value: options.minSampleSize,
          constraint: 'Number.isFinite(minSampleSize)',
        });
      }
      if (!Number.isSafeInteger(options.minSampleSize) || options.minSampleSize <= 0) {
        throw new ValidationError('minSampleSize must be a positive integer', {
          component: 'ABTestManager',
          method: 'createExperiment',
          value: options.minSampleSize,
          constraint: 'minSampleSize > 0 and integer',
        });
      }
    }

    if (options.significanceLevel !== undefined) {
      if (!Number.isFinite(options.significanceLevel)) {
        throw new ValidationError('significanceLevel must be finite', {
          component: 'ABTestManager',
          method: 'createExperiment',
          value: options.significanceLevel,
          constraint: 'Number.isFinite(significanceLevel)',
        });
      }
      if (options.significanceLevel <= 0 || options.significanceLevel >= 1) {
        throw new ValidationError('significanceLevel must be between 0 and 1', {
          component: 'ABTestManager',
          method: 'createExperiment',
          value: options.significanceLevel,
          constraint: '0 < significanceLevel < 1',
        });
      }
    }

    const experiment: ABTestExperiment = {
      id,
      name,
      description: name,
      variants,
      trafficSplit,
      successMetric,
      secondaryMetrics: options.secondaryMetrics,
      durationDays: options.durationDays ?? 7,
      minSampleSize: options.minSampleSize ?? 30,
      significanceLevel: options.significanceLevel ?? 0.05,
      status: 'draft',
    };

    this.experiments.set(id, experiment);
    this.assignments.set(id, []);
    this.metrics.set(id, new Map());

    return experiment;
  }

  /**
   * Start an experiment
   *
   * @param experimentId - Experiment ID
   */
  startExperiment(experimentId: string): void {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new NotFoundError(
        `Experiment ${experimentId} not found`,
        'experiment',
        experimentId,
        { availableExperiments: Array.from(this.experiments.keys()) }
      );
    }

    experiment.status = 'running';
    experiment.startedAt = new Date();
  }

  /**
   * Assign an agent to a variant (deterministic based on agent ID)
   *
   * @param experimentId - Experiment ID
   * @param agentId - Agent ID
   * @returns Assignment
   */
  assignVariant(experimentId: string, agentId: string): ABTestAssignment {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new NotFoundError(
        `Experiment ${experimentId} not found`,
        'experiment',
        experimentId,
        { availableExperiments: Array.from(this.experiments.keys()) }
      );
    }

    const assignments = this.assignments.get(experimentId)!;

    // Check if already assigned
    const existing = assignments.find((a) => a.agentId === agentId);
    if (existing) {
      return existing;
    }

    // Deterministic assignment using hash
    const variantIndex = this.hashToVariant(
      `${experimentId}:${agentId}`,
      experiment.trafficSplit
    );

    const assignment: ABTestAssignment = {
      id: `${experimentId}:${agentId}`,
      experimentId,
      agentId,
      variantName: experiment.variants[variantIndex].name,
      assignedAt: new Date(),
    };

    assignments.push(assignment);
    return assignment;
  }

  /**
   * Hash agent ID to variant index using traffic split
   *
   * ✅ CODE QUALITY FIX (MAJOR-3): Safe hash parsing with overflow check
   *
   * @param key - Key to hash
   * @param trafficSplit - Traffic distribution
   * @returns Variant index
   */
  private hashToVariant(key: string, trafficSplit: number[]): number {
    // Use SHA-256 hash to get deterministic assignment
    const hash = crypto.createHash('sha256').update(key).digest('hex');

    // ✅ FIX: Safe hex parsing with bounds check
    const hashHex = hash.substring(0, 8);
    const hashInt = parseInt(hashHex, 16);

    // Validate parsed value
    if (isNaN(hashInt) || !isFinite(hashInt)) {
      // Fallback: use last variant if parsing fails
      return trafficSplit.length - 1;
    }

    // Normalize hash to a 0-1 range via modulo.
    //
    // NOTE ON MODULO VALUE (100000 vs power-of-2):
    // A power-of-2 modulus (e.g. 0x100000 = 1048576) would provide slightly
    // better bit distribution because modulo by a power of 2 preserves the
    // low bits of the hash without introducing modular bias. However, changing
    // the modulus would alter existing variant assignments for all users in
    // running experiments, which is unacceptable for A/B test integrity.
    //
    // If this system is ever reset (no active experiments), consider migrating
    // to: (hashInt % 0x100000) / 0x100000
    const normalizedHash = (hashInt % 100000) / 100000; // 0 to 1

    // Find variant based on cumulative traffic split
    let cumulative = 0;
    for (let i = 0; i < trafficSplit.length; i++) {
      cumulative += trafficSplit[i];
      if (normalizedHash < cumulative) {
        return i;
      }
    }

    return trafficSplit.length - 1; // Fallback to last variant
  }

  /**
   * Add a metric observation for a variant
   *
   * @param experimentId - Experiment ID
   * @param variantName - Variant name
   * @param metrics - Metric values
   */
  addMetric(
    experimentId: string,
    variantName: string,
    metrics: Record<string, number>
  ): void {
    // Get or create experiment metrics map
    if (!this.metrics.has(experimentId)) {
      this.metrics.set(experimentId, new Map());
    }
    const experimentMetrics = this.metrics.get(experimentId)!;

    // Get or create variant metrics array
    if (!experimentMetrics.has(variantName)) {
      experimentMetrics.set(variantName, []);
    }
    experimentMetrics.get(variantName)!.push(metrics);
  }

  /**
   * Analyze experiment results
   *
   * @param experimentId - Experiment ID
   * @returns Analysis results
   */
  analyzeResults(experimentId: string): ABTestResults {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new NotFoundError(
        `Experiment ${experimentId} not found`,
        'experiment',
        experimentId,
        { availableExperiments: Array.from(this.experiments.keys()) }
      );
    }

    const experimentMetrics = this.metrics.get(experimentId);
    if (!experimentMetrics) {
      throw new NotFoundError(
        `No metrics found for experiment ${experimentId}`,
        'experimentMetrics',
        experimentId,
        {
          experiment: experimentId,
          availableMetrics: Array.from(this.metrics.keys())
        }
      );
    }

    // Calculate variant statistics
    const variantStats: Record<string, VariantStatistics> = {};

    for (const variant of experiment.variants) {
      const metrics = experimentMetrics.get(variant.name) || [];
      const successMetricValues = metrics.map(
        (m) => m[experiment.successMetric] || 0
      );

      if (successMetricValues.length === 0) {
        variantStats[variant.name] = {
          variantName: variant.name,
          sampleSize: 0,
          successRate: 0,
          mean: 0,
          stdDev: 0,
          confidenceInterval: [0, 0],
        };
        continue;
      }

      const mean = this.analyzer.calculateMean(successMetricValues);
      const stdDev = this.analyzer.calculateStdDev(successMetricValues);
      const ci = this.analyzer.calculateConfidenceInterval(successMetricValues);

      variantStats[variant.name] = {
        variantName: variant.name,
        sampleSize: successMetricValues.length,
        successRate: mean, // For continuous metrics, this is the mean
        mean,
        stdDev,
        confidenceInterval: ci,
      };
    }

    // Perform statistical test (comparing first two variants)
    const variantNames = experiment.variants.map((v) => v.name);
    const control = experimentMetrics.get(variantNames[0]) || [];
    const treatment = experimentMetrics.get(variantNames[1]) || [];

    const controlValues = control.map((m) => m[experiment.successMetric] || 0);
    const treatmentValues = treatment.map(
      (m) => m[experiment.successMetric] || 0
    );

    let pValue = 1.0;
    let effectSize = 0;
    let winner: string | null = null;
    let recommendation = '';

    if (
      controlValues.length >= experiment.minSampleSize &&
      treatmentValues.length >= experiment.minSampleSize
    ) {
      const tTest = this.analyzer.welchTTest(controlValues, treatmentValues);
      effectSize = this.analyzer.calculateEffectSize(controlValues, treatmentValues);
      pValue = tTest.pValue;

      if (pValue < experiment.significanceLevel) {
        // Statistically significant
        const controlMean = this.analyzer.calculateMean(controlValues);
        const treatmentMean = this.analyzer.calculateMean(treatmentValues);

        winner = treatmentMean > controlMean ? variantNames[1] : variantNames[0];
        recommendation = `Statistically significant difference detected (p=${pValue.toFixed(
          4
        )}). Winner: ${winner}`;
      } else {
        recommendation = 'No statistically significant difference detected';
      }
    } else {
      recommendation = `Insufficient data. Need at least ${experiment.minSampleSize} samples per variant.`;
    }

    const results: ABTestResults = {
      experimentId,
      winner,
      confidence: 1 - pValue,
      variantStats,
      statisticalTests: {
        testType: 't-test',
        pValue,
        effectSize,
        confidenceInterval: [0, 0], // Simplified - should calculate CI for difference
      },
      recommendation,
    };

    return results;
  }

  /**
   * Get experiment by ID
   *
   * @param experimentId - Experiment ID
   * @returns Experiment or undefined
   */
  getExperiment(experimentId: string): ABTestExperiment | undefined {
    return this.experiments.get(experimentId);
  }
}
