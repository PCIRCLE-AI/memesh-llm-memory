/**
 * 配置管理
 */

import { config } from 'dotenv';
import { z } from 'zod';

// 載入環境變數
config();

/**
 * 環境變數 Schema 驗證
 */
const envSchema = z.object({
  // Claude API
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-5-20250929'),
  CLAUDE_OPUS_MODEL: z.string().default('claude-opus-4-5-20251101'),

  // OpenAI API
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_WHISPER_MODEL: z.string().default('whisper-1'),
  OPENAI_TTS_MODEL: z.string().default('tts-1'),
  OPENAI_TTS_VOICE: z.string().default('alloy'),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),

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
  },

  // ChromaDB
  chroma: {
    host: env.CHROMA_HOST,
    port: parseInt(env.CHROMA_PORT),
    collectionName: env.CHROMA_COLLECTION_NAME,
    url: `http://${env.CHROMA_HOST}:${env.CHROMA_PORT}`,
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