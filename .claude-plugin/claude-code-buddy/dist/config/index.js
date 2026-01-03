import { config } from 'dotenv';
import { z } from 'zod';
import { ConfigurationError } from '../errors/index.js';
config({ override: true });
const envSchema = z.object({
    MCP_SERVER_MODE: z.string().transform(val => val === 'true').default('true'),
    ANTHROPIC_API_KEY: z.string().optional(),
    CLAUDE_MODEL: z.string().default('claude-sonnet-4-5-20250929'),
    CLAUDE_OPUS_MODEL: z.string().default('claude-opus-4-5-20251101'),
    OPENAI_API_KEY: z.string().optional(),
    OPENAI_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
    CLAUDE_DAILY_LIMIT: z.string().default('150'),
    CLAUDE_MONTHLY_LIMIT: z.string().default('4500'),
    MONTHLY_BUDGET_USD: z.string().default('50'),
    COST_ALERT_THRESHOLD: z.string().default('0.8'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    ENABLE_METRICS: z.string().default('true'),
    METRICS_PORT: z.string().default('9090'),
    NODE_ENV: z.string().default('development'),
    PORT: z.string().default('3000'),
    ORCHESTRATOR_MODE: z.enum(['local', 'distributed']).default('local'),
    ORCHESTRATOR_MAX_MEMORY_MB: z.string().default('6144'),
});
export const env = envSchema.parse(process.env);
if (!env.MCP_SERVER_MODE && !env.ANTHROPIC_API_KEY) {
    throw new ConfigurationError('ANTHROPIC_API_KEY is required when not running in MCP server mode.\n' +
        'Either set ANTHROPIC_API_KEY in your .env file, or set MCP_SERVER_MODE=true\n' +
        'Get your API key at: https://console.anthropic.com/settings/keys', {
        component: 'config',
        method: 'initialization',
        missingKey: 'ANTHROPIC_API_KEY',
        mcpServerMode: env.MCP_SERVER_MODE,
        solution: 'Set ANTHROPIC_API_KEY in .env file or enable MCP_SERVER_MODE',
        documentationUrl: 'https://console.anthropic.com/settings/keys',
    });
}
export const appConfig = {
    claude: {
        apiKey: env.ANTHROPIC_API_KEY,
        models: {
            sonnet: env.CLAUDE_MODEL,
            opus: env.CLAUDE_OPUS_MODEL,
        },
    },
    openai: {
        apiKey: env.OPENAI_API_KEY,
        embeddings: {
            model: env.OPENAI_EMBEDDING_MODEL,
        },
    },
    quotaLimits: {
        claude: {
            daily: parseInt(env.CLAUDE_DAILY_LIMIT),
            monthly: parseInt(env.CLAUDE_MONTHLY_LIMIT),
        },
    },
    costs: {
        monthlyBudget: parseFloat(env.MONTHLY_BUDGET_USD),
        alertThreshold: parseFloat(env.COST_ALERT_THRESHOLD),
    },
    logging: {
        level: env.LOG_LEVEL,
        enableMetrics: env.ENABLE_METRICS === 'true',
        metricsPort: parseInt(env.METRICS_PORT),
    },
    server: {
        env: env.NODE_ENV,
        port: parseInt(env.PORT),
    },
    orchestrator: {
        mode: env.ORCHESTRATOR_MODE,
        maxMemoryMB: parseInt(env.ORCHESTRATOR_MAX_MEMORY_MB),
    },
};
export default appConfig;
//# sourceMappingURL=index.js.map