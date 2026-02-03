import { E2EHealingConfig } from '../types.js';
interface AttemptRecord {
    timestamp: number;
    success: boolean;
}
interface TestHistory {
    totalAttempts: number;
    consecutiveFailures: number;
    lastAttemptTime: number;
    attempts: AttemptRecord[];
}
export declare class CircuitBreaker {
    private config;
    private history;
    private readonly MAX_HISTORY_SIZE;
    private readonly MAX_TESTS_TRACKED;
    constructor(config: E2EHealingConfig);
    canAttemptRepair(testId: string): boolean;
    recordAttempt(testId: string, success: boolean): void;
    getHistory(testId: string): TestHistory | undefined;
    reset(testId: string): void;
    resetAll(): void;
    private cleanupOldTests;
}
export {};
//# sourceMappingURL=CircuitBreaker.d.ts.map