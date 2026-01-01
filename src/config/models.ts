/**
 * AI Model Configuration
 *
 * Configuration for Claude and OpenAI models including model identifiers,
 * pricing information, and model selection utilities.
 *
 * Features:
 * - Claude model family (Sonnet, Opus, Haiku)
 * - OpenAI models (Whisper, TTS, Embeddings)
 * - Cost tracking per model
 * - Automatic model selection by task complexity
 * - TTS voice options
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
 * OpenAI model identifiers
 *
 * Includes speech-to-text, text-to-speech, embeddings, and GPT models.
 */
export const OPENAI_MODELS = {
  /** Whisper - Speech-to-text transcription */
  WHISPER: 'whisper-1',

  /** TTS - Standard quality text-to-speech */
  TTS: 'tts-1',
  /** TTS HD - High-definition text-to-speech */
  TTS_HD: 'tts-1-hd',

  /** Text Embedding 3 Small - Efficient embeddings for semantic search */
  EMBEDDING_SMALL: 'text-embedding-3-small',
  /** Text Embedding 3 Large - High-quality embeddings for complex tasks */
  EMBEDDING_LARGE: 'text-embedding-3-large',

  /** GPT-4 Turbo - Fallback language model */
  GPT4: 'gpt-4-turbo-preview',
  /** GPT-4 Vision - Multimodal model with vision capabilities */
  GPT4_VISION: 'gpt-4-vision-preview',
} as const;

/**
 * Text-to-speech voice options
 *
 * Each voice has distinct characteristics:
 * - ALLOY: Neutral and balanced
 * - ECHO: Clear and articulate
 * - FABLE: Warm and expressive
 * - ONYX: Deep and authoritative
 * - NOVA: Energetic and friendly
 * - SHIMMER: Soft and gentle
 */
export const TTS_VOICES = {
  ALLOY: 'alloy',
  ECHO: 'echo',
  FABLE: 'fable',
  ONYX: 'onyx',
  NOVA: 'nova',
  SHIMMER: 'shimmer',
} as const;

/**
 * Model pricing in USD per 1M tokens
 *
 * Pricing structure varies by model:
 * - Claude: Separate input/output token pricing
 * - Whisper: Price per minute of audio
 * - TTS: Price per 1,000 characters
 * - Embeddings: Price per 1M input tokens
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
  [OPENAI_MODELS.WHISPER]: {
    perMinute: 0.006,
  },
  [OPENAI_MODELS.TTS]: {
    per1KChars: 0.015,
  },
  [OPENAI_MODELS.EMBEDDING_SMALL]: {
    input: 0.02,
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
export type OpenAIModel = typeof OPENAI_MODELS[keyof typeof OPENAI_MODELS];
export type TTSVoice = typeof TTS_VOICES[keyof typeof TTS_VOICES];