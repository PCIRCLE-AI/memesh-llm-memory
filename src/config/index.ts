/**
 * 配置管理
 */

import { config } from 'dotenv';
import { z } from 'zod';

// 載入環境變數（覆蓋現有的環境變數）
config({ override: true });

/**
 * 環境變數 Schema 驗證
 */
const envSchema = z.object({
  // Claude API
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-5-20250929'),
  CLAUDE_OPUS_MODEL: z.string().default('claude-opus-4-5-20251101'),

  // OpenAI API - Optional (voice feature removed)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_WHISPER_MODEL: z.string().default('whisper-1'),
  OPENAI_TTS_MODEL: z.string().default('tts-1'),
  OPENAI_TTS_VOICE: z.string().default('alloy'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  OPENAI_CHAT_MODEL: z.string().default('gpt-4-turbo-preview'),
  OPENAI_CODE_MODEL: z.string().default('gpt-4-turbo-preview'),

  // Grok API (xAI) - Optional
  GROK_API_KEY: z.string().optional(),
  GROK_MODEL: z.string().default('grok-beta'),
  GROK_BASE_URL: z.string().default('https://api.x.ai/v1'),

  // Gemini API (Google AI Studio) - Optional
  GOOGLE_API_KEY: z.string().optional(),

  // Quota Limits
  GROK_DAILY_LIMIT: z.string().default('100'),
  GROK_MONTHLY_LIMIT: z.string().default('3000'),
  CHATGPT_DAILY_LIMIT: z.string().default('200'),
  CHATGPT_MONTHLY_LIMIT: z.string().default('6000'),
  CLAUDE_DAILY_LIMIT: z.string().default('150'),
  CLAUDE_MONTHLY_LIMIT: z.string().default('4500'),
  GEMINI_DAILY_LIMIT: z.string().default('10000'),
  GEMINI_MONTHLY_LIMIT: z.string().default('300000'),
  OLLAMA_DAILY_LIMIT: z.string().default('999999'),
  OLLAMA_MONTHLY_LIMIT: z.string().default('999999'),

  // Routing Preferences
  DEFAULT_TEXT_PROVIDER: z.string().default('ollama'),
  DEFAULT_CODE_PROVIDER: z.string().default('ollama'),
  DEFAULT_MULTIMODAL_PROVIDER: z.string().default('gemini'),
  DEFAULT_REASONING_PROVIDER: z.string().default('claude'),
  FALLBACK_PROVIDER: z.string().default('ollama'),

  // ChromaDB
  CHROMA_HOST: z.string().default('localhost'),
  CHROMA_PORT: z.string().default('8000'),
  CHROMA_COLLECTION_NAME: z.string().default('smart_agents_kb'),

  // Orchestrator
  DEFAULT_MODE: z.enum(['cloud', 'hybrid', 'local']).default('cloud'),
  MAX_MEMORY_MB: z.string().default('8000'),
  SIMPLE_TASK_THRESHOLD: z.string().default('100'),

  // Cost Control
  MONTHLY_BUDGET_USD: z.string().default('50'),
  COST_ALERT_THRESHOLD: z.string().default('0.8'),

  // Logging
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  ENABLE_METRICS: z.string().default('true'),
  METRICS_PORT: z.string().default('9090'),

  // Development
  NODE_ENV: z.string().default('development'),
  PORT: z.string().default('3000'),
});

/**
 * 解析並驗證環境變數
 */
export const env = envSchema.parse(process.env);

/**
 * 應用配置
 */
export const appConfig = {
  // Claude
  claude: {
    apiKey: env.ANTHROPIC_API_KEY,
    models: {
      sonnet: env.CLAUDE_MODEL,
      opus: env.CLAUDE_OPUS_MODEL,
    },
  },

  // OpenAI
  openai: {
    apiKey: env.OPENAI_API_KEY,
    whisper: {
      model: env.OPENAI_WHISPER_MODEL,
    },
    tts: {
      model: env.OPENAI_TTS_MODEL,
      voice: env.OPENAI_TTS_VOICE,
    },
    embeddings: {
      model: env.OPENAI_EMBEDDING_MODEL,
    },
    chat: {
      model: env.OPENAI_CHAT_MODEL,
    },
    code: {
      model: env.OPENAI_CODE_MODEL,
    },
  },

  // Grok (xAI)
  grok: {
    apiKey: env.GROK_API_KEY,
    model: env.GROK_MODEL,
    baseURL: env.GROK_BASE_URL,
  },

  // Gemini (Google AI Studio)
  gemini: {
    apiKey: env.GOOGLE_API_KEY,
  },

  // ChromaDB
  chroma: {
    host: env.CHROMA_HOST,
    port: parseInt(env.CHROMA_PORT),
    collectionName: env.CHROMA_COLLECTION_NAME,
    url: `http://${env.CHROMA_HOST}:${env.CHROMA_PORT}`,
  },

  // Quota Limits
  quotaLimits: {
    grok: {
      daily: parseInt(env.GROK_DAILY_LIMIT),
      monthly: parseInt(env.GROK_MONTHLY_LIMIT),
    },
    chatgpt: {
      daily: parseInt(env.CHATGPT_DAILY_LIMIT),
      monthly: parseInt(env.CHATGPT_MONTHLY_LIMIT),
    },
    claude: {
      daily: parseInt(env.CLAUDE_DAILY_LIMIT),
      monthly: parseInt(env.CLAUDE_MONTHLY_LIMIT),
    },
    gemini: {
      daily: parseInt(env.GEMINI_DAILY_LIMIT),
      monthly: parseInt(env.GEMINI_MONTHLY_LIMIT),
    },
    ollama: {
      daily: parseInt(env.OLLAMA_DAILY_LIMIT),
      monthly: parseInt(env.OLLAMA_MONTHLY_LIMIT),
    },
  },

  // Routing Preferences
  routing: {
    defaultProviders: {
      text: env.DEFAULT_TEXT_PROVIDER,
      code: env.DEFAULT_CODE_PROVIDER,
      multimodal: env.DEFAULT_MULTIMODAL_PROVIDER,
      reasoning: env.DEFAULT_REASONING_PROVIDER,
    },
    fallback: env.FALLBACK_PROVIDER,
  },

  // Orchestrator
  orchestrator: {
    mode: env.DEFAULT_MODE,
    maxMemoryMB: parseInt(env.MAX_MEMORY_MB),
    simpleTaskThreshold: parseInt(env.SIMPLE_TASK_THRESHOLD),
  },

  // Cost Control
  costs: {
    monthlyBudget: parseFloat(env.MONTHLY_BUDGET_USD),
    alertThreshold: parseFloat(env.COST_ALERT_THRESHOLD),
  },

  // Logging
  logging: {
    level: env.LOG_LEVEL,
    enableMetrics: env.ENABLE_METRICS === 'true',
    metricsPort: parseInt(env.METRICS_PORT),
  },

  // Server
  server: {
    env: env.NODE_ENV,
    port: parseInt(env.PORT),
  },
} as const;

export default appConfig;