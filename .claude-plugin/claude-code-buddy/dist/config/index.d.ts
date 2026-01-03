export declare const env: {
    LOG_LEVEL: "debug" | "error" | "warn" | "info";
    MCP_SERVER_MODE: boolean;
    CLAUDE_MODEL: string;
    CLAUDE_OPUS_MODEL: string;
    OPENAI_EMBEDDING_MODEL: string;
    CLAUDE_DAILY_LIMIT: string;
    CLAUDE_MONTHLY_LIMIT: string;
    MONTHLY_BUDGET_USD: string;
    COST_ALERT_THRESHOLD: string;
    ENABLE_METRICS: string;
    METRICS_PORT: string;
    NODE_ENV: string;
    PORT: string;
    ORCHESTRATOR_MODE: "local" | "distributed";
    ORCHESTRATOR_MAX_MEMORY_MB: string;
    ANTHROPIC_API_KEY?: string | undefined;
    OPENAI_API_KEY?: string | undefined;
};
export declare const appConfig: {
    readonly claude: {
        readonly apiKey: string | undefined;
        readonly models: {
            readonly sonnet: string;
            readonly opus: string;
        };
    };
    readonly openai: {
        readonly apiKey: string | undefined;
        readonly embeddings: {
            readonly model: string;
        };
    };
    readonly quotaLimits: {
        readonly claude: {
            readonly daily: number;
            readonly monthly: number;
        };
    };
    readonly costs: {
        readonly monthlyBudget: number;
        readonly alertThreshold: number;
    };
    readonly logging: {
        readonly level: "debug" | "error" | "warn" | "info";
        readonly enableMetrics: boolean;
        readonly metricsPort: number;
    };
    readonly server: {
        readonly env: string;
        readonly port: number;
    };
    readonly orchestrator: {
        readonly mode: "local" | "distributed";
        readonly maxMemoryMB: number;
    };
};
export default appConfig;
//# sourceMappingURL=index.d.ts.map