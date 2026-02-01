/**
 * Buddy Record Mistake Handler
 *
 * Phase 0.7.0 CRITICAL FIX - Fatal Flaw #1
 *
 * Previously: Mistakes stored to FeedbackCollector (separate from KnowledgeGraph)
 * Now: Mistakes stored to UnifiedMemoryStore + auto-extract PreventionRule + UserPreference
 *
 * This enables the "learn from feedback" feature promised in README.
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { UnifiedMemoryStore } from '../../memory/UnifiedMemoryStore.js';
import { MistakePatternEngine } from '../../memory/MistakePatternEngine.js';
import { UserPreferenceEngine } from '../../memory/UserPreferenceEngine.js';
import { AIErrorType } from '../../evolution/types.js';
import type { UnifiedMemory } from '../../memory/types/unified-memory.js';
import { t } from '../../i18n/index.js';
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
 * Calculate importance score based on error type and context
 *
 * @param errorType - The type of error
 * @param context - Optional context with severity
 * @returns Importance score (0-1)
 */
function calculateImportance(
  errorType: AIErrorType,
  context?: Record<string, unknown>
): number {
  // Base importance by error type
  const errorTypeImportance: Record<AIErrorType, number> = {
    [AIErrorType.PROCEDURE_VIOLATION]: 0.8,
    [AIErrorType.WORKFLOW_SKIP]: 0.7,
    [AIErrorType.ASSUMPTION_ERROR]: 0.75,
    [AIErrorType.VALIDATION_SKIP]: 0.8,
    [AIErrorType.RESPONSIBILITY_LACK]: 0.6,
    [AIErrorType.FIREFIGHTING]: 0.5,
    [AIErrorType.DEPENDENCY_MISS]: 0.65,
    [AIErrorType.INTEGRATION_ERROR]: 0.7,
    [AIErrorType.DEPLOYMENT_ERROR]: 0.9,
  };

  let importance = errorTypeImportance[errorType] || 0.6;

  // Adjust based on context severity if provided
  if (context?.severity) {
    switch (context.severity) {
      case 'critical':
        importance = Math.max(importance, 0.95);
        break;
      case 'high':
        importance = Math.max(importance, 0.8);
        break;
      case 'medium':
        importance = Math.max(importance, 0.6);
        break;
      case 'low':
        importance = Math.max(importance, 0.4);
        break;
    }
  }

  return Math.min(importance, 1);
}

/**
 * Build content string from mistake input
 *
 * @param input - The mistake input
 * @returns Formatted content string
 */
function buildMistakeContent(input: BuddyRecordMistakeInput): string {
  const parts = [
    `Action: ${input.action}`,
    `Correction: ${input.userCorrection}`,
    `Correct Method: ${input.correctMethod}`,
    `Impact: ${input.impact}`,
    `Prevention: ${input.preventionMethod}`,
  ];

  if (input.relatedRule) {
    parts.push(`Related Rule: ${input.relatedRule}`);
  }

  return parts.join(' | ');
}

/**
 * Handle buddy-record-mistake tool call
 *
 * Records a mistake made by the AI for learning and prevention.
 * This is the core of the "learn from feedback" feature.
 *
 * Phase 0.7.0 Changes:
 * - Stores to UnifiedMemoryStore (not FeedbackCollector)
 * - Intelligence (pattern extraction, preference extraction) delegated to LLM via MCP tool descriptions
 *
 * @param input - Mistake details
 * @param unifiedStore - Unified memory store instance
 * @param patternEngine - Pattern storage engine (simplified, no extraction)
 * @param preferenceEngine - Preference storage engine (simplified, no extraction)
 * @returns Tool result with recorded mistake details
 */
export async function handleBuddyRecordMistake(
  input: BuddyRecordMistakeInput,
  unifiedStore: UnifiedMemoryStore,
  patternEngine: MistakePatternEngine,
  preferenceEngine: UserPreferenceEngine
): Promise<CallToolResult> {
  try {
    // Validate required fields
    const requiredFields = {
      action: input.action,
      errorType: input.errorType,
      userCorrection: input.userCorrection,
      correctMethod: input.correctMethod,
      impact: input.impact,
      preventionMethod: input.preventionMethod,
    };

    const missingFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }

    logger.info('[BuddyRecordMistake] Recording AI mistake', {
      action: input.action,
      errorType: input.errorType,
    });

    // 1. Store mistake to UnifiedMemoryStore
    const memory: UnifiedMemory = {
      type: 'mistake',
      content: buildMistakeContent(input),
      context: `Error Type: ${input.errorType}`,
      tags: [
        'mistake',
        input.errorType,
        ...(input.context?.category ? [String(input.context.category)] : []),
      ],
      importance: calculateImportance(input.errorType, input.context),
      timestamp: new Date(),
      metadata: {
        action: input.action,
        errorType: input.errorType,
        userCorrection: input.userCorrection,
        correctMethod: input.correctMethod,
        impact: input.impact,
        preventionMethod: input.preventionMethod,
        relatedRule: input.relatedRule,
        context: input.context,
      },
    };

    const projectPath = process.cwd();
    const memoryId = await unifiedStore.store(memory, { projectPath });

    logger.info('[BuddyRecordMistake] Mistake stored to UnifiedMemoryStore', {
      memoryId,
      errorType: input.errorType,
    });

    // 2. Pattern extraction and preference extraction delegated to LLM
    // LLM will analyze stored mistakes via buddy-remember and create rules/preferences as needed

    // Format detailed response
    const detailedResponse = formatDetailedResponse(memoryId, input);

    logger.info('[BuddyRecordMistake] AI mistake recorded successfully', {
      memoryId,
    });

    return {
      content: [
        {
          type: 'text',
          text: detailedResponse,
        },
      ],
      isError: false,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    logger.error('[BuddyRecordMistake] Failed to record AI mistake', {
      error: errorMessage,
      input,
    });

    return {
      content: [
        {
          type: 'text',
          text: t('ccb.mistake.error', { message: errorMessage }),
        },
      ],
      isError: true,
    };
  }
}

/**
 * Format a detailed response for the recorded mistake
 */
function formatDetailedResponse(
  memoryId: string,
  input: BuddyRecordMistakeInput
): string {
  const lines: string[] = [
    '**CCB Mistake Recorded**',
    '',
    `Memory ID: \`${memoryId}\``,
    `Error Type: ${input.errorType}`,
    '',
    '**What was recorded:**',
    `- Action: ${input.action}`,
    `- Correction: ${input.userCorrection}`,
    `- Prevention: ${input.preventionMethod}`,
    '',
    '**Next Steps:**',
    '- This mistake is now searchable via `buddy-remember`',
    '- Analyze patterns across multiple mistakes to identify trends',
    '- Create prevention rules or preferences as needed based on patterns',
    '- Use stored mistakes to inform future behavior',
  ];

  return lines.join('\n');
}
