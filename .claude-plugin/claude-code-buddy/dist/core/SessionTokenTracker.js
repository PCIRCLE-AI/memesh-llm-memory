import { ValidationError } from '../errors/index.js';
export class SessionTokenTracker {
    totalTokens = 0;
    tokenLimit;
    thresholds;
    usageHistory = [];
    triggeredThresholds = new Set();
    constructor(config) {
        if (config.tokenLimit <= 0) {
            throw new ValidationError('Token limit must be positive', {
                providedValue: config.tokenLimit,
                expectedCondition: 'positive number (> 0)',
            });
        }
        this.tokenLimit = config.tokenLimit;
        this.thresholds = config.thresholds || [
            { percentage: 80, level: 'warning' },
            { percentage: 90, level: 'critical' },
        ];
    }
    recordUsage(usage) {
        if (usage.inputTokens < 0 || usage.outputTokens < 0) {
            throw new ValidationError('Token counts must be non-negative', {
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                expectedCondition: 'non-negative numbers (>= 0)',
            });
        }
        const total = usage.inputTokens + usage.outputTokens;
        this.totalTokens += total;
        this.usageHistory.push({
            ...usage,
            timestamp: usage.timestamp || new Date(),
        });
    }
    getTotalTokens() {
        return this.totalTokens;
    }
    getUsagePercentage() {
        return (this.totalTokens / this.tokenLimit) * 100;
    }
    checkThresholds() {
        const percentage = this.getUsagePercentage();
        const warnings = [];
        for (const threshold of this.thresholds) {
            if (percentage >= threshold.percentage &&
                !this.triggeredThresholds.has(threshold.percentage)) {
                this.triggeredThresholds.add(threshold.percentage);
                warnings.push({
                    threshold: threshold.percentage,
                    level: threshold.level,
                    tokensUsed: this.totalTokens,
                    tokensRemaining: this.tokenLimit - this.totalTokens,
                    message: `Session token usage at ${threshold.percentage}% (${this.totalTokens}/${this.tokenLimit} tokens)`,
                });
            }
        }
        return warnings;
    }
    getStats() {
        return {
            totalTokens: this.totalTokens,
            tokenLimit: this.tokenLimit,
            usagePercentage: this.getUsagePercentage(),
            tokensRemaining: this.tokenLimit - this.totalTokens,
            interactionCount: this.usageHistory.length,
            triggeredThresholds: Array.from(this.triggeredThresholds),
        };
    }
    reset() {
        this.totalTokens = 0;
        this.usageHistory = [];
        this.triggeredThresholds.clear();
    }
}
//# sourceMappingURL=SessionTokenTracker.js.map