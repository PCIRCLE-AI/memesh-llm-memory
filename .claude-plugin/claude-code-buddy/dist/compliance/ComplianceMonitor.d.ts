import type { ComplianceRule, ComplianceViolation, ComplianceStats, ToolCallRecord } from './types.js';
export interface ComplianceMonitorConfig {
    rules: ComplianceRule[];
    historyLimit?: number;
}
export interface CheckResult {
    allowed: boolean;
    violations: ComplianceViolation[];
    action?: 'block' | 'warn' | 'log';
}
export declare class ComplianceMonitor {
    private rules;
    private toolHistory;
    private violations;
    private historyLimit;
    constructor(config: ComplianceMonitorConfig);
    checkToolCall(agentId: string, toolName: string, args: any): CheckResult;
    getRecentToolCalls(agentId: string, limit?: number): ToolCallRecord[];
    getStats(agentId: string): ComplianceStats;
    getViolations(agentId: string): ComplianceViolation[];
    clearHistory(agentId: string): void;
    private recordToolCall;
    private recordViolation;
}
//# sourceMappingURL=ComplianceMonitor.d.ts.map