import { logger } from '../utils/logger.js';
import { MinHeap } from '../utils/MinHeap.js';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '../errors/index.js';
export class PerformanceTracker {
    metrics = new Map();
    maxMetricsPerAgent = 1000;
    maxTotalMetrics = 10000;
    totalMetricsCount = 0;
    evictionHeap;
    constructor(config) {
        this.maxMetricsPerAgent = config?.maxMetricsPerAgent || 1000;
        this.maxTotalMetrics = config?.maxTotalMetrics || 10000;
        this.evictionHeap = new MinHeap((a, b) => {
            return a.timestamp.getTime() - b.timestamp.getTime();
        });
        logger.info('Performance tracker initialized', {
            maxMetricsPerAgent: this.maxMetricsPerAgent,
            maxTotalMetrics: this.maxTotalMetrics,
        });
    }
    track(metrics) {
        if (!metrics.agentId || typeof metrics.agentId !== 'string' || metrics.agentId.trim() === '') {
            throw new ValidationError('agentId must be a non-empty string', {
                component: 'PerformanceTracker',
                method: 'recordMetric',
                providedValue: metrics.agentId,
                constraint: 'non-empty string',
            });
        }
        if (!metrics.taskType || typeof metrics.taskType !== 'string' || metrics.taskType.trim() === '') {
            throw new ValidationError('taskType must be a non-empty string', {
                component: 'PerformanceTracker',
                method: 'recordMetric',
                providedValue: metrics.taskType,
                constraint: 'non-empty string',
            });
        }
        if (typeof metrics.durationMs !== 'number' || metrics.durationMs < 0) {
            throw new ValidationError('durationMs must be a non-negative number', {
                component: 'PerformanceTracker',
                method: 'recordMetric',
                providedValue: metrics.durationMs,
                constraint: 'durationMs >= 0',
            });
        }
        if (typeof metrics.cost !== 'number' || metrics.cost < 0) {
            throw new ValidationError('cost must be a non-negative number', {
                component: 'PerformanceTracker',
                method: 'recordMetric',
                providedValue: metrics.cost,
                constraint: 'cost >= 0',
            });
        }
        if (typeof metrics.qualityScore !== 'number' || metrics.qualityScore < 0 || metrics.qualityScore > 1) {
            throw new ValidationError('qualityScore must be a number between 0 and 1', {
                component: 'PerformanceTracker',
                method: 'recordMetric',
                providedValue: metrics.qualityScore,
                constraint: '0 <= qualityScore <= 1',
            });
        }
        if (typeof metrics.success !== 'boolean') {
            throw new ValidationError('success must be a boolean', {
                component: 'PerformanceTracker',
                method: 'recordMetric',
                providedValue: metrics.success,
                constraint: 'boolean type',
            });
        }
        const fullMetrics = {
            ...metrics,
            executionId: uuidv4(),
            timestamp: new Date(),
        };
        if (!this.metrics.has(metrics.agentId)) {
            this.metrics.set(metrics.agentId, []);
        }
        const agentMetrics = this.metrics.get(metrics.agentId);
        const isFirstMetricForAgent = agentMetrics.length === 0;
        agentMetrics.push(fullMetrics);
        this.totalMetricsCount++;
        if (isFirstMetricForAgent) {
            this.evictionHeap.push({
                agentId: metrics.agentId,
                timestamp: fullMetrics.timestamp,
            });
        }
        if (agentMetrics.length > this.maxMetricsPerAgent) {
            agentMetrics.shift();
            this.totalMetricsCount--;
            this.updateHeapForAgent(metrics.agentId);
        }
        this.enforceGlobalLimit();
        logger.debug('Performance tracked', {
            agentId: metrics.agentId,
            taskType: metrics.taskType,
            success: metrics.success,
            durationMs: metrics.durationMs,
            cost: metrics.cost,
            qualityScore: metrics.qualityScore,
            totalMetrics: this.totalMetricsCount,
        });
        return fullMetrics;
    }
    enforceGlobalLimit() {
        while (this.totalMetricsCount > this.maxTotalMetrics) {
            const oldest = this.evictionHeap.pop();
            if (!oldest) {
                logger.error('Unable to enforce global limit: heap is empty');
                break;
            }
            const agentMetrics = this.metrics.get(oldest.agentId);
            if (!agentMetrics || agentMetrics.length === 0) {
                continue;
            }
            const actualOldest = agentMetrics[0];
            if (actualOldest.timestamp.getTime() !== oldest.timestamp.getTime()) {
                logger.warn('Heap out of sync, rebuilding', {
                    agentId: oldest.agentId,
                    heapTimestamp: oldest.timestamp,
                    actualTimestamp: actualOldest.timestamp,
                });
                this.rebuildHeap();
                continue;
            }
            agentMetrics.shift();
            this.totalMetricsCount--;
            if (agentMetrics.length === 0) {
                this.metrics.delete(oldest.agentId);
            }
            else {
                this.evictionHeap.push({
                    agentId: oldest.agentId,
                    timestamp: agentMetrics[0].timestamp,
                });
            }
            logger.debug('Evicted oldest metric due to global limit', {
                agentId: oldest.agentId,
                timestamp: oldest.timestamp,
                totalMetrics: this.totalMetricsCount,
                maxTotalMetrics: this.maxTotalMetrics,
            });
        }
    }
    updateHeapForAgent(agentId) {
        this.rebuildHeap();
    }
    rebuildHeap() {
        this.evictionHeap.clear();
        for (const [agentId, agentMetrics] of this.metrics.entries()) {
            if (agentMetrics.length > 0) {
                this.evictionHeap.push({
                    agentId,
                    timestamp: agentMetrics[0].timestamp,
                });
            }
        }
        logger.debug('Eviction heap rebuilt', {
            heapSize: this.evictionHeap.size,
            totalAgents: this.metrics.size,
        });
    }
    getMetrics(agentId, filter) {
        if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
            throw new ValidationError('agentId must be a non-empty string', {
                component: 'PerformanceTracker',
                method: 'getMetrics',
                providedValue: agentId,
                constraint: 'non-empty string',
            });
        }
        if (filter?.limit !== undefined && (typeof filter.limit !== 'number' || filter.limit <= 0)) {
            throw new ValidationError('filter.limit must be a positive number', {
                component: 'PerformanceTracker',
                method: 'getMetrics',
                providedValue: filter.limit,
                constraint: 'limit > 0',
            });
        }
        let metrics = this.metrics.get(agentId) || [];
        if (filter) {
            if (filter.taskType) {
                metrics = metrics.filter(m => m.taskType === filter.taskType);
            }
            if (filter.since) {
                metrics = metrics.filter(m => m.timestamp >= filter.since);
            }
            if (filter.limit) {
                metrics = metrics.slice(-filter.limit);
            }
        }
        return metrics;
    }
    getEvolutionStats(agentId, recentWindowMs = 7 * 24 * 60 * 60 * 1000) {
        if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
            throw new ValidationError('agentId must be a non-empty string', {
                component: 'PerformanceTracker',
                method: 'getEvolutionStats',
                providedValue: agentId,
                constraint: 'non-empty string',
            });
        }
        if (typeof recentWindowMs !== 'number' || recentWindowMs <= 0) {
            throw new ValidationError('recentWindowMs must be a positive number', {
                component: 'PerformanceTracker',
                method: 'getEvolutionStats',
                providedValue: recentWindowMs,
                constraint: 'recentWindowMs > 0',
            });
        }
        const allMetrics = this.metrics.get(agentId) || [];
        if (allMetrics.length === 0) {
            return {
                agentId,
                totalExecutions: 0,
                successRateTrend: { historical: 0, recent: 0, improvement: 0 },
                costEfficiencyTrend: { historical: 0, recent: 0, improvement: 0 },
                qualityScoreTrend: { historical: 0, recent: 0, improvement: 0 },
                learnedPatterns: 0,
                appliedAdaptations: 0,
                lastLearningDate: new Date(),
            };
        }
        const now = Date.now();
        const recentCutoff = new Date(now - recentWindowMs);
        const recentMetrics = allMetrics.filter(m => m.timestamp >= recentCutoff);
        const historicalMetrics = allMetrics.filter(m => m.timestamp < recentCutoff);
        const historicalSuccess = historicalMetrics.length > 0
            ? historicalMetrics.filter(m => m.success).length / historicalMetrics.length
            : 0;
        const recentSuccess = recentMetrics.length > 0
            ? recentMetrics.filter(m => m.success).length / recentMetrics.length
            : 0;
        const successImprovement = recentSuccess - historicalSuccess;
        const historicalCostEfficiency = historicalMetrics.length > 0
            ? historicalMetrics.reduce((sum, m) => sum + (m.qualityScore / (m.cost || 0.01)), 0) / historicalMetrics.length
            : 0;
        const recentCostEfficiency = recentMetrics.length > 0
            ? recentMetrics.reduce((sum, m) => sum + (m.qualityScore / (m.cost || 0.01)), 0) / recentMetrics.length
            : 0;
        const costEfficiencyImprovement = recentCostEfficiency - historicalCostEfficiency;
        const historicalQuality = historicalMetrics.length > 0
            ? historicalMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / historicalMetrics.length
            : 0;
        const recentQuality = recentMetrics.length > 0
            ? recentMetrics.reduce((sum, m) => sum + m.qualityScore, 0) / recentMetrics.length
            : 0;
        const qualityImprovement = recentQuality - historicalQuality;
        return {
            agentId,
            totalExecutions: allMetrics.length,
            successRateTrend: {
                historical: historicalSuccess,
                recent: recentSuccess,
                improvement: successImprovement,
            },
            costEfficiencyTrend: {
                historical: historicalCostEfficiency,
                recent: recentCostEfficiency,
                improvement: costEfficiencyImprovement,
            },
            qualityScoreTrend: {
                historical: historicalQuality,
                recent: recentQuality,
                improvement: qualityImprovement,
            },
            learnedPatterns: 0,
            appliedAdaptations: 0,
            lastLearningDate: allMetrics[allMetrics.length - 1].timestamp,
        };
    }
    getAveragePerformance(agentId, taskType) {
        if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
            throw new ValidationError('agentId must be a non-empty string', {
                component: 'PerformanceTracker',
                method: 'compareTaskPerformance',
                providedValue: agentId,
                constraint: 'non-empty string',
            });
        }
        if (!taskType || typeof taskType !== 'string' || taskType.trim() === '') {
            throw new ValidationError('taskType must be a non-empty string', {
                component: 'PerformanceTracker',
                method: 'compareTaskPerformance',
                providedValue: taskType,
                constraint: 'non-empty string',
            });
        }
        const metrics = this.getMetrics(agentId, { taskType });
        if (metrics.length === 0) {
            return {
                avgDuration: 0,
                avgCost: 0,
                avgQuality: 0,
                successRate: 0,
                sampleSize: 0,
            };
        }
        const avgDuration = metrics.reduce((sum, m) => sum + m.durationMs, 0) / metrics.length;
        const avgCost = metrics.reduce((sum, m) => sum + m.cost, 0) / metrics.length;
        const avgQuality = metrics.reduce((sum, m) => sum + m.qualityScore, 0) / metrics.length;
        const successRate = metrics.filter(m => m.success).length / metrics.length;
        return {
            avgDuration,
            avgCost,
            avgQuality,
            successRate,
            sampleSize: metrics.length,
        };
    }
    detectAnomalies(agentId, metric) {
        if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
            throw new ValidationError('agentId must be a non-empty string', {
                component: 'PerformanceTracker',
                method: 'predictOptimalStrategy',
                providedValue: agentId,
                constraint: 'non-empty string',
            });
        }
        if (!metric || typeof metric !== 'object') {
            throw new ValidationError('metric must be a valid PerformanceMetrics object', {
                component: 'PerformanceTracker',
                method: 'predictOptimalStrategy',
                providedValue: metric,
                constraint: 'valid PerformanceMetrics object',
            });
        }
        const avg = this.getAveragePerformance(agentId, metric.taskType);
        if (avg.sampleSize < 10) {
            return { isAnomaly: false, severity: 'low', message: 'Insufficient data' };
        }
        if (metric.durationMs > avg.avgDuration * 2) {
            return {
                isAnomaly: true,
                type: 'slow',
                severity: metric.durationMs > avg.avgDuration * 3 ? 'high' : 'medium',
                message: `Execution ${metric.durationMs.toFixed(0)}ms vs avg ${avg.avgDuration.toFixed(0)}ms`,
            };
        }
        if (metric.cost > avg.avgCost * 2) {
            return {
                isAnomaly: true,
                type: 'expensive',
                severity: metric.cost > avg.avgCost * 3 ? 'high' : 'medium',
                message: `Cost $${metric.cost.toFixed(4)} vs avg $${avg.avgCost.toFixed(4)}`,
            };
        }
        if (metric.qualityScore < avg.avgQuality * 0.7) {
            return {
                isAnomaly: true,
                type: 'low-quality',
                severity: metric.qualityScore < avg.avgQuality * 0.5 ? 'high' : 'medium',
                message: `Quality ${metric.qualityScore.toFixed(2)} vs avg ${avg.avgQuality.toFixed(2)}`,
            };
        }
        if (!metric.success && avg.successRate > 0.8) {
            return {
                isAnomaly: true,
                type: 'failure',
                severity: 'high',
                message: `Failed execution (${(avg.successRate * 100).toFixed(0)}% success rate)`,
            };
        }
        return { isAnomaly: false, severity: 'low', message: 'Normal performance' };
    }
    clearMetrics(agentId) {
        if (!agentId || typeof agentId !== 'string' || agentId.trim() === '') {
            throw new ValidationError('agentId must be a non-empty string', {
                component: 'PerformanceTracker',
                method: 'clearMetrics',
                providedValue: agentId,
                constraint: 'non-empty string',
            });
        }
        const agentMetrics = this.metrics.get(agentId);
        if (agentMetrics) {
            this.totalMetricsCount -= agentMetrics.length;
            this.metrics.delete(agentId);
            this.rebuildHeap();
            logger.info('Metrics cleared', {
                agentId,
                clearedCount: agentMetrics.length,
                totalMetrics: this.totalMetricsCount,
            });
        }
    }
    getTrackedAgents() {
        return Array.from(this.metrics.keys());
    }
    getTotalTaskCount() {
        let total = 0;
        for (const metrics of this.metrics.values()) {
            total += metrics.length;
        }
        return total;
    }
}
//# sourceMappingURL=PerformanceTracker.js.map