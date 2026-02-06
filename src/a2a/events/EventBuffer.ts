/**
 * EventBuffer - Circular buffer for A2A events with O(1) operations
 *
 * Stores the last N events for reconnection support via Last-Event-ID.
 * When buffer is full, oldest events are dropped.
 *
 * Performance characteristics:
 * - add(): O(1) - Uses circular buffer, no array shifting
 * - getAfter(): O(k) where k is the number of events after the given ID
 *   - ID lookup is O(1) via hash map
 * - getAll(): O(n) where n is the buffer size
 * - clear(): O(1)
 */

import { A2AEvent } from './types.js';

/** Maximum allowed buffer size to prevent excessive memory usage */
const MAX_BUFFER_SIZE = 10000;

/**
 * Circular buffer for event storage with O(1) add operations.
 * Uses a fixed-size array with head/tail pointers.
 */
export class EventBuffer {
  private buffer: (A2AEvent | undefined)[];
  private head: number = 0; // Points to oldest element
  private tail: number = 0; // Points to next write position
  private count: number = 0;
  private readonly maxSize: number;
  private idToIndex: Map<string, number> = new Map(); // O(1) lookup by ID

  constructor(maxSize: number = 100) {
    if (maxSize < 1) {
      throw new Error('Buffer size must be at least 1');
    }
    if (maxSize > MAX_BUFFER_SIZE) {
      throw new Error(
        `Buffer size must not exceed ${MAX_BUFFER_SIZE} to prevent excessive memory usage`
      );
    }
    this.maxSize = maxSize;
    this.buffer = new Array(maxSize);
  }

  /**
   * Add an event to the buffer.
   * If buffer is full, oldest event is dropped.
   *
   * Time complexity: O(1)
   */
  add(event: A2AEvent): void {
    // If buffer is full, remove oldest and its index mapping
    if (this.count === this.maxSize) {
      const oldEvent = this.buffer[this.head];
      if (oldEvent) {
        this.idToIndex.delete(oldEvent.id);
      }
      this.head = (this.head + 1) % this.maxSize;
      this.count--;
    }

    // Add new event
    this.buffer[this.tail] = event;
    this.idToIndex.set(event.id, this.tail);
    this.tail = (this.tail + 1) % this.maxSize;
    this.count++;
  }

  /**
   * Get all events after the given event ID.
   * Used for reconnection with Last-Event-ID.
   *
   * Time complexity: O(1) for ID lookup + O(k) for collecting k events
   *
   * @param lastEventId - The last event ID the client received
   * @returns Events after the given ID, or empty array if not found
   */
  getAfter(lastEventId: string): A2AEvent[] {
    const idx = this.idToIndex.get(lastEventId);
    if (idx === undefined) {
      return []; // Event was evicted or not found
    }

    // Calculate position relative to head
    const result: A2AEvent[] = [];
    let pos = (idx + 1) % this.maxSize;

    // Iterate from after the found event to tail
    while (pos !== this.tail) {
      const event = this.buffer[pos];
      if (event) result.push(event);
      pos = (pos + 1) % this.maxSize;
    }
    return result;
  }

  /**
   * Get all events in chronological order.
   *
   * Time complexity: O(n) where n is the number of events
   */
  getAll(): A2AEvent[] {
    const result: A2AEvent[] = [];
    for (let i = 0; i < this.count; i++) {
      const idx = (this.head + i) % this.maxSize;
      const event = this.buffer[idx];
      if (event) result.push(event);
    }
    return result;
  }

  /**
   * Clear all events from buffer.
   *
   * Time complexity: O(1)
   */
  clear(): void {
    this.buffer = new Array(this.maxSize);
    this.head = 0;
    this.tail = 0;
    this.count = 0;
    this.idToIndex.clear();
  }

  /**
   * Get current buffer size.
   *
   * Time complexity: O(1)
   */
  get size(): number {
    return this.count;
  }
}
