/**
 * ✅ SECURITY FIX (HIGH-3): TaskQueue Input Validation Tests
 *
 * Tests for TaskQueue.listTasks() input validation to ensure:
 * 1. DoS prevention via array size limits
 * 2. SQL injection prevention via enum validation
 * 3. Integer overflow prevention
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'fs';
import { TaskQueue } from '../TaskQueue.js';
import { ValidationError } from '../ValidationError.js';

describe('TaskQueue - Input Validation Security (HIGH-3)', () => {
  let queue: TaskQueue;
  const testDbPath = '/tmp/test-taskqueue-security.db';

  beforeEach(() => {
    // Clean up any existing test database
    try {
      rmSync(testDbPath, { force: true });
      rmSync(`${testDbPath}-shm`, { force: true });
      rmSync(`${testDbPath}-wal`, { force: true });
    } catch {}

    queue = new TaskQueue('test-agent', testDbPath);

    // Create some test tasks
    queue.createTask({ name: 'Task 1', priority: 'normal' });
    queue.createTask({ name: 'Task 2', priority: 'high' });
    queue.createTask({ name: 'Task 3', priority: 'low' });
  });

  afterEach(() => {
    queue.close();

    // Clean up test database
    try {
      rmSync(testDbPath, { force: true });
      rmSync(`${testDbPath}-shm`, { force: true });
      rmSync(`${testDbPath}-wal`, { force: true });
    } catch {}
  });

  describe('DoS Prevention - Array Size Limits', () => {
    it('should accept reasonable state filter array (< 100 items)', () => {
      const states = ['SUBMITTED', 'WORKING', 'COMPLETED'];

      expect(() => queue.listTasks({ state: states })).not.toThrow();
    });

    it('should reject large state filter array (> 100 items)', () => {
      // Create array with 101 items (exceeds limit)
      const states = Array.from({ length: 101 }, () => 'SUBMITTED');

      expect(() => queue.listTasks({ state: states })).toThrow(ValidationError);
    });

    it('should reject massive state filter array (DoS attack)', () => {
      // Attempt DoS with 1000+ items
      const states = Array.from({ length: 1000 }, () => 'SUBMITTED');

      expect(() => queue.listTasks({ state: states })).toThrow(ValidationError);

      try {
        queue.listTasks({ state: states });
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('Too many items');
      }
    });

    it('should accept reasonable priority filter array', () => {
      const priorities = ['low', 'normal', 'high'];

      expect(() => queue.listTasks({ priority: priorities })).not.toThrow();
    });

    it('should reject large priority filter array (> 100 items)', () => {
      const priorities = Array.from({ length: 101 }, () => 'normal');

      expect(() => queue.listTasks({ priority: priorities })).toThrow(ValidationError);
    });
  });

  describe('SQL Injection Prevention - Enum Validation', () => {
    it('should accept valid task states', () => {
      const validStates = ['SUBMITTED', 'WORKING', 'COMPLETED', 'FAILED'];

      const results = queue.listTasks({ state: validStates });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should reject invalid task state (SQL injection attempt)', () => {
      const maliciousState = "SUBMITTED' OR '1'='1";

      expect(() => queue.listTasks({ state: [maliciousState] })).toThrow(ValidationError);
    });

    it('should reject SQL comment injection in state', () => {
      const maliciousState = 'SUBMITTED --';

      expect(() => queue.listTasks({ state: [maliciousState] })).toThrow(ValidationError);
    });

    it('should reject UNION attack in state', () => {
      const maliciousState = "SUBMITTED' UNION SELECT * FROM tasks --";

      expect(() => queue.listTasks({ state: [maliciousState] })).toThrow(ValidationError);
    });

    it('should accept valid priorities', () => {
      const validPriorities = ['low', 'normal', 'high', 'urgent'];

      const results = queue.listTasks({ priority: validPriorities });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
    });

    it('should reject invalid priority (SQL injection attempt)', () => {
      const maliciousPriority = "high' OR '1'='1";

      expect(() => queue.listTasks({ priority: [maliciousPriority] })).toThrow(
        ValidationError
      );
    });

    it('should reject uppercase state (case-sensitive validation)', () => {
      // States should be exact match
      const invalidState = 'submitted'; // lowercase

      expect(() => queue.listTasks({ state: [invalidState] })).toThrow(ValidationError);
    });
  });

  describe('Numeric Validation', () => {
    it('should accept valid limit values', () => {
      expect(() => queue.listTasks({ limit: 0 })).not.toThrow();
      expect(() => queue.listTasks({ limit: 10 })).not.toThrow();
      expect(() => queue.listTasks({ limit: 100 })).not.toThrow();
      expect(() => queue.listTasks({ limit: 10000 })).not.toThrow();
    });

    it('should reject negative limit', () => {
      expect(() => queue.listTasks({ limit: -1 })).toThrow(ValidationError);
      expect(() => queue.listTasks({ limit: -100 })).toThrow(ValidationError);
    });

    it('should reject non-integer limit', () => {
      expect(() => queue.listTasks({ limit: 10.5 })).toThrow(ValidationError);
      expect(() => queue.listTasks({ limit: NaN })).toThrow(ValidationError);
    });

    it('should reject limit exceeding maximum (DoS prevention)', () => {
      expect(() => queue.listTasks({ limit: 10001 })).toThrow(ValidationError);
      expect(() => queue.listTasks({ limit: 100000 })).toThrow(ValidationError);
    });

    it('should accept valid offset values', () => {
      // Note: SQL requires LIMIT when using OFFSET
      expect(() => queue.listTasks({ offset: 0, limit: 10 })).not.toThrow();
      expect(() => queue.listTasks({ offset: 10, limit: 10 })).not.toThrow();
      expect(() => queue.listTasks({ offset: 1000, limit: 10 })).not.toThrow();
    });

    it('should reject negative offset', () => {
      expect(() => queue.listTasks({ offset: -1 })).toThrow(ValidationError);
    });

    it('should reject non-integer offset', () => {
      expect(() => queue.listTasks({ offset: 10.5 })).toThrow(ValidationError);
    });
  });

  describe('Combined Filter Validation', () => {
    it('should validate multiple filters together', () => {
      // All valid
      expect(() =>
        queue.listTasks({
          state: ['SUBMITTED', 'WORKING'],
          priority: ['normal', 'high'],
          limit: 10,
          offset: 0,
        })
      ).not.toThrow();
    });

    it('should fail if any filter is invalid', () => {
      // Invalid state, valid priority
      expect(() =>
        queue.listTasks({
          state: ['INVALID_STATE'],
          priority: ['normal'],
        })
      ).toThrow(ValidationError);

      // Valid state, invalid priority
      expect(() =>
        queue.listTasks({
          state: ['SUBMITTED'],
          priority: ['invalid'],
        })
      ).toThrow(ValidationError);
    });

    it('should handle single value (non-array) filters', () => {
      // Single state
      expect(() => queue.listTasks({ state: 'SUBMITTED' })).not.toThrow();

      // Single priority
      expect(() => queue.listTasks({ priority: 'normal' })).not.toThrow();

      // Invalid single state
      expect(() => queue.listTasks({ state: 'INVALID' as any })).toThrow(ValidationError);
    });
  });

  describe('Actual Query Execution', () => {
    it('should return correct results with valid filters', () => {
      const task1 = queue.createTask({ name: 'Test 1', priority: 'high' });
      const task2 = queue.createTask({ name: 'Test 2', priority: 'low' });

      // Query high priority tasks
      const results = queue.listTasks({ priority: 'high' });

      expect(results.length).toBeGreaterThan(0);
      expect(results.some((t) => t.id === task1.id)).toBe(true);
      expect(results.some((t) => t.id === task2.id)).toBe(false);
    });

    it('should not leak data through SQL injection', () => {
      queue.createTask({ name: 'Secret Task', priority: 'urgent' });

      // Attempt to get all tasks via SQL injection
      try {
        queue.listTasks({ state: ["SUBMITTED' OR '1'='1" as any] });
        expect.fail('Should have thrown ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
      }

      // Verify only valid queries work
      const validResults = queue.listTasks({ state: 'SUBMITTED' });
      expect(validResults).toBeDefined();
    });
  });
});
