/**
 * FeedbackCollector
 *
 * Collects feedback from routing decisions and task completion
 * to feed into the Learning Manager for agent evolution
 *
 * Also tracks main AI mistakes for learning and prevention.
 * Now with automatic mistake detection (multi-language support).
 */

import { LearningManager } from './LearningManager.js';
import { AgentFeedback, AIMistake, AIErrorType } from './types.js';
import { AgentType } from '../orchestrator/types.js';
import { v4 as uuidv4 } from 'uuid';
import { LocalMistakeDetector, type Message, type CorrectionDetection } from './LocalMistakeDetector.js';
import { CloudEvolutionClient, type AdvancedMistakeDetection } from './CloudEvolutionClient.js';
import { logger } from '../utils/logger.js';

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
 * Feedback Collector Configuration
 */
export interface FeedbackCollectorConfig {
  /** Cloud API key for advanced detection (optional, paid feature) */
  cloudApiKey?: string;
  /** Enable automatic mistake detection from user messages */
  enableAutoDetection?: boolean;
}

/**
 * Feedback Collector
 *
 * Records user decisions and task outcomes to improve agent routing.
 * Also tracks main AI mistakes for learning and prevention.
 *
 * NEW: Automatic mistake detection from user corrections.
 */
export class FeedbackCollector {
  private mistakes: AIMistake[] = [];
  private conversationHistory: Message[] = [];

  // Mistake detection (local + optional cloud)
  private mistakeDetector: LocalMistakeDetector;
  private cloudClient: CloudEvolutionClient | null = null;

  // Configuration
  private enableAutoDetection: boolean;

  constructor(
    private learningManager: LearningManager,
    config: FeedbackCollectorConfig = {}
  ) {
    this.mistakeDetector = new LocalMistakeDetector();
    this.enableAutoDetection = config.enableAutoDetection ?? true;

    // Initialize cloud client if API key provided (paid feature)
    if (config.cloudApiKey) {
      this.cloudClient = new CloudEvolutionClient({
        apiKey: config.cloudApiKey,
      });
      logger.info('FeedbackCollector: Cloud Evolution enabled (paid tier)');
    } else {
      logger.info('FeedbackCollector: Running in free tier (local detection only)');
    }
  }

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

  /**
   * Record a mistake made by the main AI
   *
   * This is called when the user corrects the AI's behavior,
   * allowing the system to learn from mistakes and prevent recurrence.
   *
   * @param input - Mistake details
   * @returns Recorded mistake
   *
   * @example
   * ```typescript
   * feedbackCollector.recordAIMistake({
   *   action: "Manual npm publish",
   *   errorType: AIErrorType.PROCEDURE_VIOLATION,
   *   userCorrection: "Use GitHub Release to trigger auto-publish",
   *   correctMethod: "Create GitHub Release → Actions auto-publish to npm",
   *   impact: "Broke automated workflow, caused Actions failure",
   *   preventionMethod: "Run pre-deployment-check.sh before any release",
   *   relatedRule: "responsible-deployment-workflow skill"
   * });
   * ```
   */
  recordAIMistake(input: {
    action: string;
    errorType: AIErrorType;
    userCorrection: string;
    correctMethod: string;
    impact: string;
    preventionMethod: string;
    relatedRule?: string;
    context?: Record<string, unknown>;
  }): AIMistake {
    const mistake: AIMistake = {
      id: uuidv4(),
      timestamp: new Date(),
      action: input.action,
      errorType: input.errorType,
      userCorrection: input.userCorrection,
      correctMethod: input.correctMethod,
      impact: input.impact,
      preventionMethod: input.preventionMethod,
      relatedRule: input.relatedRule,
      context: input.context,
    };

    this.mistakes.push(mistake);

    // TODO: Store to persistent storage (Evolution system)
    // For now, just keep in memory

    return mistake;
  }

  /**
   * Get all recorded mistakes
   *
   * @returns Array of all mistakes
   */
  getMistakes(): AIMistake[] {
    return [...this.mistakes];
  }

  /**
   * Get mistakes by error type
   *
   * @param errorType - Error type to filter by
   * @returns Filtered mistakes
   */
  getMistakesByType(errorType: AIErrorType): AIMistake[] {
    return this.mistakes.filter((m) => m.errorType === errorType);
  }

