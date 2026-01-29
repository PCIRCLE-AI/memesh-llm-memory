/**
 * 配置管理
 */

import { config } from 'dotenv';
import { z } from 'zod';
import { ConfigurationError } from '../errors/index.js';

// 載入環境變數（覆蓋現有的環境變數）
config({ override: true });

/**
 * 環境變數 Schema 驗證
 */
const envSchema = z.object({
  // MCP Server Mode (default: true - designed for Claude Code MCP integration)
  // When true, ANTHROPIC_API_KEY is not required (Claude Code manages authentication)
  MCP_SERVER_MODE: z.string().default('true').transform(val => val === 'true'),

  // Claude API (primary provider - optional in MCP server mode)
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default('claude-sonnet-4-5-20250929'),
  CLAUDE_OPUS_MODEL: z.string().default('claude-opus-4-5-20251101'),

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
  ORCHESTRATOR_MAX_MEMORY_MB: z.string().default('6144'), // Updated to 6GB (2025-12-31: conservative)
});

/**
 * 解析並驗證環境變數
 */
export const env = envSchema.parse(process.env);

/**
 * Conditional validation: ANTHROPIC_API_KEY required when NOT in MCP server mode
 * ✅ SECURITY FIX (CRITICAL-1): Added API key format validation
 */
if (!env.MCP_SERVER_MODE) {
  // Check if API key exists
  if (!env.ANTHROPIC_API_KEY) {
    throw new ConfigurationError(
      'ANTHROPIC_API_KEY is required when not running in MCP server mode.\n' +
      'Either set ANTHROPIC_API_KEY in your .env file, or set MCP_SERVER_MODE=true\n' +
      'Get your API key at: https://console.anthropic.com/settings/keys',
      {
        component: 'config',
        method: 'initialization',
        missingKey: 'ANTHROPIC_API_KEY',
        mcpServerMode: env.MCP_SERVER_MODE,
        solution: 'Set ANTHROPIC_API_KEY in .env file or enable MCP_SERVER_MODE',
        documentationUrl: 'https://console.anthropic.com/settings/keys',
      }
    );
  }

  // ✅ SECURITY: Validate API key format (prevents runtime failures from malformed keys)
  if (!env.ANTHROPIC_API_KEY.startsWith('sk-ant-')) {
    throw new ConfigurationError(
      'ANTHROPIC_API_KEY has invalid format.\n' +
      'Expected format: sk-ant-...\n' +
      'Get your API key at: https://console.anthropic.com/settings/keys',
      {
        component: 'config',
        method: 'initialization',
        invalidKey: 'ANTHROPIC_API_KEY',
        expectedPrefix: 'sk-ant-',
        actualPrefix: env.ANTHROPIC_API_KEY.substring(0, 7),
        solution: 'Check your .env file for copy-paste errors',
        documentationUrl: 'https://console.anthropic.com/settings/keys',
      }
    );
  }

  // ✅ SECURITY: Validate minimum length (typical Anthropic keys are 100+ chars)
  if (env.ANTHROPIC_API_KEY.length < 50) {
    throw new ConfigurationError(
      'ANTHROPIC_API_KEY appears truncated or invalid (too short).\n' +
      `Current length: ${env.ANTHROPIC_API_KEY.length} characters (minimum: 50)\n` +
      'Please check your .env file for copy-paste errors',
      {
        component: 'config',
        method: 'initialization',
        invalidKey: 'ANTHROPIC_API_KEY',
        actualLength: env.ANTHROPIC_API_KEY.length,
        minimumLength: 50,
        solution: 'Copy the complete API key from Anthropic console',
        documentationUrl: 'https://console.anthropic.com/settings/keys',
      }
    );
  }
}

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
