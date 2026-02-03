import type { MCPTaskDelegator } from '../delegator/MCPTaskDelegator.js';
declare enum CircuitState {
    CLOSED = "CLOSED",
    OPEN = "OPEN",
    HALF_OPEN = "HALF_OPEN"
}
interface TimeoutCheckerConfig {
    intervalMs?: number;
    maxConsecutiveErrors?: number;
    circuitCooldownMs?: number;
    enableAlerting?: boolean;
}
export declare class TimeoutChecker {
    private delegator;
    private intervalId;
    private interval;
    private circuitState;
    private consecutiveErrors;
    private lastErrorTime;
    private circuitOpenedAt;
    private readonly maxConsecutiveErrors;
    private readonly circuitCooldownMs;
    private readonly enableAlerting;
    private totalChecks;
    private totalErrors;
    private lastSuccessfulCheck;
    constructor(delegator: MCPTaskDelegator, config?: TimeoutCheckerConfig);
    start(intervalMs?: number): void;
    stop(): void;
    isRunning(): boolean;
    getInterval(): number;
    getStatistics(): {
        circuitState: CircuitState;
        consecutiveErrors: number;
        totalChecks: number;
        totalErrors: number;
        errorRate: number;
        lastSuccessfulCheck: number | null;
    };
    resetCircuit(): void;
    private checkWithCircuitBreaker;
    private handleSuccess;
    private handleError;
    private openCircuit;
    private sendAlert;
    private resetStatistics;
}
export {};
//# sourceMappingURL=TimeoutChecker.d.ts.map