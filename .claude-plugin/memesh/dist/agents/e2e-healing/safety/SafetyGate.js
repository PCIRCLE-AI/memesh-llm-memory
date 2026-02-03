export class SafetyGate {
    circuitBreaker;
    scopeLimiter;
    maxAttempts;
    attemptCounts = new Map();
    MAX_TESTS_TRACKED = 1000;
    constructor(circuitBreaker, scopeLimiter, maxAttempts) {
        this.circuitBreaker = circuitBreaker;
        this.scopeLimiter = scopeLimiter;
        this.maxAttempts = maxAttempts;
    }
    validate(testId, testFile, fix) {
        const violations = [];
        const attemptCount = (this.attemptCounts.get(testId) || 0) + 1;
        this.attemptCounts.set(testId, attemptCount);
        this.cleanupOldTests();
        if (attemptCount > this.maxAttempts) {
            violations.push(`max attempts (${this.maxAttempts}) exceeded for test ${testId}`);
        }
        if (!this.circuitBreaker.canAttemptRepair(testId)) {
            violations.push(`circuit breaker is open for test ${testId} - too many recent failures`);
        }
        const proposedChanges = this.convertToCodeChanges(fix);
        const scopeResult = this.scopeLimiter.validateRepairScope(testFile, proposedChanges);
        if (!scopeResult.valid) {
            violations.push(...scopeResult.violations);
        }
        return {
            allowed: violations.length === 0,
            violations,
        };
    }
    recordSuccess(testId) {
        this.circuitBreaker.recordAttempt(testId, true);
        this.attemptCounts.delete(testId);
    }
    recordFailure(testId) {
        this.circuitBreaker.recordAttempt(testId, false);
    }
    convertToCodeChanges(fix) {
        const lines = fix.code.split('\n').length;
        return [
            {
                path: fix.targetFile,
                additions: lines,
                deletions: 0,
                diff: fix.code,
            },
        ];
    }
    cleanupOldTests() {
        if (this.attemptCounts.size <= this.MAX_TESTS_TRACKED) {
            return;
        }
        const entries = Array.from(this.attemptCounts.entries()).sort((a, b) => b[1] - a[1]);
        const toRemove = Math.floor(this.MAX_TESTS_TRACKED * 0.1);
        for (let i = 0; i < toRemove; i++) {
            this.attemptCounts.delete(entries[i][0]);
        }
    }
}
//# sourceMappingURL=SafetyGate.js.map