  /**
   * Get recent mistakes (last N)
   *
   * @param count - Number of recent mistakes to return
   * @returns Recent mistakes, newest first
   */
  getRecentMistakes(count: number = 10): AIMistake[] {
    return this.mistakes
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count);
  }

  // ============================================
  // NEW: Automatic Mistake Detection
  // ============================================

  /**
   * Process user message and automatically detect corrections
   *
   * This is the main entry point for auto-detection.
   * Should be called for every user message in the conversation.
   *
   * @param userMessage - The user's message
   * @param aiPreviousAction - What the AI just did (for context)
   * @param context - Additional context (task type, project, etc.)
   * @returns Detection result (null if not a correction)
   */
  async processUserMessage(
    userMessage: string,
    aiPreviousAction?: string,
    context?: Record<string, unknown>
  ): Promise<CorrectionDetection | AdvancedMistakeDetection | null> {
    if (!this.enableAutoDetection) {
      return null;
    }

    // Add to conversation history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    });

    // Keep only last 10 messages (context window)
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }

    // Try cloud detection first (if available)
    if (this.cloudClient) {
      try {
        const detection = await this.cloudClient.detectCorrectionAdvanced(
          userMessage,
          this.conversationHistory
        );

        if (detection.isCorrection && detection.confidence >= 0.6) {
          logger.info('Cloud mistake detection triggered', {
            confidence: detection.confidence,
            language: detection.language,
          });

          // Auto-record mistake if detection is confident enough
          await this.autoRecordMistake(detection, aiPreviousAction, context);
          return detection;
        }
      } catch (error) {
        logger.warn('Cloud detection failed, falling back to local', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        // Fall through to local detection
      }
    }

    // Local detection (free tier)
    const detection = this.mistakeDetector.detectCorrectionWithContext(
      userMessage,
      this.conversationHistory
    );

    if (detection.isCorrection && detection.confidence >= 0.6) {
      logger.info('Local mistake detection triggered', {
        confidence: detection.confidence,
        language: detection.language,
      });

      // Auto-record mistake
      await this.autoRecordMistake(detection, aiPreviousAction, context);
      return detection;
    }

    return null;
  }

  /**
   * Record AI assistant message to conversation history
   *
   * @param assistantMessage - What the AI said/did
   */
  recordAssistantMessage(assistantMessage: string): void {
    this.conversationHistory.push({
      role: 'assistant',
      content: assistantMessage,
      timestamp: new Date(),
    });

    // Keep only last 10 messages
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }
  }

  /**
   * Automatically record a detected mistake
   *
   * @param detection - Detection result
   * @param aiAction - What the AI did (that was wrong)
   * @param context - Additional context
   */
  private async autoRecordMistake(
    detection: CorrectionDetection | AdvancedMistakeDetection,
    aiAction?: string,
    context?: Record<string, unknown>
  ): Promise<AIMistake> {
    // Determine error type
    let errorType: AIErrorType;
    if ('errorType' in detection && detection.errorType) {
      errorType = detection.errorType;
    } else {
      // Fallback to generic assumption error
      errorType = AIErrorType.ASSUMPTION_ERROR;
    }

    // Build mistake record
    const mistake: AIMistake = {
      id: uuidv4(),
      timestamp: new Date(),
      action: aiAction || detection.wrongAction || 'Unknown action',
      errorType,
      userCorrection: `User correction detected (confidence: ${(detection.confidence * 100).toFixed(0)}%)`,
      correctMethod: detection.correctMethod || 'User indicated different approach',
      impact: 'errorType' in detection && detection.impact
        ? detection.impact
        : 'User had to correct AI behavior',
      preventionMethod: 'errorType' in detection && detection.preventionMethod
        ? detection.preventionMethod
        : 'Review this pattern to avoid recurrence',
      relatedRule: 'errorType' in detection ? detection.relatedRule : undefined,
      context: {
        ...context,
        detectedLanguage: detection.language,
        detectionConfidence: detection.confidence,
        detectionMethod: this.cloudClient ? 'cloud' : 'local',
      },
    };

    this.mistakes.push(mistake);

    logger.info('Auto-recorded AI mistake', {
      id: mistake.id,
      errorType: mistake.errorType,
      confidence: detection.confidence,
    });

    // TODO: Store to persistent storage

    return mistake;
  }

  /**
   * Get conversation history (for debugging)
   */
  getConversationHistory(): Message[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearConversationHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Check if cloud evolution is enabled
   */
  isCloudEnabled(): boolean {
    return this.cloudClient !== null;
  }
}
