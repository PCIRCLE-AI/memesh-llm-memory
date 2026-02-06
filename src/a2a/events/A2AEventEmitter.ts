/**
 * A2AEventEmitter - Central event bus for A2A events
 *
 * Broadcasts events to subscribers and maintains event buffer for reconnection.
 * Provides a pub/sub interface for real-time event notifications.
 */

import { A2AEvent } from './types.js';
import { EventBuffer } from './EventBuffer.js';
import { logger } from '../../utils/logger.js';

type EventCallback = (event: A2AEvent) => void;

export class A2AEventEmitter {
  private subscribers: Set<EventCallback> = new Set();
  private buffer: EventBuffer;

  constructor(bufferSize: number = 100) {
    this.buffer = new EventBuffer(bufferSize);
  }

  /**
   * Emit an event to all subscribers and store in buffer
   *
   * Events are stored in buffer first, then broadcast to all subscribers.
   * If a subscriber throws an error, it is caught and logged but does not
   * prevent other subscribers from receiving the event.
   *
   * @param event - The event to emit
   */
  emit(event: A2AEvent): void {
    this.buffer.add(event);
    // Snapshot subscribers to handle concurrent modifications safely
    const subscribers = Array.from(this.subscribers);
    for (const callback of subscribers) {
      try {
        callback(event);
      } catch (error) {
        // Don't let one subscriber's error affect others
        logger.error('[A2AEventEmitter] Event subscriber error', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
      }
    }
  }

  /**
   * Subscribe to events
   *
   * @param callback - Function to call when an event is emitted
   * @returns Unsubscribe function to remove the subscription
   */
  subscribe(callback: EventCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * Get events after the given event ID (for reconnection)
   *
   * Used for SSE reconnection with Last-Event-ID header.
   * Returns all buffered events if lastEventId is undefined.
   *
   * @param lastEventId - Last event ID received, or undefined for all events
   * @returns Array of events after the given ID
   */
  getEventsAfter(lastEventId: string | undefined): A2AEvent[] {
    if (lastEventId === undefined) {
      return this.buffer.getAll();
    }
    return this.buffer.getAfter(lastEventId);
  }

  /**
   * Get count of active subscribers
   */
  get subscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Clear all events from buffer (mainly for testing)
   */
  clearBuffer(): void {
    this.buffer.clear();
  }

  /**
   * Dispose the emitter and release all resources
   *
   * Clears all subscribers and the event buffer. Call this when the emitter
   * is no longer needed to ensure proper cleanup.
   */
  dispose(): void {
    this.subscribers.clear();
    this.buffer.clear();
  }
}

// Singleton instance for global event bus
let globalEmitter: A2AEventEmitter | null = null;

/**
 * Get the global event emitter singleton
 *
 * Creates the emitter on first access (lazy initialization).
 *
 * **Thread Safety**: This singleton is intended for single-process use only.
 * In multi-process environments (e.g., cluster mode), each process will have
 * its own independent instance. For distributed scenarios, use an external
 * event bus (Redis Pub/Sub, NATS, etc.) instead.
 *
 * @returns The global A2AEventEmitter instance
 */
export function getGlobalEventEmitter(): A2AEventEmitter {
  if (!globalEmitter) {
    globalEmitter = new A2AEventEmitter();
  }
  return globalEmitter;
}

/**
 * Reset the global event emitter (for testing)
 *
 * Disposes the existing emitter and clears the singleton so a fresh
 * instance is created on next access.
 */
export function resetGlobalEventEmitter(): void {
  if (globalEmitter) {
    globalEmitter.dispose();
  }
  globalEmitter = null;
}
