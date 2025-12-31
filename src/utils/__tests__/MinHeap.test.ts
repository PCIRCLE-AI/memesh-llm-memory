/**
 * MinHeap Tests
 *
 * Comprehensive tests for generic min-heap data structure
 */

import { describe, it, expect } from 'vitest';
import { MinHeap } from '../MinHeap.js';

describe('MinHeap', () => {
  describe('constructor', () => {
    it('should create empty heap with custom comparator', () => {
      const heap = new MinHeap<number>((a, b) => a - b);
      expect(heap.size).toBe(0);
      expect(heap.isEmpty()).toBe(true);
    });

    it('should create heap with string comparator', () => {
      const heap = new MinHeap<string>((a, b) => a.localeCompare(b));
      expect(heap.isEmpty()).toBe(true);
    });

    it('should create heap with object comparator', () => {
      interface Item {
        priority: number;
        value: string;
      }
      const heap = new MinHeap<Item>((a, b) => a.priority - b.priority);
      expect(heap.isEmpty()).toBe(true);
    });
  });

  describe('push and peek', () => {
    it('should maintain min property with integers', () => {
      const heap = new MinHeap<number>((a, b) => a - b);

      heap.push(5);
      expect(heap.peek()).toBe(5);
      expect(heap.size).toBe(1);

      heap.push(3);
      expect(heap.peek()).toBe(3); // Min should be 3

      heap.push(7);
      expect(heap.peek()).toBe(3); // Still 3

      heap.push(1);
      expect(heap.peek()).toBe(1); // Now 1 is minimum

      expect(heap.size).toBe(4);
    });

    it('should handle duplicate values', () => {
      const heap = new MinHeap<number>((a, b) => a - b);

      heap.push(5);
      heap.push(3);
      heap.push(3);
      heap.push(5);

      expect(heap.peek()).toBe(3);
      expect(heap.size).toBe(4);
    });

    it('should work with custom objects', () => {
      interface Task {
        priority: number;
        name: string;
      }

      const heap = new MinHeap<Task>((a, b) => a.priority - b.priority);

      heap.push({ priority: 5, name: 'low' });
      heap.push({ priority: 1, name: 'critical' });
      heap.push({ priority: 3, name: 'medium' });

      expect(heap.peek()?.name).toBe('critical');
      expect(heap.size).toBe(3);
    });

    it('should work with Date objects', () => {
      const heap = new MinHeap<Date>((a, b) => a.getTime() - b.getTime());

      const date1 = new Date('2025-01-01');
      const date2 = new Date('2025-01-15');
      const date3 = new Date('2024-12-20');

      heap.push(date1);
      heap.push(date2);
      heap.push(date3);

      expect(heap.peek()?.getTime()).toBe(date3.getTime());
    });
  });

  describe('pop', () => {
    it('should extract elements in sorted order', () => {
      const heap = new MinHeap<number>((a, b) => a - b);

      const values = [5, 2, 8, 1, 9, 3];
      values.forEach(v => heap.push(v));

      const sorted: number[] = [];
      while (!heap.isEmpty()) {
        sorted.push(heap.pop()!);
      }

      expect(sorted).toEqual([1, 2, 3, 5, 8, 9]);
    });

    it('should return undefined for empty heap', () => {
      const heap = new MinHeap<number>((a, b) => a - b);
      expect(heap.pop()).toBeUndefined();
    });

    it('should handle single element', () => {
      const heap = new MinHeap<number>((a, b) => a - b);
      heap.push(42);

      expect(heap.pop()).toBe(42);
      expect(heap.isEmpty()).toBe(true);
      expect(heap.pop()).toBeUndefined();
    });

    it('should maintain heap property after multiple pops', () => {
      const heap = new MinHeap<number>((a, b) => a - b);

      [10, 5, 15, 3, 7, 12, 20].forEach(v => heap.push(v));

      expect(heap.pop()).toBe(3);
      expect(heap.peek()).toBe(5);

      expect(heap.pop()).toBe(5);
      expect(heap.peek()).toBe(7);

      expect(heap.size).toBe(5);
    });
  });

  describe('size and isEmpty', () => {
    it('should track size correctly', () => {
      const heap = new MinHeap<number>((a, b) => a - b);

      expect(heap.size).toBe(0);

      heap.push(1);
      expect(heap.size).toBe(1);

      heap.push(2);
      heap.push(3);
      expect(heap.size).toBe(3);

      heap.pop();
      expect(heap.size).toBe(2);

      heap.pop();
      heap.pop();
      expect(heap.size).toBe(0);
    });

    it('should report isEmpty correctly', () => {
      const heap = new MinHeap<number>((a, b) => a - b);

      expect(heap.isEmpty()).toBe(true);

      heap.push(1);
      expect(heap.isEmpty()).toBe(false);

      heap.pop();
      expect(heap.isEmpty()).toBe(true);
    });
  });

  describe('clear', () => {
    it('should remove all elements', () => {
      const heap = new MinHeap<number>((a, b) => a - b);

      [1, 2, 3, 4, 5].forEach(v => heap.push(v));
      expect(heap.size).toBe(5);

      heap.clear();

      expect(heap.size).toBe(0);
      expect(heap.isEmpty()).toBe(true);
      expect(heap.peek()).toBeUndefined();
      expect(heap.pop()).toBeUndefined();
    });
  });

  describe('toArray', () => {
    it('should return all elements (not necessarily sorted)', () => {
      const heap = new MinHeap<number>((a, b) => a - b);

      const values = [5, 2, 8, 1, 9, 3];
      values.forEach(v => heap.push(v));

      const array = heap.toArray();

      expect(array.length).toBe(6);
      expect(new Set(array)).toEqual(new Set(values)); // Same elements
    });

    it('should return empty array for empty heap', () => {
      const heap = new MinHeap<number>((a, b) => a - b);
      expect(heap.toArray()).toEqual([]);
    });
  });

  describe('stress tests', () => {
    it('should handle large number of elements efficiently', () => {
      const heap = new MinHeap<number>((a, b) => a - b);

      // Insert 10,000 random numbers
      const values: number[] = [];
      for (let i = 0; i < 10000; i++) {
        const value = Math.floor(Math.random() * 100000);
        values.push(value);
        heap.push(value);
      }

      expect(heap.size).toBe(10000);

      // Extract all and verify sorted order
      const sorted: number[] = [];
      while (!heap.isEmpty()) {
        sorted.push(heap.pop()!);
      }

      // Verify ascending order
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i]).toBeGreaterThanOrEqual(sorted[i - 1]);
      }
    });

    it('should handle interleaved push and pop operations', () => {
      const heap = new MinHeap<number>((a, b) => a - b);

      for (let i = 0; i < 100; i++) {
        heap.push(Math.random() * 1000);

        if (i % 3 === 0 && heap.size > 0) {
          heap.pop();
        }
      }

      // Verify heap maintains min property
      let prevMin = -Infinity;
      while (!heap.isEmpty()) {
        const current = heap.pop()!;
        expect(current).toBeGreaterThanOrEqual(prevMin);
        prevMin = current;
      }
    });
  });

  describe('edge cases', () => {
    it('should handle all equal values', () => {
      const heap = new MinHeap<number>((a, b) => a - b);

      [5, 5, 5, 5, 5].forEach(v => heap.push(v));

      expect(heap.peek()).toBe(5);
      expect(heap.size).toBe(5);

      const results = [heap.pop(), heap.pop(), heap.pop()];
      expect(results).toEqual([5, 5, 5]);
    });

    it('should handle negative numbers', () => {
      const heap = new MinHeap<number>((a, b) => a - b);

      [-5, 3, -10, 0, -2].forEach(v => heap.push(v));

      expect(heap.pop()).toBe(-10);
      expect(heap.pop()).toBe(-5);
      expect(heap.pop()).toBe(-2);
      expect(heap.pop()).toBe(0);
      expect(heap.pop()).toBe(3);
    });

    it('should handle max-heap with reversed comparator', () => {
      // Max-heap: reverse comparison
      const maxHeap = new MinHeap<number>((a, b) => b - a);

      [5, 2, 8, 1, 9, 3].forEach(v => maxHeap.push(v));

      // Should extract in descending order (max first)
      expect(maxHeap.pop()).toBe(9);
      expect(maxHeap.pop()).toBe(8);
      expect(maxHeap.pop()).toBe(5);
    });
  });

  describe('real-world use case: timestamp eviction', () => {
    it('should efficiently track oldest timestamps across agents', () => {
      interface HeapEntry {
        agentId: string;
        timestamp: Date;
      }

      const heap = new MinHeap<HeapEntry>((a, b) => {
        return a.timestamp.getTime() - b.timestamp.getTime();
      });

      // Simulate agents with different timestamps
      const now = Date.now();
      heap.push({ agentId: 'agent-1', timestamp: new Date(now - 5000) });
      heap.push({ agentId: 'agent-2', timestamp: new Date(now - 10000) });
      heap.push({ agentId: 'agent-3', timestamp: new Date(now - 2000) });

      // Should get oldest first (agent-2)
      const oldest = heap.pop();
      expect(oldest?.agentId).toBe('agent-2');

      // Next oldest (agent-1)
      const nextOldest = heap.pop();
      expect(nextOldest?.agentId).toBe('agent-1');

      // Newest last (agent-3)
      const newest = heap.pop();
      expect(newest?.agentId).toBe('agent-3');
    });
  });
});
