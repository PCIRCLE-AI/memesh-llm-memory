import { CircuitBreaker } from './CircuitBreaker.js';
import { ScopeLimiter } from './ScopeLimiter.js';
import type { GeneratedFix } from '../generators/FixGenerator.js';
export interface SafetyValidationResult {
    allowed: boolean;
    violations: string[];
}
export declare class SafetyGate {
    private circuitBreaker;
    private scopeLimiter;
    private maxAttempts;
    private attemptCounts;
    private readonly MAX_TESTS_TRACKED;
    constructor(circuitBreaker: CircuitBreaker, scopeLimiter: ScopeLimiter, maxAttempts: number);
    validate(testId: string, testFile: string, fix: GeneratedFix): SafetyValidationResult;
    recordSuccess(testId: string): void;
    recordFailure(testId: string): void;
    private convertToCodeChanges;
    private cleanupOldTests;
}
//# sourceMappingURL=SafetyGate.d.ts.map