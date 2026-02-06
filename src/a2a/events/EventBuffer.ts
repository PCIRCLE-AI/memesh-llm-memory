/**
 * EventBuffer - Ring buffer for A2A events
 *
 * Stores the last N events for reconnection support via Last-Event-ID.
 * When buffer is full, oldest events are dropped.
 */

import { A2AEvent } from './types.js';

/** Maximum allowed buffer size to prevent excessive memory usage */
const MAX_BUFFER_SIZE = 10000;

export class EventBuffer {
  private buffer: A2AEvent[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 100) {
    if (maxSize < 1) {
      throw new Error('Buffer size must be at least 1');
    }
    if (maxSize > MAX_BUFFER_SIZE) {
      throw new Error(`Buffer size must not exceed ${MAX_BUFFER_SIZE} to prevent excessive memory usage`);
    }
    this.maxSize = maxSize;
  }

  /**
   * Add an event to the buffer
   * If buffer is full, oldest event is dropped
   */
  add(event: A2AEvent): void {
    this.buffer.push(event);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  /**
   * Get all events after the given event ID
   * Used for reconnection with Last-Event-ID
   *
   * @param lastEventId - The last event ID the client received
   * @returns Events after the given ID, or empty array if not found
   */
  getAfter(lastEventId: string): A2AEvent[] {
    const index = this.buffer.findIndex(e => e.id === lastEventId);
    if (index === -1) {
      return [];
    }
    return this.buffer.slice(index + 1);
  }

  /**
   * Get all events in chronological order
   */
  getAll(): A2AEvent[] {
    return [...this.buffer];
  }

  /**
   * Clear all events from buffer
   */
  clear(): void {
    this.buffer = [];
  }

  /**
   * Get current buffer size
   */
  get size(): number {
    return this.buffer.length;
  }
}
