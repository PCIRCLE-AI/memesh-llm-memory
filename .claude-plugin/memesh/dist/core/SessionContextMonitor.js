import { StateError, ValidationError } from '../errors/index.js';
export class SessionContextMonitor {
    tokenTracker;
    static MAX_QUALITY_HISTORY = 10;
    static MIN_SCORES_FOR_TREND = 3;
    static DEGRADATION_THRESHOLD = 0.15;
    qualityHistory = [];
    lastHealthCheck = null;
    constructor(tokenTracker) {
        this.tokenTracker = tokenTracker;
        if (!tokenTracker) {
            throw new StateError('SessionTokenTracker is required', {
                component: 'SessionContextMonitor',
                requiredDependency: 'SessionTokenTracker',
            });
        }
    }
    checkSessionHealth() {
        const warnings = [];
        const recommendations = [];
        let thresholdWarnings;
        let usagePercentage;
        try {
            thresholdWarnings = this.tokenTracker.checkThresholds();
            usagePercentage = this.tokenTracker.getUsagePercentage();
        }
        catch (error) {
            const timestamp = new Date();
            this.lastHealthCheck = timestamp;
            const errorMessage = error instanceof Error
                ? error.message
                : String(error);
            return {
                status: 'critical',
                tokenUsagePercentage: 0,
                warnings: [
                    {
                        type: 'system-error',
                        level: 'critical',
                        message: `Token tracker error: ${errorMessage}`,
                        data: {},
                    },
                ],
                recommendations: [],
                timestamp,
            };
        }
        for (const tw of thresholdWarnings) {
            warnings.push({
                type: 'token-threshold',
                level: tw.level,
                message: tw.message,
                data: {
                    threshold: tw.threshold,
                    tokensUsed: tw.tokensUsed,
                    tokensRemaining: tw.tokensRemaining,
                },
            });
            if (tw.level === 'critical') {
                recommendations.push({
                    action: 'reload-claude-md',
                    priority: 'critical',
                    description: 'Reload CLAUDE.md to refresh context',
                    reasoning: `Session approaching token limit (${tw.threshold}% used)`,
                });
            }
            else if (tw.level === 'warning') {
                recommendations.push({
                    action: 'review-context',
                    priority: 'medium',
                    description: 'Review and optimize context usage',
                    reasoning: `Session token usage is high (${tw.threshold}% used)`,
                });
            }
        }
        const qualityWarning = this.checkQualityDegradation();
        if (qualityWarning) {
            warnings.push(qualityWarning);
            recommendations.push({
                action: 'context-refresh',
                priority: 'high',
                description: 'Refresh context to improve quality',
                reasoning: 'Quality scores showing degradation trend',
            });
        }
        const status = this.determineStatus(warnings);
        const timestamp = new Date();
        this.lastHealthCheck = timestamp;
        return {
            status,
            tokenUsagePercentage: usagePercentage,
            warnings,
            recommendations,
            timestamp,
        };
    }
    recordQualityScore(score) {
        if (!Number.isFinite(score) || score < 0 || score > 1) {
            throw new ValidationError('Quality score must be a finite number between 0 and 1', {
                providedScore: score,
                validRange: { min: 0, max: 1 },
                mustBeFinite: true,
            });
        }
        this.qualityHistory.push(score);
        while (this.qualityHistory.length > SessionContextMonitor.MAX_QUALITY_HISTORY) {
            this.qualityHistory.shift();
        }
    }
    checkQualityDegradation() {
        if (this.qualityHistory.length < SessionContextMonitor.MIN_SCORES_FOR_TREND) {
            return null;
        }
        const recent = this.qualityHistory.slice(-3);
        const previous = this.qualityHistory.slice(-6, -3);
        if (previous.length === 0 || recent.length === 0) {
            return null;
        }
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const previousAvg = previous.reduce((a, b) => a + b, 0) / previous.length;
        if (!Number.isFinite(recentAvg) || !Number.isFinite(previousAvg)) {
            return null;
        }
        if (previousAvg === 0) {
            return null;
        }
        if (recentAvg <
            previousAvg * (1 - SessionContextMonitor.DEGRADATION_THRESHOLD)) {
            return {
                type: 'quality-degradation',
                level: 'warning',
                message: `Quality scores declining (${previousAvg.toFixed(2)} → ${recentAvg.toFixed(2)})`,
                data: {
                    recentAvg,
                    previousAvg,
                    dropPercentage: ((previousAvg - recentAvg) / previousAvg) * 100,
                },
            };
        }
        return null;
    }
    determineStatus(warnings) {
        const hasCritical = warnings.some((w) => w.level === 'critical');
        const hasWarning = warnings.some((w) => w.level === 'warning');
        if (hasCritical)
            return 'critical';
        if (hasWarning)
            return 'warning';
        return 'healthy';
    }
    getStats() {
        return {
            tokenStats: this.tokenTracker.getStats(),
            qualityHistory: [...this.qualityHistory],
            lastHealthCheck: this.lastHealthCheck,
        };
    }
}
//# sourceMappingURL=SessionContextMonitor.js.map