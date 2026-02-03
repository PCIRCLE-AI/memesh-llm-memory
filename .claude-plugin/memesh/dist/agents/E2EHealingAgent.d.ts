import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { E2EHealingConfig } from './e2e-healing/types.js';
export interface HealingResultSummary {
    success: boolean;
    testsRun: number;
    testsPassed: number;
    testsFailed: number;
    healingAttempts: number;
    healingSuccesses: number;
    message: string;
    failedTests?: string[];
}
export interface E2EHealingOptions {
    testPath: string;
    config?: Partial<E2EHealingConfig>;
    autoApply?: boolean;
    environment?: string;
}
export declare class E2EHealingAgent {
    private mcp;
    private orchestrator;
    private config;
    constructor(mcp: MCPToolInterface, config?: Partial<E2EHealingConfig>);
    runTests(options: E2EHealingOptions): Promise<HealingResultSummary>;
    private formatOrchestratorResult;
    getConfig(): E2EHealingConfig;
    updateConfig(updates: Partial<E2EHealingConfig>): void;
}
//# sourceMappingURL=E2EHealingAgent.d.ts.map