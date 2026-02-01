/**
 * Buddy Record Mistake Handler
 *
 * Allows users to record AI mistakes for learning and prevention.
 * This enables the "learn from feedback" feature promised in README.
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { FeedbackCollector } from '../../evolution/FeedbackCollector.js';
import { AIErrorType } from '../../evolution/types.js';
import { logger } from '../../utils/logger.js';

export interface BuddyRecordMistakeInput {
  /** What action the AI took (the mistake) */
  action: string;

  /** Error classification */
  errorType: AIErrorType;

  /** User's correction/feedback */
  userCorrection: string;

  /** What should have been done instead */
  correctMethod: string;

  /** Impact of the mistake */
  impact: string;

  /** How to prevent this in the future */
  preventionMethod: string;

  /** Related rule/guideline (optional) */
  relatedRule?: string;

  /** Additional context (optional) */
  context?: Record<string, unknown>;
}

/**
 * Handle buddy-record-mistake tool call
 *
 * Records a mistake made by the AI for learning and prevention.
 * This is the core of the "learn from feedback" feature.
 *
 * @param input - Mistake details
 * @param feedbackCollector - Feedback collector instance
 * @returns Tool result with recorded mistake details
 */
export async function handleBuddyRecordMistake(
  input: BuddyRecordMistakeInput,
  feedbackCollector: FeedbackCollector
): Promise<CallToolResult> {
  try {
    logger.info('Recording AI mistake', {
      action: input.action,
      errorType: input.errorType,
    });

    // Record the mistake
    const mistake = feedbackCollector.recordAIMistake({
      action: input.action,
      errorType: input.errorType,
      userCorrection: input.userCorrection,
      correctMethod: input.correctMethod,
      impact: input.impact,
      preventionMethod: input.preventionMethod,
      relatedRule: input.relatedRule,
      context: input.context,
    });

    // Format response
    const response = {
      success: true,
      mistakeId: mistake.id,
      message: 'Mistake recorded successfully',
      details: {
        action: mistake.action,
        errorType: mistake.errorType,
        userCorrection: mistake.userCorrection,
        correctMethod: mistake.correctMethod,
        impact: mistake.impact,
        preventionMethod: mistake.preventionMethod,
        timestamp: mistake.timestamp.toISOString(),
      },
    };

    logger.info('AI mistake recorded', {
      mistakeId: mistake.id,
      errorType: mistake.errorType,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    logger.error('Failed to record AI mistake', {
      error: errorMessage,
      input,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: false,
              error: errorMessage,
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }
}
