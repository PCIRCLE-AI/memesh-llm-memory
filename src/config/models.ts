/**
 * AI Model Configuration
 *
 * Configuration for Claude models including model identifiers,
 * pricing information, and model selection utilities.
 *
 * Features:
 * - Claude model family (Sonnet, Opus, Haiku)
 * - Cost tracking per model
 * - Automatic model selection by task complexity
 *
 * @example
 * ```typescript
 * import { CLAUDE_MODELS, selectClaudeModel, MODEL_COSTS } from './models.js';
 *
 * // Use specific model
 * const model = CLAUDE_MODELS.SONNET_4_5;
 *
 * // Auto-select by complexity
 * const selectedModel = selectClaudeModel('complex'); // Returns Opus
 *
 * // Get pricing
 * const cost = MODEL_COSTS[CLAUDE_MODELS.SONNET_4_5];
 * console.log(`Input: $${cost.input}/1M tokens`);
 * ```
 */

/**
 * Claude model identifiers
 *
 * Model selection guide:
 * - SONNET: Primary model for daily development and code generation
 * - OPUS: Complex tasks requiring deep reasoning and creative writing
 * - HAIKU: Fast responses for simple tasks
 */
export const CLAUDE_MODELS = {
  /** Claude 3 Sonnet (legacy) */
  SONNET: 'claude-3-sonnet-20240229',
  /** Claude Sonnet 4.5 - Primary model for daily development and code generation */
  SONNET_4_5: 'claude-sonnet-4-5-20250929',

  /** Claude 3 Opus (legacy) */
  OPUS: 'claude-3-opus-20240229',
  /** Claude Opus 4.5 - Complex tasks requiring deep reasoning and creative writing */
  OPUS_4_5: 'claude-opus-4-5-20251101',

  /** Claude 3 Haiku (legacy) */
  HAIKU: 'claude-3-haiku-20240307',
  /** Claude 3.5 Haiku - Fast responses for simple tasks */
  HAIKU_3_5: 'claude-3-5-haiku-20241022',
  /** Claude Haiku 4 - Latest fast model */
  HAIKU_4: 'claude-haiku-4-20250514',
} as const;


/**
 * Model pricing in USD per 1M tokens
 *
 * Pricing structure varies by model:
 * - Claude: Separate input/output token pricing
 *
 * @example
 * ```typescript
 * import { MODEL_COSTS, CLAUDE_MODELS } from './models.js';
 *
 * const cost = MODEL_COSTS[CLAUDE_MODELS.SONNET_4_5];
 * const inputCost = (1000 / 1_000_000) * cost.input;  // Cost for 1000 input tokens
 * const outputCost = (500 / 1_000_000) * cost.output; // Cost for 500 output tokens
 * console.log(`Total: $${(inputCost + outputCost).toFixed(6)}`);
 * ```
 */
export const MODEL_COSTS = {
  [CLAUDE_MODELS.SONNET]: {
    input: 3.0,   // Claude 3 Sonnet pricing
    output: 15.0,
  },
  [CLAUDE_MODELS.SONNET_4_5]: {
    input: 3.0,   // Claude Sonnet 4.5 pricing
    output: 15.0,
  },
  [CLAUDE_MODELS.OPUS]: {
    input: 15.0,  // Claude 3 Opus pricing
    output: 75.0,
  },
  [CLAUDE_MODELS.OPUS_4_5]: {
    input: 15.0,  // Claude Opus 4.5 pricing
    output: 75.0,
  },
  [CLAUDE_MODELS.HAIKU]: {
    input: 0.25,  // Claude 3 Haiku pricing
    output: 1.25,
  },
  [CLAUDE_MODELS.HAIKU_3_5]: {
    input: 0.80,  // Claude 3.5 Haiku pricing
    output: 4.0,
  },
  [CLAUDE_MODELS.HAIKU_4]: {
    input: 0.80,  // Claude Haiku 4 pricing
    output: 4.0,
  },
} as const;

/**
 * 根據任務複雜度選擇模型
 */
export function selectClaudeModel(complexity: 'simple' | 'medium' | 'complex'): string {
  switch (complexity) {
    case 'simple':
      return CLAUDE_MODELS.HAIKU;
    case 'medium':
      return CLAUDE_MODELS.SONNET;
    case 'complex':
      return CLAUDE_MODELS.OPUS;
    default:
      return CLAUDE_MODELS.SONNET;
  }
}

export type ClaudeModel = typeof CLAUDE_MODELS[keyof typeof CLAUDE_MODELS];
