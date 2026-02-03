import { EventEmitter } from 'events';
import { UIEventType, } from './types.js';
import { logger } from '../utils/logger.js';
export class UIEventBus {
    static instance;
    emitter;
    handlerMap = new WeakMap();
    constructor() {
        this.emitter = new EventEmitter();
        this.emitter.setMaxListeners(100);
    }
    static getInstance() {
        if (!UIEventBus.instance) {
            UIEventBus.instance = new UIEventBus();
        }
        return UIEventBus.instance;
    }
    emit(eventType, data) {
        if (eventType === 'error' && this.emitter.listenerCount('error') === 0) {
            return;
        }
        this.emitter.emit(eventType, data);
    }
    on(eventType, handler) {
        const wrappedHandler = this.wrapHandlerWithErrorBoundary(handler, eventType);
        const wrappedHandlers = this.handlerMap.get(handler) || [];
        wrappedHandlers.push(wrappedHandler);
        this.handlerMap.set(handler, wrappedHandlers);
        this.emitter.on(eventType, wrappedHandler);
        return () => {
            this.emitter.off(eventType, wrappedHandler);
            const handlers = this.handlerMap.get(handler);
            if (handlers) {
                const index = handlers.indexOf(wrappedHandler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
                if (handlers.length === 0) {
                    this.handlerMap.delete(handler);
                }
            }
        };
    }
    off(eventType, handler) {
        const wrappedHandlers = this.handlerMap.get(handler);
        if (wrappedHandlers && wrappedHandlers.length > 0) {
            const wrappedHandler = wrappedHandlers[0];
            this.emitter.off(eventType, wrappedHandler);
            wrappedHandlers.shift();
            if (wrappedHandlers.length === 0) {
                this.handlerMap.delete(handler);
            }
        }
    }
    removeAllListenersForEvent(eventType) {
        this.emitter.removeAllListeners(eventType);
    }
    emitProgress(data) {
        this.emit(UIEventType.PROGRESS, data);
    }
    onProgress(handler) {
        return this.on(UIEventType.PROGRESS, handler);
    }
    emitSuccess(data) {
        this.emit(UIEventType.SUCCESS, data);
    }
    onSuccess(handler) {
        return this.on(UIEventType.SUCCESS, handler);
    }
    emitError(data) {
        this.emit(UIEventType.ERROR, data);
    }
    onError(handler) {
        return this.on(UIEventType.ERROR, handler);
    }
    emitAgentStart(data) {
        this.emit(UIEventType.AGENT_START, data);
    }
    onAgentStart(handler) {
        return this.on(UIEventType.AGENT_START, handler);
    }
    emitAgentComplete(data) {
        this.emit(UIEventType.AGENT_COMPLETE, data);
    }
    onAgentComplete(handler) {
        return this.on(UIEventType.AGENT_COMPLETE, handler);
    }
    emitMetricsUpdate(data) {
        this.emit(UIEventType.METRICS_UPDATE, data);
    }
    onMetricsUpdate(handler) {
        return this.on(UIEventType.METRICS_UPDATE, handler);
    }
    emitAttribution(data) {
        this.emit(UIEventType.ATTRIBUTION, data);
    }
    onAttribution(handler) {
        return this.on(UIEventType.ATTRIBUTION, handler);
    }
    removeAllListeners() {
        this.emitter.removeAllListeners();
    }
    getListenerCount(eventType) {
        return this.emitter.listenerCount(eventType);
    }
    getAllListenerCounts() {
        return Object.values(UIEventType).reduce((counts, eventType) => {
            const count = this.emitter.listenerCount(eventType);
            if (count > 0) {
                counts[eventType] = count;
            }
            return counts;
        }, {});
    }
    detectPotentialLeaks(threshold = 10) {
        const leaks = [];
        const counts = this.getAllListenerCounts();
        for (const [eventType, count] of Object.entries(counts)) {
            if (count > threshold) {
                leaks.push({ eventType, count });
            }
        }
        return leaks;
    }
    wrapHandlerWithErrorBoundary(handler, eventType) {
        return (data) => {
            try {
                const result = handler(data);
                if (result != null &&
                    typeof result.then === 'function' &&
                    typeof result.catch === 'function') {
                    const promiseWithCatch = result.catch((error) => {
                        logger.error('[UIEventBus] Async handler error:', {
                            eventType,
                            error: error instanceof Error ? error.stack || error.message : String(error),
                            handlerType: 'async',
                        });
                        if (eventType !== UIEventType.ERROR) {
                            const errorEvent = {
                                agentId: 'ui-event-bus',
                                agentType: 'event-handler-async',
                                taskDescription: `Handling ${eventType} event (async handler) [eventType: ${eventType}]`,
                                error: error instanceof Error ? error : new Error(String(error)),
                                timestamp: new Date(),
                            };
                            try {
                                this.emit(UIEventType.ERROR, errorEvent);
                            }
                            catch (emitError) {
                                console.error('UIEventBus: Failed to emit error event for async handler:', emitError);
                                console.error('Original async handler error:', error);
                            }
                        }
                    });
                    return promiseWithCatch;
                }
            }
            catch (error) {
                if (eventType !== UIEventType.ERROR) {
                    const errorEvent = {
                        agentId: 'ui-event-bus',
                        agentType: 'event-handler',
                        taskDescription: `Handling ${eventType} event`,
                        error: error instanceof Error ? error : new Error(String(error)),
                        timestamp: new Date(),
                    };
                    this.emit(UIEventType.ERROR, errorEvent);
                }
            }
        };
    }
}
//# sourceMappingURL=UIEventBus.js.map