/**
 * Multi-Objective Optimizer - Pareto optimization for performance metrics (Phase 2)
 *
 * Implements:
 * - Pareto front identification (non-dominated solutions)
 * - Weighted selection (scalarization)
 * - Domination checking
 */

import { logger } from '../utils/logger.js';
import type {
  OptimizationCandidate,
  OptimizationObjectives,
} from './types.js';

export class MultiObjectiveOptimizer {
  /**
   * Check if candidate1 dominates candidate2
   *
   * Domination criteria:
   * - All objectives of c1 >= c2
   * - At least one objective of c1 > c2
   *
   * @param c1 First candidate
   * @param c2 Second candidate
   * @returns true if c1 dominates c2
   */
  dominates(c1: OptimizationCandidate, c2: OptimizationCandidate): boolean {
    const keys = this.getCommonObjectiveKeys(c1.objectives, c2.objectives);

    if (keys.length === 0) {
      // No common objectives = cannot compare
      logger.warn('[MultiObjectiveOptimizer] No common objectives for domination check', {
        c1Keys: Object.keys(c1.objectives),
        c2Keys: Object.keys(c2.objectives),
      });
      return false;
    }

    let atLeastOneBetter = false;
    for (const key of keys) {
      const val1 = c1.objectives[key] ?? 0;
      const val2 = c2.objectives[key] ?? 0;

      // Skip invalid values
      if (!Number.isFinite(val1) || !Number.isFinite(val2)) {
        logger.warn('[MultiObjectiveOptimizer] Non-finite objective value detected', { key, val1, val2 });
        continue;
      }

      if (val1 < val2) {
        // c1 is worse in this objective
        return false;
      }

      if (val1 > val2) {
        atLeastOneBetter = true;
      }
    }

    return atLeastOneBetter;
  }

  /**
   * Find Pareto front (non-dominated solutions)
   *
   * Edge cases:
   * - Empty candidates: returns []
   * - All identical objectives: returns all candidates
   * - Single candidate: returns [candidate]
   *
   * @param candidates List of candidates
   * @returns Pareto-optimal candidates
   */
  findParetoFront(
    candidates: OptimizationCandidate[]
  ): OptimizationCandidate[] {
    if (candidates.length === 0) {
      return [];
    }

    if (candidates.length === 1) {
      return candidates;
    }

    const paretoFront: OptimizationCandidate[] = [];

    for (const candidate of candidates) {
      let isDominated = false;

      // Check if this candidate is dominated by any existing Pareto member
      for (const paretoMember of paretoFront) {
        if (this.dominates(paretoMember, candidate)) {
          isDominated = true;
          break;
        }
      }

      if (!isDominated) {
        // Remove any Pareto members dominated by this candidate, then add candidate
        const filtered = paretoFront.filter(member => !this.dominates(candidate, member));
        paretoFront.length = 0;
        paretoFront.push(...filtered, candidate);
      }
    }

    return paretoFront;
  }

  /**
   * Select best candidate based on weighted sum
   *
   * @param candidates List of candidates
   * @param weights Objective weights (should sum to 1.0)
   * @returns Best candidate or undefined
   */
  selectBest(
    candidates: OptimizationCandidate[],
    weights: OptimizationObjectives
  ): OptimizationCandidate | undefined {
    if (candidates.length === 0) {
      return undefined;
    }

    // Validate weights - must be finite, non-negative numbers
    const weightValues = Object.values(weights).filter(v => v !== undefined) as number[];
    if (weightValues.length === 0) {
      logger.warn('[MultiObjectiveOptimizer] No valid weights provided');
      return undefined;
    }

    for (const [key, value] of Object.entries(weights)) {
      if (value === undefined) continue;

      if (!Number.isFinite(value)) {
        logger.error('[MultiObjectiveOptimizer] Weight must be finite', {
          objective: key,
          value
        });
        return undefined;
      }

      if (value < 0 || value > 1) {
        logger.error('[MultiObjectiveOptimizer] Weight must be between 0 and 1', {
          objective: key,
          value,
          constraint: '0 <= weight <= 1'
        });
        return undefined;
      }
    }

    let bestCandidate: OptimizationCandidate | undefined;
    let bestScore = -Infinity;

    for (const candidate of candidates) {
      const score = this.computeWeightedScore(candidate.objectives, weights);

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }

  /**
   * Compute weighted sum of objectives
   *
   * @param objectives Objective values
   * @param weights Weights for each objective
   * @returns Weighted score
   */
  private computeWeightedScore(
    objectives: OptimizationObjectives,
    weights: OptimizationObjectives
  ): number {
    let score = 0;

    for (const key in weights) {
      const weight = weights[key] ?? 0;
      const value = objectives[key] ?? 0;
      score += weight * value;
    }

    return score;
  }

  /**
   * Get common objective keys between two objective sets
   *
   * @param obj1 First objectives
   * @param obj2 Second objectives
   * @returns Common keys
   */
  private getCommonObjectiveKeys(
    obj1: OptimizationObjectives,
    obj2: OptimizationObjectives
  ): string[] {
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    return keys1.filter((key) => keys2.includes(key));
  }
}
