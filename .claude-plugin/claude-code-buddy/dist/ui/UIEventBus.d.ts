import { UIEventTypeValue, ProgressIndicator, SuccessEvent, ErrorEvent, AgentStartEvent, AgentCompleteEvent, AttributionMessage, MetricsSnapshot } from './types.js';
type EventHandler<T = unknown> = (data: T) => void;
type UnsubscribeFunction = () => void;
export declare class UIEventBus {
    private static instance;
    private emitter;
    private handlerMap;
    private constructor();
    static getInstance(): UIEventBus;
    emit(eventType: UIEventTypeValue, data: unknown): void;
    on<T = unknown>(eventType: UIEventTypeValue, handler: EventHandler<T>): UnsubscribeFunction;
    off<T = unknown>(eventType: UIEventTypeValue, handler: EventHandler<T>): void;
    removeAllListenersForEvent(eventType: UIEventTypeValue): void;
    emitProgress(data: ProgressIndicator): void;
    onProgress(handler: EventHandler<ProgressIndicator>): UnsubscribeFunction;
    emitSuccess(data: SuccessEvent): void;
    onSuccess(handler: EventHandler<SuccessEvent>): UnsubscribeFunction;
    emitError(data: ErrorEvent): void;
    onError(handler: EventHandler<ErrorEvent>): UnsubscribeFunction;
    emitAgentStart(data: AgentStartEvent): void;
    onAgentStart(handler: EventHandler<AgentStartEvent>): UnsubscribeFunction;
    emitAgentComplete(data: AgentCompleteEvent): void;
    onAgentComplete(handler: EventHandler<AgentCompleteEvent>): UnsubscribeFunction;
    emitMetricsUpdate(data: MetricsSnapshot): void;
    onMetricsUpdate(handler: EventHandler): UnsubscribeFunction;
    emitAttribution(data: AttributionMessage): void;
    onAttribution(handler: EventHandler<AttributionMessage>): UnsubscribeFunction;
    removeAllListeners(): void;
    getListenerCount(eventType: UIEventTypeValue): number;
    getAllListenerCounts(): Record<string, number>;
    detectPotentialLeaks(threshold?: number): Array<{
        eventType: string;
        count: number;
    }>;
    private wrapHandlerWithErrorBoundary;
}
export {};
//# sourceMappingURL=UIEventBus.d.ts.map