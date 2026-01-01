/**
 * UIEventBus - Event System for Terminal UI
 *
 * Singleton event bus for coordinating UI updates across the terminal dashboard.
 * Handles progress indicators, success/error events, and metrics updates.
 *
 * Features:
 * - Type-safe event emission and subscription
 * - Error boundary for fault tolerance
 * - Unsubscribe functionality for memory management
 * - Multiple listeners per event type
 */

import { EventEmitter } from 'events';
import {
  UIEventType,
  UIEventTypeValue,
  ProgressIndicator,
  SuccessEvent,
  ErrorEvent,
  AgentStartEvent,
  AgentCompleteEvent,
  AttributionMessage,
  MetricsSnapshot,
} from './types.js';

type EventHandler<T = unknown> = (data: T) => void;
type UnsubscribeFunction = () => void;

/**
 * UIEventBus - Singleton Event Emitter
 *
 * Central event bus for all UI-related events in the terminal dashboard.
 */
export class UIEventBus {
  private static instance: UIEventBus;
  private emitter: EventEmitter;

  /**
   * Track wrapped handlers to prevent memory leaks
   * Maps original handler to wrapped handler for proper cleanup
   *
   * Note: Using WeakMap with 'any' to handle generic type variance
   * Type safety is ensured through method signatures
   */
  private handlerMap: WeakMap<EventHandler<any>, EventHandler<any>> = new WeakMap();

  private constructor() {
    this.emitter = new EventEmitter();
    // Remove default limit to support many listeners
    this.emitter.setMaxListeners(100);
  }

  /**
   * Get singleton instance
   */
  static getInstance(): UIEventBus {
    if (!UIEventBus.instance) {
      UIEventBus.instance = new UIEventBus();
    }
    return UIEventBus.instance;
  }

  /**
   * Emit a generic event
   *
   * Note: 'error' events require special handling in Node.js EventEmitter.
   * If no listeners exist for 'error' events, emitting would normally throw.
   * We prevent this by checking for listeners first.
   */
  emit(eventType: UIEventTypeValue, data: unknown): void {
    // Special handling for 'error' events - don't throw if no listeners
    if (eventType === 'error' && this.emitter.listenerCount('error') === 0) {
      // Silently ignore error events with no listeners
      return;
    }

    this.emitter.emit(eventType, data);
  }

  /**
   * Subscribe to a generic event
   * Returns unsubscribe function
   */
  on<T = unknown>(eventType: UIEventTypeValue, handler: EventHandler<T>): UnsubscribeFunction {
    // Check if this handler is already wrapped
    let wrappedHandler = this.handlerMap.get(handler) as EventHandler<T> | undefined;

    // If not wrapped yet, create and store the wrapped version
    if (!wrappedHandler) {
      wrappedHandler = this.wrapHandlerWithErrorBoundary(handler, eventType);
      this.handlerMap.set(handler, wrappedHandler);
    }

    this.emitter.on(eventType, wrappedHandler);

    // Return unsubscribe function that properly cleans up
    return () => {
      this.emitter.off(eventType, wrappedHandler as EventHandler<T>);
    };
  }

  /**
   * Remove a specific listener
   * Uses the original handler reference to find and remove the wrapped handler
   */
  off<T = unknown>(eventType: UIEventTypeValue, handler: EventHandler<T>): void {
    const wrappedHandler = this.handlerMap.get(handler) as EventHandler<T> | undefined;
    if (wrappedHandler) {
      this.emitter.off(eventType, wrappedHandler);
    }
  }

  /**
   * Remove all listeners for a specific event type
   * Helps prevent memory leaks in long-running processes
   */
  removeAllListenersForEvent(eventType: UIEventTypeValue): void {
    this.emitter.removeAllListeners(eventType);
  }

  /**
   * Emit progress event
   */
  emitProgress(data: ProgressIndicator): void {
    this.emit(UIEventType.PROGRESS, data);
  }

  /**
   * Subscribe to progress events
   * Returns unsubscribe function
   */
  onProgress(handler: EventHandler<ProgressIndicator>): UnsubscribeFunction {
    return this.on(UIEventType.PROGRESS, handler);
  }

  /**
   * Emit success event
   */
  emitSuccess(data: SuccessEvent): void {
    this.emit(UIEventType.SUCCESS, data);
  }

