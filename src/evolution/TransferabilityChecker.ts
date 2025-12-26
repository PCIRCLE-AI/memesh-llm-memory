// src/evolution/TransferabilityChecker.ts
import type {
  ContextualPattern,
  PatternContext,
  PatternTransferability,
} from './types.js';

/**
 * Pattern Transferability Checker
 *
 * Assesses whether patterns learned by one agent can be applied to another agent
 * based on context similarity and confidence analysis.
 */
export class TransferabilityChecker {
  /**
   * Weights for context similarity calculation
   */
  private readonly WEIGHTS = {
    agent_type: 0.4, // 40%
    task_type: 0.3, // 30%
    complexity: 0.2, // 20%
    config_keys: 0.1, // 10%
  };

  /**
   * Confidence penalty for transferred patterns (reduced confidence)
   */
  private readonly CONFIDENCE_PENALTY = 0.1; // 10%

  /**
   * Calculate context similarity between two contexts using weighted scoring
   *
   * @param context1 - Source context
   * @param context2 - Target context
   * @returns Similarity score (0-1)
   */
  calculateContextSimilarity(context1: PatternContext, context2: PatternContext): number {
    let totalScore = 0;

    // Agent type similarity (40%)
    if (context1.agent_type && context2.agent_type) {
      if (context1.agent_type === context2.agent_type) {
        totalScore += this.WEIGHTS.agent_type;
      }
    }

    // Task type similarity (30%)
    if (context1.task_type && context2.task_type) {
      if (context1.task_type === context2.task_type) {
        totalScore += this.WEIGHTS.task_type;
      }
    }

    // Complexity similarity (20%)
    if (context1.complexity && context2.complexity) {
      if (context1.complexity === context2.complexity) {
        totalScore += this.WEIGHTS.complexity;
      }
    }

    // Config keys similarity (10%) - using Jaccard similarity
    if (context1.config_keys && context2.config_keys) {
      const jaccardSimilarity = this.calculateJaccardSimilarity(
        context1.config_keys,
        context2.config_keys
      );
      totalScore += jaccardSimilarity * this.WEIGHTS.config_keys;
    }

    return totalScore;
  }

  /**
   * Calculate Jaccard similarity between two sets
   *
   * J(A,B) = |A ∩ B| / |A ∪ B|
   *
   * @param set1 - First set
   * @param set2 - Second set
   * @returns Jaccard similarity (0-1)
   */
  private calculateJaccardSimilarity(set1: string[], set2: string[]): number {
    if (set1.length === 0 && set2.length === 0) {
      return 1.0;
    }

    const intersection = set1.filter((item) => set2.includes(item));
    const union = [...new Set([...set1, ...set2])];

    return intersection.length / union.length;
  }

  /**
   * Assess transferability of a pattern from source agent to target agent
   *
   * @param pattern - Source pattern to transfer
   * @param sourceAgentId - Source agent ID
   * @param targetAgentId - Target agent ID
   * @param targetContext - Target agent context
   * @returns Transferability assessment
   */
  assessTransferability(
    pattern: ContextualPattern,
    sourceAgentId: string,
    targetAgentId: string,
    targetContext: PatternContext
  ): PatternTransferability {
    // Calculate context similarity
    const contextSimilarity = this.calculateContextSimilarity(
      pattern.context,
      targetContext
    );

    // Applicability score = context similarity (can be extended with other factors)
    const applicabilityScore = contextSimilarity;

    // Apply confidence penalty for transferred patterns
    const transferredConfidence = pattern.confidence * (1 - this.CONFIDENCE_PENALTY);

    // Generate reasoning based on similarity thresholds
    const reasoning = this.generateReasoning(contextSimilarity, pattern, targetContext);

    return {
      sourceAgentId,
      targetAgentId,
      patternId: pattern.id,
      applicabilityScore,
      contextSimilarity,
      confidence: transferredConfidence,
      reasoning,
    };
  }

  /**
   * Generate human-readable reasoning for transferability assessment
   *
   * @param similarity - Context similarity score
   * @param pattern - Source pattern
   * @param targetContext - Target context
   * @returns Reasoning array
   */
  private generateReasoning(
    similarity: number,
    pattern: ContextualPattern,
    targetContext: PatternContext
  ): string[] {
    const reasoning: string[] = [];

    if (similarity >= 0.8) {
      reasoning.push('High context similarity - pattern likely applicable');
    } else if (similarity >= 0.5) {
      reasoning.push('Moderate context similarity - pattern may need adaptation');
    } else if (similarity >= 0.3) {
      reasoning.push('Low context similarity - transfer not recommended');
    } else {
      reasoning.push('Very low context similarity - contexts incompatible');
    }

    // Add specific context comparison details
    if (pattern.context.agent_type === targetContext.agent_type) {
      reasoning.push('Same agent type');
    } else {
      reasoning.push(`Different agent types: ${pattern.context.agent_type} → ${targetContext.agent_type}`);
    }

    if (pattern.context.task_type === targetContext.task_type) {
      reasoning.push('Same task type');
    } else {
      reasoning.push(`Different task types: ${pattern.context.task_type} → ${targetContext.task_type}`);
    }

    if (pattern.context.complexity === targetContext.complexity) {
      reasoning.push('Same complexity level');
    } else {
      reasoning.push(`Different complexity: ${pattern.context.complexity} → ${targetContext.complexity}`);
    }

    return reasoning;
  }
}
