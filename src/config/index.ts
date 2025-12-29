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
  // Claude API (primary provider)
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-5-20250929'),
  CLAUDE_OPUS_MODEL: z.string().default('claude-opus-4-5-20251101'),

  // OpenAI API (for RAG embeddings only)
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),

  // Quota Limits
  CLAUDE_DAILY_LIMIT: z.string().default('150'),
  CLAUDE_MONTHLY_LIMIT: z.string().default('4500'),

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

  // Orchestrator Configuration
  ORCHESTRATOR_MODE: z.enum(['local', 'distributed']).default('local'),
  ORCHESTRATOR_MAX_MEMORY_MB: z.string().default('2048'),
});

/**
 * 解析並驗證環境變數
 */
export const env = envSchema.parse(process.env);

/**
 * 應用配置
 */
export const appConfig = {
  // Claude (primary provider)
  claude: {
    apiKey: env.ANTHROPIC_API_KEY,
    models: {
      sonnet: env.CLAUDE_MODEL,
      opus: env.CLAUDE_OPUS_MODEL,
    },
  },

  // OpenAI (for RAG embeddings only)
  openai: {
    apiKey: env.OPENAI_API_KEY,
    embeddings: {
      model: env.OPENAI_EMBEDDING_MODEL,
    },
  },

  // Quota Limits
  quotaLimits: {
    claude: {
      daily: parseInt(env.CLAUDE_DAILY_LIMIT),
      monthly: parseInt(env.CLAUDE_MONTHLY_LIMIT),
    },
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

  // Orchestrator
  orchestrator: {
    mode: env.ORCHESTRATOR_MODE,
    maxMemoryMB: parseInt(env.ORCHESTRATOR_MAX_MEMORY_MB),
  },
} as const;

export default appConfig;