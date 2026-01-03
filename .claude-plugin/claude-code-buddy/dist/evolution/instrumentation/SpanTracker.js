import { v4 as uuid } from 'uuid';
import { StateError } from '../../errors/index.js';
export class ActiveSpan {
    tracker;
    context;
    resource;
    span;
    startTime;
    events = [];
    constructor(tracker, options, context, resource) {
        this.tracker = tracker;
        this.context = context;
        this.resource = resource;
        this.startTime = Date.now();
        this.span = {
            span_id: context.spanId,
            trace_id: context.traceId,
            parent_span_id: context.parentSpanId,
            task_id: resource['task.id'],
            execution_id: resource['execution.id'],
            name: options.name,
            kind: options.kind || 'internal',
            start_time: this.startTime,
            status: { code: 'UNSET' },
            attributes: options.attributes || {},
            resource,
            tags: options.tags,
            links: options.links,
        };
    }
    setStatus(status) {
        this.span.status = status;
    }
    setAttributes(attributes) {
        this.span.attributes = {
            ...this.span.attributes,
            ...attributes,
        };
    }
    setAttribute(key, value) {
        if (!this.span.attributes) {
            this.span.attributes = {};
        }
        this.span.attributes[key] = value;
    }
    addTags(tags) {
        if (!this.span.tags) {
            this.span.tags = [];
        }
        this.span.tags.push(...tags);
    }
    addEvent(name, attributes) {
        this.events.push({
            name,
            timestamp: Date.now(),
            attributes,
        });
    }
    addLink(link) {
        if (!this.span.links) {
            this.span.links = [];
        }
        this.span.links.push(link);
    }
    async end() {
        const endTime = Date.now();
        const duration = endTime - this.startTime;
        const completedSpan = {
            ...this.span,
            end_time: endTime,
            duration_ms: duration,
            events: this.events.length > 0 ? this.events : undefined,
        };
        await this.tracker.recordSpan(completedSpan);
        this.tracker.removeActiveSpan(this.span.span_id);
    }
    getContext() {
        return this.context;
    }
    get spanId() {
        return this.context.spanId;
    }
    get traceId() {
        return this.context.traceId;
    }
}
export class SpanTracker {
    store;
    currentTask;
    currentExecution;
    activeSpans = new Map();
    resource;
    constructor(options) {
        this.store = options.store;
        this.resource = {
            'service.name': options.serviceName || 'claude-code-buddy',
            'service.version': options.serviceVersion || '1.0.0',
            'deployment.environment': options.environment || 'dev',
        };
    }
    async startTask(input, metadata) {
        this.currentTask = await this.store.createTask(input, metadata);
        this.resource['task.id'] = this.currentTask.id;
        await this.store.updateTask(this.currentTask.id, {
            status: 'running',
            started_at: new Date(),
        });
        return this.currentTask;
    }
    async startExecution(metadata) {
        if (!this.currentTask) {
            throw new StateError('No active task. Call startTask() first.', {
                state: 'not_initialized',
                component: 'SpanTracker',
                method: 'startExecution',
                requiredState: 'active task',
                currentState: 'no task',
                action: 'call startTask() before startExecution()',
            });
        }
        this.currentExecution = await this.store.createExecution(this.currentTask.id, metadata);
        this.resource['execution.id'] = this.currentExecution.id;
        this.resource['execution.attempt'] = this.currentExecution.attempt_number;
        return this.currentExecution;
    }
    async endExecution(result, error) {
        if (!this.currentExecution) {
            throw new StateError('No active execution.', {
                state: 'invalid_state',
                component: 'SpanTracker',
                method: 'endExecution',
                requiredState: 'active execution',
                currentState: 'no execution',
                action: 'call startExecution() before endExecution()',
            });
        }
        await this.store.updateExecution(this.currentExecution.id, {
            status: error ? 'failed' : 'completed',
            completed_at: new Date(),
            result,
            error,
        });
        this.currentExecution = undefined;
    }
    async endTask(status) {
        if (!this.currentTask) {
            throw new StateError('No active task.', {
                state: 'invalid_state',
                component: 'SpanTracker',
                method: 'endTask',
                requiredState: 'active task',
                currentState: 'no task',
                action: 'call startTask() before endTask()',
            });
        }
        await this.endAllSpans();
        await this.store.updateTask(this.currentTask.id, {
            status,
            completed_at: new Date(),
        });
        this.currentTask = undefined;
        this.currentExecution = undefined;
    }
    getCurrentTask() {
        return this.currentTask;
    }
    getCurrentExecution() {
        return this.currentExecution;
    }
    startSpan(options) {
        const spanId = uuid();
        const traceId = options.parentSpan
            ? options.parentSpan.traceId
            : uuid();
        const parentSpanId = options.parentSpan?.spanId;
        const context = {
            traceId,
            spanId,
            parentSpanId,
        };
        const activeSpan = new ActiveSpan(this, options, context, this.resource);
        this.activeSpans.set(spanId, activeSpan);
        return activeSpan;
    }
    async recordSpan(span) {
        await this.store.recordSpan(span);
    }
    removeActiveSpan(spanId) {
        this.activeSpans.delete(spanId);
    }
    getActiveSpans() {
        return Array.from(this.activeSpans.values());
    }
    async endAllSpans() {
        const spans = Array.from(this.activeSpans.values());
        for (const span of spans) {
            await span.end();
        }
    }
    setResource(attributes) {
        this.resource = {
            ...this.resource,
            ...attributes,
        };
    }
    async cleanup() {
        await this.endAllSpans();
        this.currentTask = undefined;
        this.currentExecution = undefined;
    }
}
let globalTracker = null;
export function setGlobalTracker(tracker) {
    globalTracker = tracker;
}
export function getGlobalTracker() {
    if (!globalTracker) {
        throw new StateError('Global tracker not initialized. Call setGlobalTracker() first.', {
            state: 'not_initialized',
            component: 'SpanTracker',
            method: 'getGlobalTracker',
            requiredState: 'initialized global tracker',
            currentState: 'uninitialized',
            action: 'call setGlobalTracker() before getGlobalTracker()',
        });
    }
    return globalTracker;
}
//# sourceMappingURL=SpanTracker.js.map