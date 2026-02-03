export class CircuitBreaker {
    config;
    history = new Map();
    MAX_HISTORY_SIZE = 100;
    MAX_TESTS_TRACKED = 1000;
    constructor(config) {
        this.config = config;
    }
    canAttemptRepair(testId) {
        const history = this.history.get(testId);
        if (!history) {
            return true;
        }
        if (history.totalAttempts >= this.config.maxAttempts) {
            return false;
        }
        const timeSinceLastAttempt = Date.now() - history.lastAttemptTime;
        if (history.consecutiveFailures >= this.config.failureThreshold) {
            if (timeSinceLastAttempt < this.config.cooldownPeriod) {
                return false;
            }
        }
        if (history.consecutiveFailures >= this.config.failureThreshold) {
            return false;
        }
        return true;
    }
    recordAttempt(testId, success) {
        const history = this.history.get(testId) || {
            totalAttempts: 0,
            consecutiveFailures: 0,
            lastAttemptTime: 0,
            attempts: [],
        };
        const record = {
            timestamp: Date.now(),
            success,
        };
        history.totalAttempts++;
        history.lastAttemptTime = record.timestamp;
        history.attempts.push(record);
        if (history.attempts.length > this.MAX_HISTORY_SIZE) {
            history.attempts = history.attempts.slice(-this.MAX_HISTORY_SIZE);
        }
        if (success) {
            history.consecutiveFailures = 0;
            history.totalAttempts = 0;
        }
        else {
            history.consecutiveFailures++;
        }
        this.history.set(testId, history);
        this.cleanupOldTests();
    }
    getHistory(testId) {
        return this.history.get(testId);
    }
    reset(testId) {
        this.history.delete(testId);
    }
    resetAll() {
        this.history.clear();
    }
    cleanupOldTests() {
        if (this.history.size <= this.MAX_TESTS_TRACKED) {
            return;
        }
        const entries = Array.from(this.history.entries()).sort((a, b) => a[1].lastAttemptTime - b[1].lastAttemptTime);
        const toRemove = Math.floor(this.MAX_TESTS_TRACKED * 0.1);
        for (let i = 0; i < toRemove; i++) {
            this.history.delete(entries[i][0]);
        }
    }
}
//# sourceMappingURL=CircuitBreaker.js.map