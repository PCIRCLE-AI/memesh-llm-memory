import { ValidationError } from '../errors/index.js';
export class SessionTokenTracker {
    totalTokens = 0;
    tokenLimit;
    thresholds;
    usageHistory = [];
    triggeredThresholds = new Set();
    constructor(config) {
        if (!Number.isFinite(config.tokenLimit)) {
            throw new ValidationError('Token limit must be finite number', {
                providedValue: config.tokenLimit,
            });
        }
        if (config.tokenLimit <= 0) {
            throw new ValidationError('Token limit must be positive', {
                providedValue: config.tokenLimit,
                expectedCondition: 'positive number (> 0)',
            });
        }
        if (config.tokenLimit > Number.MAX_SAFE_INTEGER) {
            throw new ValidationError('Token limit exceeds safe integer', {
                providedValue: config.tokenLimit,
                max: Number.MAX_SAFE_INTEGER,
            });
        }
        if (config.thresholds) {
            for (const threshold of config.thresholds) {
                if (!Number.isFinite(threshold.percentage)) {
                    throw new ValidationError('Threshold percentage must be finite', {
                        providedValue: threshold.percentage,
                    });
                }
                if (threshold.percentage < 0 || threshold.percentage > 100) {
                    throw new ValidationError('Threshold percentage must be 0-100', {
                        providedValue: threshold.percentage,
                        range: [0, 100],
                    });
                }
            }
        }
        this.tokenLimit = config.tokenLimit;
        this.thresholds = config.thresholds || [
            { percentage: 80, level: 'warning' },
            { percentage: 90, level: 'critical' },
        ];
    }
    recordUsage(usage) {
        if (!Number.isFinite(usage.inputTokens)) {
            throw new ValidationError('Input tokens must be finite', {
                providedValue: usage.inputTokens,
            });
        }
        if (!Number.isFinite(usage.outputTokens)) {
            throw new ValidationError('Output tokens must be finite', {
                providedValue: usage.outputTokens,
            });
        }
        if (usage.inputTokens < 0 || usage.outputTokens < 0) {
            throw new ValidationError('Token counts must be non-negative', {
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                expectedCondition: 'non-negative numbers (>= 0)',
            });
        }
        const total = usage.inputTokens + usage.outputTokens;
        if (!Number.isSafeInteger(total)) {
            throw new ValidationError('Token sum exceeds safe integer', {
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
                total,
                max: Number.MAX_SAFE_INTEGER,
            });
        }
        const newTotal = this.totalTokens + total;
        if (!Number.isSafeInteger(newTotal)) {
            throw new ValidationError('Total tokens would exceed safe integer', {
                currentTotal: this.totalTokens,
                addingTokens: total,
                newTotal,
                max: Number.MAX_SAFE_INTEGER,
            });
        }
        this.totalTokens = newTotal;
        this.usageHistory.push({
            ...usage,
            timestamp: usage.timestamp || new Date(),
        });
    }
    getTotalTokens() {
        return this.totalTokens;
    }
    getUsagePercentage() {
        if (this.tokenLimit <= 0)
            return 0;
        const percentage = (this.totalTokens / this.tokenLimit) * 100;
        return Number.isFinite(percentage) ? percentage : 0;
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