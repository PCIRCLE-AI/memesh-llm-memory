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
import { logger } from '../utils/logger.js';

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
   * ✅ FIX HIGH-11: Track wrapped handlers for proper cleanup
   * Maps original handler to array of wrapped handlers (one per subscription)
   *
   * Why array? If the same handler is subscribed multiple times, each subscription
   * should be independent and removable separately.
   *
   * Note: Using WeakMap with 'any' to handle generic type variance
   * Type safety is ensured through method signatures
   */
  private handlerMap: WeakMap<EventHandler<any>, Array<EventHandler<any>>> = new WeakMap();

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
   *
   * ✅ FIX HIGH-11: Each subscription gets its own wrapped handler
   * Previously, reusing wrapped handlers caused memory leaks when the same
   * handler was subscribed multiple times. Now each subscription is independent.
   */
  on<T = unknown>(eventType: UIEventTypeValue, handler: EventHandler<T>): UnsubscribeFunction {
    // ✅ FIX HIGH-11: Create a NEW wrapped handler for each subscription
    // This prevents memory leaks from reusing wrapped handlers
    const wrappedHandler = this.wrapHandlerWithErrorBoundary(handler, eventType);

    // Store the wrapped handler in the array for this original handler
    const wrappedHandlers = this.handlerMap.get(handler) || [];
    wrappedHandlers.push(wrappedHandler);
    this.handlerMap.set(handler, wrappedHandlers);

    this.emitter.on(eventType, wrappedHandler);

    // Return unsubscribe function that properly cleans up THIS specific subscription
    return () => {
      this.emitter.off(eventType, wrappedHandler);

      // Remove from handlerMap array
      const handlers = this.handlerMap.get(handler);
      if (handlers) {
        const index = handlers.indexOf(wrappedHandler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
        // Clean up empty array
        if (handlers.length === 0) {
          this.handlerMap.delete(handler);
        }
      }
    };
  }

  /**
   * Remove a specific listener
   * Uses the original handler reference to find and remove the wrapped handler
   *
   * ✅ FIX HIGH-11: Removes only the first wrapped handler
   * If the same handler was subscribed multiple times, this removes one subscription.
   * Use the returned unsubscribe function for more precise control.
   */
  off<T = unknown>(eventType: UIEventTypeValue, handler: EventHandler<T>): void {
    const wrappedHandlers = this.handlerMap.get(handler);
    if (wrappedHandlers && wrappedHandlers.length > 0) {
      // Remove the first wrapped handler
      const wrappedHandler = wrappedHandlers[0];
      this.emitter.off(eventType, wrappedHandler);

      // Remove from array
      wrappedHandlers.shift();

      // Clean up empty array
      if (wrappedHandlers.length === 0) {
        this.handlerMap.delete(handler);
      }
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
    return Object.values(UIEventType).reduce((counts, eventType) => {
      const count = this.emitter.listenerCount(eventType);
      if (count > 0) {
        counts[eventType] = count;
      }
      return counts;
    }, {} as Record<string, number>);
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
   *
   * FIXED P1-14: Now catches unhandled Promise rejections
   * - Detects if handler returns Promise
   * - Attaches .catch() to handle async rejections
   * - Prevents silent failures in async event handlers
   */
  private wrapHandlerWithErrorBoundary<T>(
    handler: EventHandler<T>,
    eventType: UIEventTypeValue
  ): EventHandler<T> {
    return (data: T) => {
      try {
        const result = handler(data);

        // FIXED P1-14: Handle async handlers that return Promise
        // Security Fix: Proper Promise type guard and return promise with .catch()
        if (
          result != null &&
          typeof (result as any).then === 'function' &&
          typeof (result as any).catch === 'function'
        ) {
          // Attach error handler and return the promise
          const promiseWithCatch = (result as Promise<unknown>).catch((error: unknown) => {
            // Log original error details for debugging
            logger.error('[UIEventBus] Async handler error:', {
              eventType,
              error: error instanceof Error ? error.stack || error.message : String(error),
              handlerType: 'async',
            });

            // Only emit error event if we're not already handling an error event
            if (eventType !== UIEventType.ERROR) {
              const errorEvent: ErrorEvent = {
                agentId: 'ui-event-bus',
                agentType: 'event-handler-async',
                taskDescription: `Handling ${eventType} event (async handler) [eventType: ${eventType}]`,
                error: error instanceof Error ? error : new Error(String(error)),
                timestamp: new Date(),
              };

              // Emit error immediately (emit is non-blocking)
              try {
                this.emit(UIEventType.ERROR, errorEvent);
              } catch (emitError) {
                // Last resort: log to console if error event emission fails
                console.error('UIEventBus: Failed to emit error event for async handler:', emitError);
                console.error('Original async handler error:', error);
              }
            }
          });

          // Return the promise with error handler attached
          return promiseWithCatch as any;
        }
      } catch (error) {
        // Handle synchronous errors
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
