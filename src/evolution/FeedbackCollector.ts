/**
 * FeedbackCollector
 *
 * Collects feedback from routing decisions and task completion
 * to feed into the Learning Manager for agent evolution
 */

import { LearningManager } from './LearningManager.js';
import { AgentFeedback } from './types.js';
import { AgentType } from '../orchestrator/types.js';

/**
 * Input for routing approval feedback
 */
export interface RoutingApprovalInput {
  taskId: string;
  recommendedAgent: AgentType;
  selectedAgent: AgentType;
  wasOverridden: boolean;
  confidence: number;
}

/**
 * Input for task completion feedback
 */
export interface TaskCompletionInput {
  taskId: string;
  agentId: AgentType;
  success: boolean;
  qualityScore: number;
  durationMs: number;
  userRating?: number;
  userComment?: string;
}

/**
 * Feedback Collector
 *
 * Records user decisions and task outcomes to improve agent routing
 */
export class FeedbackCollector {
  constructor(private learningManager: LearningManager) {}

  /**
   * Record user's response to routing recommendation
   *
   * @param input - Routing approval input
   * @returns Agent feedback
   */
  recordRoutingApproval(input: RoutingApprovalInput): AgentFeedback {
    const {
      taskId,
      recommendedAgent,
      selectedAgent,
      wasOverridden,
      confidence,
    } = input;

    const confidencePercent = Math.round(confidence * 100);

    // Build feedback based on whether recommendation was accepted
    const feedbackType: 'positive' | 'negative' = wasOverridden
      ? 'negative'
      : 'positive';
    const rating = wasOverridden ? 2 : 5;

    const feedbackText = wasOverridden
      ? `User overrode ${recommendedAgent} recommendation (${confidencePercent}% confidence) and selected ${selectedAgent} instead`
      : `User approved ${recommendedAgent} recommendation (${confidencePercent}% confidence)`;

    const suggestions = wasOverridden
      ? [
          `Consider routing similar tasks to ${selectedAgent} instead of ${recommendedAgent}`,
          `Analyze what made ${selectedAgent} more suitable for this task`,
          `Lower confidence threshold for ${recommendedAgent} in similar contexts`,
        ]
      : undefined;

    const feedback: AgentFeedback = {
      id: `feedback-${taskId}-routing`,
      executionId: taskId,
      agentId: recommendedAgent,
      type: feedbackType,
      rating,
      feedback: feedbackText,
      suggestions,
      timestamp: new Date(),
    };

    // Submit to learning manager
    this.learningManager.addFeedback(feedback);

    return feedback;
  }

  /**
   * Record task completion feedback
   *
   * @param input - Task completion input
   * @returns Agent feedback
   */
  recordTaskCompletion(input: TaskCompletionInput): AgentFeedback {
    const {
      taskId,
      agentId,
      success,
      qualityScore,
      durationMs,
      userRating,
      userComment,
    } = input;

    // Determine feedback type
    const feedbackType: 'positive' | 'negative' = success ? 'positive' : 'negative';

    // Determine rating (use user rating if provided, else infer from quality score)
    let rating: number;
    if (userRating !== undefined) {
      rating = userRating;
    } else if (!success) {
      rating = 1;
    } else {
      // Infer from quality score
      if (qualityScore >= 0.9) {
        rating = 5;
      } else if (qualityScore >= 0.8) {
        rating = 4;
      } else if (qualityScore >= 0.7) {
        rating = 3;
      } else if (qualityScore >= 0.5) {
        rating = 2;
      } else {
        rating = 1;
      }
    }

    // Build feedback text
    let feedbackText = success
      ? `Task completed successfully with quality score ${qualityScore.toFixed(2)}`
      : `Task failed with quality score ${qualityScore.toFixed(2)}`;

    if (userComment) {
      feedbackText += ` - ${userComment}`;
    }

    // Identify issues
    const issues: string[] = [];

    if (!success) {
      issues.push('Task failed');
    }

    if (qualityScore < 0.7) {
      issues.push(`Low quality score (${qualityScore.toFixed(2)})`);
    }

    if (durationMs > 30000) {
      issues.push(`Slow execution (${(durationMs / 1000).toFixed(1)}s)`);
    }

    const feedback: AgentFeedback = {
      id: `feedback-${taskId}-completion`,
      executionId: taskId,
      agentId,
      type: feedbackType,
      rating,
      feedback: feedbackText,
      issues: issues.length > 0 ? issues : undefined,
      timestamp: new Date(),
    };

    // Submit to learning manager
    this.learningManager.addFeedback(feedback);

    return feedback;
  }
}
