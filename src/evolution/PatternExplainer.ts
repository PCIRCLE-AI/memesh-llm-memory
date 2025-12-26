/**
 * Pattern Explainer - Generate human-readable explanations for learned patterns (Phase 2)
 *
 * Provides:
 * - Summary generation based on pattern type and context
 * - Reasoning explanation (why pattern was learned)
 * - Actionable recommendations
 * - Confidence interpretation
 */

import type {
  ContextualPattern,
  PatternExplanation,
  PatternContext,
} from './types.js';

export class PatternExplainer {
  // Confidence level thresholds (based on statistical significance conventions)
  private readonly CONFIDENCE_VERY_HIGH = 0.9; // 90%+ = very strong evidence
  private readonly CONFIDENCE_HIGH = 0.75; // 75-90% = strong evidence
  private readonly CONFIDENCE_MODERATE = 0.6; // 60-75% = moderate evidence
  // Below 60% = low confidence (insufficient evidence)

  /**
   * Generate human-readable explanation for a pattern
   *
   * @param pattern The pattern to explain
   * @returns Structured explanation
   */
  explain(pattern: ContextualPattern): PatternExplanation {
    return {
      summary: this.generateSummary(pattern),
      reasoning: this.generateReasoning(pattern),
      recommendation: this.generateRecommendation(pattern),
      confidence_explanation: this.explainConfidence(pattern),
      context_description: this.describeContext(pattern.context),
    };
  }

  /**
   * Format context string with proper grammar
   */
  private formatContextString(context: PatternContext): string {
    if (context.agent_type && context.task_type) {
      return `${context.agent_type} doing ${context.task_type}`;
    } else if (context.agent_type) {
      return context.agent_type;
    } else if (context.task_type) {
      return `${context.task_type} tasks`;
    } else {
      return 'general contexts';
    }
  }

  /**
   * Generate one-line summary
   */
  private generateSummary(pattern: ContextualPattern): string {
    const contextStr = this.formatContextString(pattern.context);

    switch (pattern.type) {
      case 'success':
        return `Successful pattern for ${contextStr}: ${pattern.description}`;

      case 'optimization':
        return `Optimization for ${contextStr}: ${pattern.description}`;

      case 'anti-pattern':
        return `Pattern to avoid for ${contextStr}: ${pattern.description}`;

      case 'failure':
        return `Failure pattern for ${contextStr}: ${pattern.description}`;

      default:
        return `Pattern for ${contextStr}: ${pattern.description}`;
    }
  }

  /**
   * Generate detailed reasoning
   */
  private generateReasoning(pattern: ContextualPattern): string[] {
    const reasoning: string[] = [];

    // Observation frequency
    reasoning.push(
      `This pattern was observed ${pattern.observations} times in similar contexts`
    );

    // Confidence explanation
    const confidencePercent = Math.round(pattern.confidence * 100);
    reasoning.push(
      `Pattern has ${confidencePercent}% confidence based on consistency across observations`
    );

    // Success rate (if available and relevant)
    if (pattern.success_rate !== undefined && pattern.success_rate > 0) {
      const successPercent = Math.round(pattern.success_rate * 100);
      reasoning.push(
        `Historical success rate: ${successPercent}% when this pattern was applied`
      );
    }

    // Performance impact
    if (pattern.avg_execution_time !== undefined && pattern.avg_execution_time > 0) {
      reasoning.push(
        `Average execution time: ${pattern.avg_execution_time}ms`
      );
    }

    // Complexity context
    if (pattern.context.complexity) {
      reasoning.push(
        `Most effective for ${pattern.context.complexity} complexity tasks`
      );
    }

    return reasoning;
  }

  /**
   * Generate actionable recommendation
   */
  private generateRecommendation(pattern: ContextualPattern): string {
    const context = this.describeContext(pattern.context);

    switch (pattern.type) {
      case 'success':
        return `Consider applying this pattern when ${context}. Expected benefits: improved success rate and efficiency.`;

      case 'optimization':
        return `Apply this optimization when ${context} to improve performance metrics.`;

      case 'anti-pattern':
        return `Avoid this approach when ${context}. Consider alternative strategies to prevent failures.`;

      case 'failure':
        return `Be aware of this failure mode when ${context}. Implement safeguards or fallback mechanisms.`;

      default:
        return `Monitor this pattern when ${context} and evaluate its effectiveness.`;
    }
  }

  /**
   * Explain confidence level
   */
  private explainConfidence(pattern: ContextualPattern): string {
    const percent = Math.round(pattern.confidence * 100);
    const observations = pattern.observations;

    let interpretation: string;

    if (pattern.confidence >= this.CONFIDENCE_VERY_HIGH) {
      interpretation = 'Very high confidence';
    } else if (pattern.confidence >= this.CONFIDENCE_HIGH) {
      interpretation = 'High confidence';
    } else if (pattern.confidence >= this.CONFIDENCE_MODERATE) {
      interpretation = 'Moderate confidence';
    } else {
      interpretation = 'Low confidence';
    }

    return `${interpretation} (${percent}%) based on ${observations} consistent observations`;
  }

  /**
   * Describe context in natural language
   */
  private describeContext(context: PatternContext): string {
    const parts: string[] = [];

    if (context.agent_type) {
      parts.push(`agent is ${context.agent_type}`);
    }

    if (context.task_type) {
      parts.push(`task is ${context.task_type}`);
    }

    if (context.complexity) {
      parts.push(`complexity is ${context.complexity}`);
    }

    if (context.config_keys && context.config_keys.length > 0) {
      parts.push(`using configuration: ${context.config_keys.join(', ')}`);
    }

    if (parts.length === 0) {
      return 'in general contexts';
    }

    return parts.join(' and ');
  }
}
