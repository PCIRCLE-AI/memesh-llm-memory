/**
 * FeedbackCollector - Simplified
 *
 * Stores and retrieves AI mistake records.
 * Intelligence (mistake detection, pattern analysis) delegated to LLM via MCP tool descriptions.
 *
 * Features:
 * - Store AI mistake records
 * - Retrieve mistakes with filtering
 * - In-memory storage for current session
 *
 * Removed (delegated to LLM):
 * - Automatic mistake detection from user messages
 * - Routing approval feedback (system removed)
 * - Task completion feedback (system removed)
 * - Conversation history tracking
 */

import { AIMistake, AIErrorType } from './types.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Feedback Collector - Simplified
 *
 * Intelligence delegated to LLM:
 * - Mistake detection → LLM identifies when user corrects behavior
 * - Pattern analysis → LLM analyzes mistake patterns
 * - Prevention strategy → LLM creates prevention rules
 */
export class FeedbackCollector {
  private mistakes: AIMistake[] = [];

  constructor() {
    // Simplified constructor - no dependencies needed
  }

  /**
   * Record a mistake made by the main AI
   *
   * This is called when the user corrects the AI's behavior,
   * allowing the system to learn from mistakes and prevent recurrence.
   *
   * LLM should detect user corrections and call this method.
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

    // Mistakes are stored in-memory for the current session
    // This aligns with simplified architecture - no complex persistence needed

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
}
