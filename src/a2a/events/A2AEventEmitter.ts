/**
 * A2AEventEmitter - Central event bus for A2A events
 *
 * Broadcasts events to subscribers and maintains event buffer for reconnection.
 * Provides a pub/sub interface for real-time event notifications.
 */

import { A2AEvent } from './types.js';
import { EventBuffer } from './EventBuffer.js';

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
    for (const callback of this.subscribers) {
      try {
        callback(event);
      } catch (error) {
        // Don't let one subscriber's error affect others
        console.error('Event subscriber error:', error);
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
}

// Singleton instance for global event bus
let globalEmitter: A2AEventEmitter | null = null;

/**
 * Get the global event emitter singleton
 *
 * Creates the emitter on first access (lazy initialization).
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
 * Clears the singleton so a fresh instance is created on next access.
 */
export function resetGlobalEventEmitter(): void {
  globalEmitter = null;
}
