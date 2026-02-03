import { logger } from '../../utils/logger.js';
export class A2AMetrics {
    static instance = null;
    metrics;
    enabled;
    constructor() {
        this.metrics = new Map();
        this.enabled = process.env.A2A_METRICS_ENABLED !== 'false';
        if (this.enabled) {
            logger.info('[A2A Metrics] Metrics collection enabled');
        }
    }
    static getInstance() {
        if (!A2AMetrics.instance) {
            A2AMetrics.instance = new A2AMetrics();
        }
        return A2AMetrics.instance;
    }
    static resetInstance() {
        A2AMetrics.instance = null;
    }
    incrementCounter(name, labels = {}, value = 1) {
        if (!this.enabled)
            return;
        if (!Number.isFinite(value)) {
            logger.error('[A2A Metrics] Counter increment value must be finite', {
                name,
                value,
                labels
            });
            return;
        }
        if (value < 0) {
            logger.error('[A2A Metrics] Counter increment value must be non-negative', {
                name,
                value,
                labels
            });
            return;
        }
        const key = this.getKey(name, labels);
        const existing = this.metrics.get(key);
        if (existing) {
            existing.value += value;
            existing.timestamp = Date.now();
        }
        else {
            this.metrics.set(key, {
                type: 'counter',
                value,
                labels,
                timestamp: Date.now(),
            });
        }
        logger.debug(`[A2A Metrics] Counter ${name} = ${this.metrics.get(key)?.value}`, labels);
    }
    setGauge(name, value, labels = {}) {
        if (!this.enabled)
            return;
        if (!Number.isFinite(value)) {
            logger.error('[A2A Metrics] Gauge value must be finite', {
                name,
                value,
                labels
            });
            return;
        }
        const key = this.getKey(name, labels);
        this.metrics.set(key, {
            type: 'gauge',
            value,
            labels,
            timestamp: Date.now(),
        });
        logger.debug(`[A2A Metrics] Gauge ${name} = ${value}`, labels);
    }
    recordHistogram(name, value, labels = {}) {
        if (!this.enabled)
            return;
        if (!Number.isFinite(value)) {
            logger.error('[A2A Metrics] Histogram value must be finite', {
                name,
                value,
                labels
            });
            return;
        }
        if (value < 0) {
            logger.error('[A2A Metrics] Histogram value must be non-negative', {
                name,
                value,
                labels
            });
            return;
        }
        const key = this.getKey(name, labels);
        this.metrics.set(key, {
            type: 'histogram',
            value,
            labels,
            timestamp: Date.now(),
        });
        logger.debug(`[A2A Metrics] Histogram ${name} = ${value}`, labels);
    }
    getValue(name, labels = {}) {
        const key = this.getKey(name, labels);
        return this.metrics.get(key)?.value;
    }
    getSnapshot() {
        return new Map(this.metrics);
    }
    clear() {
        this.metrics.clear();
        logger.debug('[A2A Metrics] All metrics cleared');
    }
    setEnabled(enabled) {
        this.enabled = enabled;
        logger.info(`[A2A Metrics] Metrics collection ${enabled ? 'enabled' : 'disabled'}`);
    }
    getKey(name, labels) {
        const labelStr = Object.entries(labels)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([k, v]) => `${k}=${v}`)
            .join(',');
        return labelStr ? `${name}{${labelStr}}` : name;
    }
}
export const METRIC_NAMES = {
    TASKS_SUBMITTED: 'a2a.tasks.submitted',
    TASKS_COMPLETED: 'a2a.tasks.completed',
    TASKS_FAILED: 'a2a.tasks.failed',
    TASKS_TIMEOUT: 'a2a.tasks.timeout',
    TASKS_CANCELED: 'a2a.tasks.canceled',
    TASK_DURATION_MS: 'a2a.task.duration_ms',
    QUEUE_SIZE: 'a2a.queue.size',
    QUEUE_DEPTH: 'a2a.queue.depth',
    HEARTBEAT_SUCCESS: 'a2a.heartbeat.success',
    HEARTBEAT_FAILURE: 'a2a.heartbeat.failure',
    AGENTS_ACTIVE: 'a2a.agents.active',
    AGENTS_STALE: 'a2a.agents.stale',
};
//# sourceMappingURL=A2AMetrics.js.map