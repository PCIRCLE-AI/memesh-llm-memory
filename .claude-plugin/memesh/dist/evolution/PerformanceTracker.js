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
    repository;
    constructor(config) {
        if (config?.maxMetricsPerAgent !== undefined) {
            if (!Number.isFinite(config.maxMetricsPerAgent)) {
                throw new ValidationError('maxMetricsPerAgent must be finite', {
                    component: 'PerformanceTracker',
                    method: 'constructor',
                    providedValue: config.maxMetricsPerAgent,
                    constraint: 'Number.isFinite(maxMetricsPerAgent)',
                });
            }
            if (!Number.isSafeInteger(config.maxMetricsPerAgent) || config.maxMetricsPerAgent <= 0) {
                throw new ValidationError('maxMetricsPerAgent must be a positive integer', {
                    component: 'PerformanceTracker',
                    method: 'constructor',
                    providedValue: config.maxMetricsPerAgent,
                    constraint: 'maxMetricsPerAgent > 0 and integer',
                });
            }
        }
        if (config?.maxTotalMetrics !== undefined) {
            if (!Number.isFinite(config.maxTotalMetrics)) {
                throw new ValidationError('maxTotalMetrics must be finite', {
                    component: 'PerformanceTracker',
                    method: 'constructor',
                    providedValue: config.maxTotalMetrics,
                    constraint: 'Number.isFinite(maxTotalMetrics)',
                });
            }
            if (!Number.isSafeInteger(config.maxTotalMetrics) || config.maxTotalMetrics <= 0) {
                throw new ValidationError('maxTotalMetrics must be a positive integer', {
                    component: 'PerformanceTracker',
                    method: 'constructor',
                    providedValue: config.maxTotalMetrics,
                    constraint: 'maxTotalMetrics > 0 and integer',
                });
            }
        }
        this.maxMetricsPerAgent = config?.maxMetricsPerAgent || 1000;
        this.maxTotalMetrics = config?.maxTotalMetrics || 10000;
        this.repository = config?.repository;
        this.evictionHeap = new MinHeap((a, b) => {
            return a.timestamp.getTime() - b.timestamp.getTime();
        });
        if (this.repository) {
            try {
                this.repository.ensureSchema();
                this.loadFromRepository();
                logger.info('Performance tracker initialized with SQLite persistence', {
                    maxMetricsPerAgent: this.maxMetricsPerAgent,
                    maxTotalMetrics: this.maxTotalMetrics,
                    loadedMetrics: this.totalMetricsCount,
                });
            }
            catch (error) {
                logger.warn('Failed to initialize SQLite persistence, falling back to in-memory only', {
                    error: error instanceof Error ? error.message : String(error),
                });
                this.repository = undefined;
            }
        }
        else {
            logger.info('Performance tracker initialized (in-memory only)', {
                maxMetricsPerAgent: this.maxMetricsPerAgent,
                maxTotalMetrics: this.maxTotalMetrics,
            });
        }
    }
    loadFromRepository() {
        if (!this.repository)
            return;
        const agentIds = this.repository.getAgentIds();
        for (const agentId of agentIds) {
            const metrics = this.repository.getByAgentId(agentId, this.maxMetricsPerAgent);
            if (metrics.length > 0) {
                metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                this.metrics.set(agentId, metrics);
                this.totalMetricsCount += metrics.length;
                this.evictionHeap.push({
                    agentId,
                    timestamp: metrics[0].timestamp,
                });
            }
        }
        logger.debug('Loaded metrics from SQLite', {
            agentCount: agentIds.length,
            totalMetrics: this.totalMetricsCount,
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
        if (typeof metrics.durationMs !== 'number' || !Number.isFinite(metrics.durationMs)) {
            throw new ValidationError('durationMs must be a finite number', {
                component: 'PerformanceTracker',
                method: 'recordMetric',
                providedValue: metrics.durationMs,
                constraint: 'Number.isFinite(durationMs)',
            });
        }
        if (metrics.durationMs < 0) {
            throw new ValidationError('durationMs must be non-negative', {
                component: 'PerformanceTracker',
                method: 'recordMetric',
                providedValue: metrics.durationMs,
                constraint: 'durationMs >= 0',
            });
        }
        if (typeof metrics.cost !== 'number' || !Number.isFinite(metrics.cost)) {
            throw new ValidationError('cost must be a finite number', {
                component: 'PerformanceTracker',
                method: 'recordMetric',
                providedValue: metrics.cost,
                constraint: 'Number.isFinite(cost)',
            });
        }
        if (metrics.cost < 0) {
            throw new ValidationError('cost must be non-negative', {
                component: 'PerformanceTracker',
                method: 'recordMetric',
                providedValue: metrics.cost,
                constraint: 'cost >= 0',
            });
        }
        if (typeof metrics.qualityScore !== 'number' || !Number.isFinite(metrics.qualityScore)) {
            throw new ValidationError('qualityScore must be a finite number', {
                component: 'PerformanceTracker',
                method: 'recordMetric',
                providedValue: metrics.qualityScore,
                constraint: 'Number.isFinite(qualityScore)',
            });
        }
        if (metrics.qualityScore < 0 || metrics.qualityScore > 1) {
            throw new ValidationError('qualityScore must be between 0 and 1', {
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
        if (this.repository) {
            try {
                this.repository.save(fullMetrics);
            }
            catch (error) {
                logger.warn('Failed to persist metric to SQLite', {
                    executionId: fullMetrics.executionId,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
        logger.debug('Performance tracked', {
            agentId: metrics.agentId,
            taskType: metrics.taskType,
            success: metrics.success,
            durationMs: metrics.durationMs,
            cost: metrics.cost,
            qualityScore: metrics.qualityScore,
            totalMetrics: this.totalMetricsCount,
            persisted: !!this.repository,
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
    updateHeapForAgent(_agentId) {
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
        if (filter?.limit !== undefined) {
            if (typeof filter.limit !== 'number' || !Number.isFinite(filter.limit)) {
                throw new ValidationError('filter.limit must be a finite number', {
                    component: 'PerformanceTracker',
                    method: 'getMetrics',
                    providedValue: filter.limit,
                    constraint: 'Number.isFinite(limit)',
                });
            }
            if (!Number.isSafeInteger(filter.limit) || filter.limit <= 0) {
                throw new ValidationError('filter.limit must be a positive integer', {
                    component: 'PerformanceTracker',
                    method: 'getMetrics',
                    providedValue: filter.limit,
                    constraint: 'limit > 0 and integer',
                });
            }
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