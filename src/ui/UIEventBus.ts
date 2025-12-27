/**
 * UIEventBus - Event system for Terminal UI
 *
 * Singleton event bus using Node.js EventEmitter
 * with error boundaries to prevent listener crashes
 */

import { EventEmitter } from 'events';
import { UIEventType, ProgressIndicator, SuccessEvent, ErrorEvent, MetricsSnapshot, AttributionMessage } from './types.js';

/**
 * UIEventBus Singleton
 *
 * Provides a centralized event system for the UI layer
 * with automatic error handling and memory management
 */
export class UIEventBus extends EventEmitter {
  private static instance: UIEventBus;

  /**
   * Private constructor - use getInstance() instead
   */
  private constructor() {
    super();
    // Set max listeners to prevent warnings
    this.setMaxListeners(50);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): UIEventBus {
    if (!UIEventBus.instance) {
      UIEventBus.instance = new UIEventBus();
    }
    return UIEventBus.instance;
  }

  /**
   * Wrap handler with error boundary to prevent listener errors from crashing the system
   * IMPORTANT: This ensures robustness - any error in event listeners is logged but doesn't break the event bus
   */
  private wrapHandler<T>(handler: (data: T) => void): (data: T) => void {
    return (data: T) => {
      try {
        handler(data);
      } catch (error) {
        console.error('[UIEventBus] Error in event handler:', error);
        // Emit handler error event for monitoring (use 'error' instead of EventEmitter's special 'error' handling)
        // Using 'error' event type directly (will only be caught if someone subscribes)
        const errorEvent = {
          handler: handler.name || 'anonymous',
          error: error instanceof Error ? error : new Error(String(error)),
          timestamp: new Date(),
        };

        // Check if there are any error listeners before emitting
        if (this.listenerCount('error') > 0) {
          this.emit('error', errorEvent);
        }
        // If no listeners, just log - don't throw unhandled error
      }
    };
  }

  // ===== Progress Events =====

  /**
   * Emit progress update
   */
  public emitProgress(progress: ProgressIndicator): void {
    this.emit(UIEventType.PROGRESS, progress);
  }

  /**
   * Subscribe to progress updates
   * Returns unsubscribe function
   */
  public onProgress(handler: (progress: ProgressIndicator) => void): () => void {
    const wrappedHandler = this.wrapHandler(handler);
    this.on(UIEventType.PROGRESS, wrappedHandler);
    return () => this.off(UIEventType.PROGRESS, wrappedHandler);
  }

  // ===== Agent Start Events =====

  /**
   * Emit agent start event
   */
  public emitAgentStart(data: { agentId: string; agentType: string; taskDescription: string }): void {
    this.emit(UIEventType.AGENT_START, data);
  }

  /**
   * Subscribe to agent start events
   * Returns unsubscribe function
   */
  public onAgentStart(handler: (data: { agentId: string; agentType: string; taskDescription: string }) => void): () => void {
    const wrappedHandler = this.wrapHandler(handler);
    this.on(UIEventType.AGENT_START, wrappedHandler);
    return () => this.off(UIEventType.AGENT_START, wrappedHandler);
  }

  // ===== Agent Complete Events =====

  /**
   * Emit agent complete event
   */
  public emitAgentComplete(data: { agentId: string; agentType: string; result: any }): void {
    this.emit(UIEventType.AGENT_COMPLETE, data);
  }

  /**
   * Subscribe to agent complete events
   * Returns unsubscribe function
   */
  public onAgentComplete(handler: (data: { agentId: string; agentType: string; result: any }) => void): () => void {
    const wrappedHandler = this.wrapHandler(handler);
    this.on(UIEventType.AGENT_COMPLETE, wrappedHandler);
    return () => this.off(UIEventType.AGENT_COMPLETE, wrappedHandler);
  }

  // ===== Success Events =====

  /**
   * Emit success event
   */
  public emitSuccess(success: SuccessEvent): void {
    this.emit(UIEventType.SUCCESS, success);
  }

  /**
   * Subscribe to success events
   * Returns unsubscribe function
   */
  public onSuccess(handler: (success: SuccessEvent) => void): () => void {
    const wrappedHandler = this.wrapHandler(handler);
    this.on(UIEventType.SUCCESS, wrappedHandler);
    return () => this.off(UIEventType.SUCCESS, wrappedHandler);
  }

  // ===== Error Events =====

  /**
   * Emit error event
   * NOTE: Uses UIEventType.ERROR ('error') which has special handling in EventEmitter
   * If no listeners, will not throw but will log warning
   */
  public emitError(error: ErrorEvent): void {
    // Check if there are any error listeners to avoid unhandled error
    if (this.listenerCount(UIEventType.ERROR) > 0) {
      this.emit(UIEventType.ERROR, error);
    } else {
      // No listeners - just log (don't throw unhandled error)
      console.warn('[UIEventBus] Error event emitted but no listeners:', error);
    }
  }

  /**
   * Subscribe to error events
   * Returns unsubscribe function
   */
  public onError(handler: (error: ErrorEvent) => void): () => void {
    const wrappedHandler = this.wrapHandler(handler);
    this.on(UIEventType.ERROR, wrappedHandler);
    return () => this.off(UIEventType.ERROR, wrappedHandler);
  }

  // ===== Metrics Events =====

  /**
   * Emit metrics update event
   */
  public emitMetricsUpdate(metrics: MetricsSnapshot): void {
    this.emit(UIEventType.METRICS_UPDATE, metrics);
  }

  /**
   * Subscribe to metrics update events
   * Returns unsubscribe function
   */
  public onMetricsUpdate(handler: (metrics: MetricsSnapshot) => void): () => void {
    const wrappedHandler = this.wrapHandler(handler);
    this.on(UIEventType.METRICS_UPDATE, wrappedHandler);
    return () => this.off(UIEventType.METRICS_UPDATE, wrappedHandler);
  }

  // ===== Attribution Events (Phase 3 Task 4) =====

  /**
   * Emit attribution message (success/error tracking)
   */
  public emitAttribution(attribution: AttributionMessage): void {
    this.emit(UIEventType.ATTRIBUTION, attribution);
  }

  /**
   * Subscribe to attribution messages
   * Returns unsubscribe function
   */
  public onAttribution(handler: (attribution: AttributionMessage) => void): () => void {
    const wrappedHandler = this.wrapHandler(handler);
    this.on(UIEventType.ATTRIBUTION, wrappedHandler);
    return () => this.off(UIEventType.ATTRIBUTION, wrappedHandler);
  }

  // ===== Memory Management =====

  /**
   * Remove all event listeners
   * IMPORTANT: Call this when shutting down to prevent memory leaks
   */
  public removeAllListeners(): this {
    return super.removeAllListeners();
  }
}
