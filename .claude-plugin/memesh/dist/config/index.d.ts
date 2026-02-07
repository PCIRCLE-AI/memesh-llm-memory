export declare const env: {
    MCP_SERVER_MODE: boolean;
    CLAUDE_MODEL: string;
    CLAUDE_OPUS_MODEL: string;
    CLAUDE_DAILY_LIMIT: string;
    CLAUDE_MONTHLY_LIMIT: string;
    MONTHLY_BUDGET_USD: string;
    COST_ALERT_THRESHOLD: string;
    LOG_LEVEL: "error" | "warn" | "info" | "debug";
    ENABLE_METRICS: string;
    METRICS_PORT: string;
    NODE_ENV: string;
    PORT: string;
    ORCHESTRATOR_MODE: "local" | "distributed";
    ORCHESTRATOR_MAX_MEMORY_MB: string;
    MEMESH_BASE_URL: string;
    MEMESH_TIMEOUT_MS: string;
    ANTHROPIC_API_KEY?: string | undefined;
    MEMESH_API_KEY?: string | undefined;
    MEMESH_PLATFORM?: string | undefined;
};
export declare const appConfig: {
    readonly claude: {
        readonly apiKey: string | undefined;
        readonly models: {
            readonly sonnet: string;
            readonly opus: string;
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
        readonly level: "error" | "warn" | "info" | "debug";
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
    readonly cloud: {
        readonly baseUrl: string;
        readonly timeoutMs: number;
        readonly enabled: boolean;
        readonly platform: string | undefined;
    };
};
export default appConfig;
//# sourceMappingURL=index.d.ts.map