  /**
   * Subscribe to success events
   * Returns unsubscribe function
   */
  onSuccess(handler: EventHandler<SuccessEvent>): UnsubscribeFunction {
    return this.on(UIEventType.SUCCESS, handler);
  }

  /**
   * Emit error event
   */
  emitError(data: ErrorEvent): void {
    this.emit(UIEventType.ERROR, data);
  }

  /**
   * Subscribe to error events
   * Returns unsubscribe function
   */
  onError(handler: EventHandler<ErrorEvent>): UnsubscribeFunction {
    return this.on(UIEventType.ERROR, handler);
  }

  /**
   * Emit agent start event
   */
  emitAgentStart(data: AgentStartEvent): void {
    this.emit(UIEventType.AGENT_START, data);
  }

  /**
   * Subscribe to agent start events
   */
  onAgentStart(handler: EventHandler<AgentStartEvent>): UnsubscribeFunction {
    return this.on(UIEventType.AGENT_START, handler);
  }

  /**
   * Emit agent complete event
   */
  emitAgentComplete(data: AgentCompleteEvent): void {
    this.emit(UIEventType.AGENT_COMPLETE, data);
  }

  /**
   * Subscribe to agent complete events
   */
  onAgentComplete(handler: EventHandler<AgentCompleteEvent>): UnsubscribeFunction {
    return this.on(UIEventType.AGENT_COMPLETE, handler);
  }

  /**
   * Emit metrics update event
   */
  emitMetricsUpdate(data: MetricsSnapshot): void {
    this.emit(UIEventType.METRICS_UPDATE, data);
  }

  /**
   * Subscribe to metrics update events
   */
  onMetricsUpdate(handler: EventHandler): UnsubscribeFunction {
    return this.on(UIEventType.METRICS_UPDATE, handler);
  }

  /**
   * Emit attribution event
   */
  emitAttribution(data: AttributionMessage): void {
    this.emit(UIEventType.ATTRIBUTION, data);
  }

  /**
   * Subscribe to attribution events
   * Returns unsubscribe function
   */
  onAttribution(handler: EventHandler<AttributionMessage>): UnsubscribeFunction {
    return this.on(UIEventType.ATTRIBUTION, handler);
  }

  /**
   * Remove all listeners (for cleanup)
   */
  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }

  /**
   * Get listener count for a specific event type
   * Useful for detecting memory leaks
   */
  getListenerCount(eventType: UIEventTypeValue): number {
    return this.emitter.listenerCount(eventType);
  }

  /**
   * Get all listener counts (for debugging)
   * Returns a map of event types to listener counts
   */
  getAllListenerCounts(): Record<string, number> {
    const counts: Record<string, number> = {};

    // Get all event types
    const eventTypes = Object.values(UIEventType);

    for (const eventType of eventTypes) {
      const count = this.emitter.listenerCount(eventType);
      if (count > 0) {
        counts[eventType] = count;
      }
    }

    return counts;
  }

  /**
   * Check for potential memory leaks
   * Warns if any event type has an unusually high number of listeners
   *
   * @param threshold - Maximum listeners per event type (default: 10)
   * @returns Array of event types with excessive listeners
   */
  detectPotentialLeaks(threshold: number = 10): Array<{ eventType: string; count: number }> {
    const leaks: Array<{ eventType: string; count: number }> = [];
    const counts = this.getAllListenerCounts();

    for (const [eventType, count] of Object.entries(counts)) {
      if (count > threshold) {
        leaks.push({ eventType, count });
      }
    }

    return leaks;
  }

  /**
   * Wrap handler with error boundary
   * If handler throws, emit error event and continue processing other handlers
   */
  private wrapHandlerWithErrorBoundary<T>(
    handler: EventHandler<T>,
    eventType: UIEventTypeValue
  ): EventHandler<T> {
    return (data: T) => {
      try {
        handler(data);
      } catch (error) {
        // Only emit error event if we're not already handling an error event
        // This prevents infinite loops
        if (eventType !== UIEventType.ERROR) {
          const errorEvent: ErrorEvent = {
            agentId: 'ui-event-bus',
            agentType: 'event-handler',
            taskDescription: `Handling ${eventType} event`,
            error: error instanceof Error ? error : new Error(String(error)),
            timestamp: new Date(),
          };

          // Use the safe emit method which handles missing listeners
          // This is synchronous and tests expect it
          this.emit(UIEventType.ERROR, errorEvent);
        }
        // If error handler throws, silently continue (avoid infinite loops)
      }
    };
  }
}
