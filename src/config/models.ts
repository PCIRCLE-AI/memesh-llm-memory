/**
 * AI 模型配置
 * 支援 Claude Sonnet 4.5 和 Opus 4.5
 */

export const CLAUDE_MODELS = {
  // 主力模型 - 日常開發和代碼生成
  SONNET: 'claude-3-sonnet-20240229',
  SONNET_4_5: 'claude-sonnet-4-5-20250929',

  // 複雜任務專用 - 深度推理和創意寫作
  OPUS: 'claude-3-opus-20240229',
  OPUS_4_5: 'claude-opus-4-5-20251101',

  // 快速響應 - 簡單任務
  HAIKU: 'claude-3-haiku-20240307',
  HAIKU_3_5: 'claude-3-5-haiku-20241022',
  HAIKU_4: 'claude-haiku-4-20250514',
} as const;

export const OPENAI_MODELS = {
  // 語音轉文字
  WHISPER: 'whisper-1',

  // 文字轉語音
  TTS: 'tts-1',
  TTS_HD: 'tts-1-hd',

  // Embeddings
  EMBEDDING_SMALL: 'text-embedding-3-small',
  EMBEDDING_LARGE: 'text-embedding-3-large',

  // GPT (備選)
  GPT4: 'gpt-4-turbo-preview',
  GPT4_VISION: 'gpt-4-vision-preview',
} as const;

export const TTS_VOICES = {
  ALLOY: 'alloy',
  ECHO: 'echo',
  FABLE: 'fable',
  ONYX: 'onyx',
  NOVA: 'nova',
  SHIMMER: 'shimmer',
} as const;

/**
 * 模型成本 (USD per 1M tokens)
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