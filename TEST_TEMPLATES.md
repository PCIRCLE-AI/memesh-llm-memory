# Test Templates and Examples
**Based on Memory Module Success Pattern**

This document provides concrete test templates and examples for writing comprehensive tests in the claude-code-buddy project.

---

## Table of Contents
1. [Unit Test Template](#unit-test-template)
2. [Integration Test Template](#integration-test-template)
3. [Edge Case Testing](#edge-case-testing)
4. [Error Path Testing](#error-path-testing)
5. [Concurrency Testing](#concurrency-testing)
6. [Real Examples from Memory Module](#real-examples-from-memory-module)

---

## Unit Test Template

### Basic Structure

```typescript
// tests/unit/[module]/[Component].test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Component } from '../../src/[module]/[Component].js';

describe('[Component]', () => {
  let component: Component;
  let mockDependency: MockType;

  beforeEach(() => {
    // Setup: Create fresh instance for each test
    mockDependency = createMockDependency();
    component = new Component({
      dependency: mockDependency,
      config: defaultConfig
    });
  });

  afterEach(() => {
    // Cleanup: Release resources, reset mocks
    component.cleanup?.();
    vi.clearAllMocks();
  });

  // 1. BASIC FUNCTIONALITY
  describe('Basic Functionality', () => {
    it('should initialize with default values', () => {
      expect(component.getValue()).toBe(defaultValue);
      expect(component.getStatus()).toBe('initialized');
    });

    it('should perform core operation successfully', async () => {
      const input = { data: 'test' };
      const result = await component.performOperation(input);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedOutput);
    });

    it('should update state correctly', () => {
      component.setState({ value: 42 });
      expect(component.getValue()).toBe(42);
    });
  });

  // 2. EDGE CASES
  describe('Edge Cases', () => {
    describe('Numeric Edge Cases', () => {
      it('should handle zero', () => {
        expect(component.calculate(0)).toBe(0);
      });

      it('should handle negative numbers', () => {
        expect(component.calculate(-1)).toBe(-1);
      });

      it('should handle very large numbers', () => {
        const result = component.calculate(Number.MAX_SAFE_INTEGER);
        expect(result).toBeLessThanOrEqual(Number.MAX_SAFE_INTEGER);
      });

      it('should handle NaN gracefully', () => {
        const result = component.calculate(NaN);
        expect(result).toBe(0); // or appropriate default
        // OR: expect(() => component.calculate(NaN)).toThrow();
      });

      it('should handle Infinity', () => {
        const result = component.calculate(Infinity);
        expect(result).toBe(MAX_VALUE); // capped value
      });

      it('should handle division by zero', () => {
        expect(() => component.divide(10, 0)).toThrow(/division by zero/i);
      });
    });

    describe('String Edge Cases', () => {
      it('should handle empty string', () => {
        expect(() => component.process('')).toThrow(/empty input/i);
      });

      it('should handle very long string', () => {
        const longString = 'a'.repeat(10000);
        const result = component.process(longString);
        expect(result).toBeDefined();
      });

      it('should handle special characters', () => {
        const special = '!@#$%^&*(){}[]<>?/\\|';
        const result = component.process(special);
        expect(result).toBeDefined();
      });

      it('should handle unicode characters', () => {
        const unicode = '你好世界 🚀 مرحبا';
        const result = component.process(unicode);
        expect(result).toBeDefined();
      });
    });

    describe('Null/Undefined Cases', () => {
      it('should throw on null input', () => {
        expect(() => component.performOperation(null)).toThrow();
      });

      it('should throw on undefined input', () => {
        expect(() => component.performOperation(undefined)).toThrow();
      });

      it('should handle optional parameters', () => {
        // When parameter is optional
        const result = component.performOperation({ required: 'value' });
        expect(result).toBeDefined();
      });
    });

    describe('Array/Collection Edge Cases', () => {
      it('should handle empty array', () => {
        const result = component.processArray([]);
        expect(result).toEqual([]);
      });

      it('should handle single element array', () => {
        const result = component.processArray([1]);
        expect(result).toEqual([1]);
      });

      it('should handle large array', () => {
        const largeArray = Array(10000).fill(0).map((_, i) => i);
        const result = component.processArray(largeArray);
        expect(result).toHaveLength(10000);
      });
    });

    describe('Boundary Conditions', () => {
      it('should handle exact threshold value', () => {
        const threshold = 100;
        component.setThreshold(threshold);

        expect(component.checkThreshold(100)).toBe(true);
        expect(component.checkThreshold(99)).toBe(false);
        expect(component.checkThreshold(101)).toBe(true);
      });

      it('should handle value at upper limit', () => {
        const maxValue = 1000;
        expect(component.setValue(maxValue)).toBe(maxValue);
        expect(() => component.setValue(maxValue + 1)).toThrow();
      });

      it('should handle value at lower limit', () => {
        const minValue = 0;
        expect(component.setValue(minValue)).toBe(minValue);
        expect(() => component.setValue(minValue - 1)).toThrow();
      });
    });
  });

  // 3. ERROR PATHS
  describe('Error Handling', () => {
    it('should throw ValidationError on invalid input', () => {
      expect(() => component.performOperation({ invalid: true }))
        .toThrow(ValidationError);
    });

    it('should throw with descriptive error message', () => {
      expect(() => component.divide(10, 0))
        .toThrow(/cannot divide by zero/i);
    });

    it('should handle dependency failure gracefully', () => {
      mockDependency.operation.mockRejectedValue(new Error('Dependency failed'));

      expect(() => component.performOperation(input))
        .rejects.toThrow(/dependency failed/i);
    });

    it('should clean up resources on error', async () => {
      mockDependency.operation.mockRejectedValue(new Error('Failure'));
      const cleanupSpy = vi.spyOn(component, 'cleanup');

      try {
        await component.performOperation(input);
      } catch (e) {
        // Expected
      }

      expect(cleanupSpy).toHaveBeenCalled();
    });

    it('should retry on transient errors', async () => {
      mockDependency.operation
        .mockRejectedValueOnce(new Error('Transient'))
        .mockResolvedValueOnce({ success: true });

      const result = await component.performOperationWithRetry(input);
      expect(result.success).toBe(true);
      expect(mockDependency.operation).toHaveBeenCalledTimes(2);
    });

    it('should not retry on permanent errors', async () => {
      mockDependency.operation.mockRejectedValue(new ValidationError('Invalid'));

      await expect(component.performOperationWithRetry(input))
        .rejects.toThrow(ValidationError);
      expect(mockDependency.operation).toHaveBeenCalledTimes(1);
    });
  });

  // 4. CONCURRENT OPERATIONS
  describe('Concurrency', () => {
    it('should handle concurrent operations', async () => {
      const promises = Array(10).fill(0).map((_, i) =>
        component.performOperation({ id: i })
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      expect(results.every(r => r.success)).toBe(true);
    });

    it('should handle race conditions correctly', async () => {
      let counter = 0;
      component.onUpdate(() => counter++);

      const promises = Array(100).fill(0).map(() =>
        component.increment()
      );

      await Promise.all(promises);
      expect(component.getValue()).toBe(100);
      expect(counter).toBe(100); // No missed updates
    });

    it('should prevent concurrent modifications', async () => {
      const promise1 = component.updateState({ value: 1 });
      const promise2 = component.updateState({ value: 2 });

      await Promise.all([promise1, promise2]);

      // Should have one of the two values, not corrupted state
      const finalValue = component.getValue();
      expect([1, 2]).toContain(finalValue);
    });
  });

  // 5. PERFORMANCE
  describe('Performance', () => {
    it('should complete operation within time limit', async () => {
      const start = Date.now();
      await component.performOperation(input);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // 100ms
    });

    it('should not leak memory', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      for (let i = 0; i < 1000; i++) {
        component.performOperation(input);
      }

      // Force GC if available
      if (global.gc) global.gc();

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Should not increase by more than 10MB for 1000 operations
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should scale linearly with input size', async () => {
      const times: number[] = [];

      for (const size of [100, 200, 400, 800]) {
        const input = Array(size).fill(0);
        const start = Date.now();
        await component.processArray(input);
        times.push(Date.now() - start);
      }

      // Time should roughly double when input doubles
      const ratio1 = times[1] / times[0];
      const ratio2 = times[2] / times[1];
      const ratio3 = times[3] / times[2];

      // Allow 50% tolerance for system variance
      expect(ratio1).toBeGreaterThan(1.5);
      expect(ratio1).toBeLessThan(2.5);
    });
  });

  // 6. STATE MANAGEMENT
  describe('State Management', () => {
    it('should maintain consistent state', () => {
      component.setState({ value: 42, status: 'active' });

      expect(component.getValue()).toBe(42);
      expect(component.getStatus()).toBe('active');
    });

    it('should emit events on state change', () => {
      const listener = vi.fn();
      component.onStateChange(listener);

      component.setState({ value: 42 });

      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ value: 42 })
      );
    });

    it('should allow state reset', () => {
      component.setState({ value: 42 });
      component.reset();

      expect(component.getValue()).toBe(defaultValue);
    });
  });

  // 7. INTEGRATION WITH DEPENDENCIES
  describe('Dependency Integration', () => {
    it('should call dependency with correct parameters', async () => {
      await component.performOperation(input);

      expect(mockDependency.operation).toHaveBeenCalledWith(
        expect.objectContaining({
          data: input.data
        })
      );
    });

    it('should transform dependency response correctly', async () => {
      mockDependency.operation.mockResolvedValue({ raw: 'data' });

      const result = await component.performOperation(input);

      expect(result.transformed).toBeDefined();
    });
  });
});
```

---

## Integration Test Template

### Full Workflow Integration

```typescript
// tests/integration/[feature]-complete.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  ComponentA,
  ComponentB,
  ComponentC
} from '../../src/[module]/index.js';

describe('[Feature] Complete Integration', () => {
  let serviceA: ComponentA;
  let serviceB: ComponentB;
  let serviceC: ComponentC;

  beforeAll(async () => {
    // Setup test environment (database, etc.)
    await setupTestEnvironment();
  });

  afterAll(async () => {
    // Cleanup test environment
    await cleanupTestEnvironment();
  });

  beforeEach(async () => {
    // Reset state between tests
    serviceA = new ComponentA();
    serviceB = new ComponentB();
    serviceC = new ComponentC();
    await clearDatabase();
  });

  describe('Happy Path - Complete Workflow', () => {
    it('should complete full user workflow', async () => {
      // Step 1: Create entity
      const created = await serviceA.create({
        name: 'Test Entity',
        type: 'test'
      });
      expect(created.id).toBeDefined();
      expect(created.status).toBe('created');

      // Step 2: Process entity
      const processed = await serviceB.process(created.id);
      expect(processed.status).toBe('processed');
      expect(processed.result).toBeDefined();

      // Step 3: Finalize
      const finalized = await serviceC.finalize(processed.id);
      expect(finalized.status).toBe('completed');

      // Step 4: Verify complete state
      const retrieved = await serviceA.get(finalized.id);
      expect(retrieved).toMatchObject({
        name: 'Test Entity',
        type: 'test',
        status: 'completed'
      });
    });

    it('should handle multiple concurrent workflows', async () => {
      const workflows = Array(10).fill(0).map((_, i) => ({
        name: `Entity ${i}`,
        type: 'test'
      }));

      const promises = workflows.map(async (entity) => {
        const created = await serviceA.create(entity);
        const processed = await serviceB.process(created.id);
        const finalized = await serviceC.finalize(processed.id);
        return finalized;
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(10);
      expect(results.every(r => r.status === 'completed')).toBe(true);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle creation failure', async () => {
      await expect(
        serviceA.create({ invalid: true })
      ).rejects.toThrow(ValidationError);
    });

    it('should rollback on processing failure', async () => {
      const created = await serviceA.create({ name: 'Test' });

      // Force processing to fail
      await expect(
        serviceB.process(created.id, { forceError: true })
      ).rejects.toThrow();

      // Verify rollback
      const retrieved = await serviceA.get(created.id);
      expect(retrieved.status).toBe('created'); // Not changed
    });

    it('should handle partial failure in batch operation', async () => {
      const entities = [
        { name: 'Valid 1' },
        { name: '' }, // Invalid - empty name
        { name: 'Valid 2' }
      ];

      const results = await serviceA.createBatch(entities);

      expect(results.successful).toHaveLength(2);
      expect(results.failed).toHaveLength(1);
      expect(results.failed[0].error).toContain('empty name');
    });
  });

  describe('Cross-Component Integration', () => {
    it('should propagate updates across components', async () => {
      const entity = await serviceA.create({ name: 'Test' });

      // Update in ServiceA
      await serviceA.update(entity.id, { name: 'Updated' });

      // Should be visible in ServiceB
      const fromB = await serviceB.get(entity.id);
      expect(fromB.name).toBe('Updated');

      // And in ServiceC
      const fromC = await serviceC.get(entity.id);
      expect(fromC.name).toBe('Updated');
    });

    it('should handle circular dependencies', async () => {
      const entityA = await serviceA.create({ name: 'A' });
      const entityB = await serviceA.create({ name: 'B' });

      // Create circular reference
      await serviceA.addRelation(entityA.id, entityB.id);
      await serviceA.addRelation(entityB.id, entityA.id);

      // Should detect cycle
      const hasCycle = await serviceA.detectCycle(entityA.id);
      expect(hasCycle).toBe(true);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistency under concurrent updates', async () => {
      const entity = await serviceA.create({ name: 'Test', counter: 0 });

      // 100 concurrent increments
      const promises = Array(100).fill(0).map(() =>
        serviceA.increment(entity.id)
      );

      await Promise.all(promises);

      const final = await serviceA.get(entity.id);
      expect(final.counter).toBe(100); // No lost updates
    });

    it('should handle transaction rollback correctly', async () => {
      const initialCount = await serviceA.count();

      try {
        await serviceA.transaction(async (tx) => {
          await tx.create({ name: 'Entity 1' });
          await tx.create({ name: 'Entity 2' });
          throw new Error('Force rollback');
        });
      } catch (e) {
        // Expected
      }

      const finalCount = await serviceA.count();
      expect(finalCount).toBe(initialCount); // No entities created
    });
  });

  describe('Performance Under Load', () => {
    it('should handle 1000 entities efficiently', async () => {
      const start = Date.now();

      const entities = Array(1000).fill(0).map((_, i) => ({
        name: `Entity ${i}`
      }));

      await serviceA.createBatch(entities);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(5000); // < 5 seconds
    });

    it('should maintain response time under load', async () => {
      // Create 1000 entities
      const entities = Array(1000).fill(0).map((_, i) => ({
        name: `Entity ${i}`
      }));
      await serviceA.createBatch(entities);

      // Query should still be fast
      const start = Date.now();
      const results = await serviceA.search({ name: 'Entity 500' });
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // < 100ms
      expect(results).toHaveLength(1);
    });
  });
});
```

---

## Edge Case Testing

### Comprehensive Edge Case Examples

```typescript
describe('Edge Cases - Comprehensive', () => {
  describe('Numeric Edge Cases', () => {
    const testCases = [
      { input: 0, expected: 0, description: 'zero' },
      { input: -0, expected: 0, description: 'negative zero' },
      { input: 1, expected: 1, description: 'one' },
      { input: -1, expected: -1, description: 'negative one' },
      { input: 0.1, expected: 0.1, description: 'decimal' },
      { input: Number.MAX_SAFE_INTEGER, expected: Number.MAX_SAFE_INTEGER, description: 'max safe integer' },
      { input: Number.MIN_SAFE_INTEGER, expected: Number.MIN_SAFE_INTEGER, description: 'min safe integer' },
      { input: Number.MAX_VALUE, expected: Number.MAX_VALUE, description: 'max value' },
      { input: Number.MIN_VALUE, expected: Number.MIN_VALUE, description: 'min value' },
      { input: Infinity, expected: null, description: 'positive infinity' },
      { input: -Infinity, expected: null, description: 'negative infinity' },
      { input: NaN, expected: null, description: 'NaN' },
    ];

    testCases.forEach(({ input, expected, description }) => {
      it(`should handle ${description} correctly`, () => {
        const result = component.process(input);
        if (expected === null) {
          expect(result).toBeNull();
        } else {
          expect(result).toBe(expected);
        }
      });
    });
  });

  describe('String Edge Cases', () => {
    const testCases = [
      { input: '', description: 'empty string', shouldThrow: true },
      { input: ' ', description: 'single space', shouldThrow: false },
      { input: '  ', description: 'multiple spaces', shouldThrow: false },
      { input: 'a', description: 'single character', shouldThrow: false },
      { input: 'a'.repeat(10000), description: 'very long string', shouldThrow: false },
      { input: '你好', description: 'unicode (Chinese)', shouldThrow: false },
      { input: '🚀', description: 'emoji', shouldThrow: false },
      { input: '\n\r\t', description: 'whitespace characters', shouldThrow: false },
      { input: '<script>alert("xss")</script>', description: 'HTML injection', shouldThrow: false },
      { input: "'; DROP TABLE users; --", description: 'SQL injection', shouldThrow: false },
    ];

    testCases.forEach(({ input, description, shouldThrow }) => {
      it(`should handle ${description}`, () => {
        if (shouldThrow) {
          expect(() => component.process(input)).toThrow();
        } else {
          const result = component.process(input);
          expect(result).toBeDefined();
        }
      });
    });
  });

  describe('Array Edge Cases', () => {
    it('should handle empty array', () => {
      expect(component.processArray([])).toEqual([]);
    });

    it('should handle single element', () => {
      expect(component.processArray([1])).toEqual([1]);
    });

    it('should handle duplicates', () => {
      const result = component.processArray([1, 1, 1]);
      expect(result).toEqual([1, 1, 1]); // or deduplicated if that's the behavior
    });

    it('should handle mixed types (if applicable)', () => {
      const mixed = [1, 'two', null, undefined, {}, []];
      const result = component.processArray(mixed);
      expect(result).toBeDefined();
    });
  });

  describe('Object Edge Cases', () => {
    it('should handle empty object', () => {
      expect(() => component.processObject({})).toThrow();
    });

    it('should handle nested objects', () => {
      const nested = { a: { b: { c: { d: 'deep' } } } };
      const result = component.processObject(nested);
      expect(result).toBeDefined();
    });

    it('should handle circular references', () => {
      const circular: any = { a: 1 };
      circular.self = circular;

      expect(() => component.processObject(circular)).toThrow(/circular/i);
    });
  });

  describe('Date/Time Edge Cases', () => {
    it('should handle epoch time (0)', () => {
      const date = new Date(0);
      expect(component.processDate(date)).toBeDefined();
    });

    it('should handle invalid date', () => {
      const invalid = new Date('invalid');
      expect(() => component.processDate(invalid)).toThrow();
    });

    it('should handle far future date', () => {
      const future = new Date('2999-12-31');
      expect(component.processDate(future)).toBeDefined();
    });

    it('should handle timezone edge cases', () => {
      // Test across timezone boundary
      const date = new Date('2024-01-01T00:00:00Z');
      const result = component.processDate(date);
      expect(result).toBeDefined();
    });
  });
});
```

---

## Error Path Testing

### Comprehensive Error Scenarios

```typescript
describe('Error Paths', () => {
  describe('Input Validation Errors', () => {
    it('should throw ValidationError on null input', () => {
      expect(() => component.process(null))
        .toThrow(ValidationError);
    });

    it('should throw with descriptive message', () => {
      expect(() => component.process({ invalid: true }))
        .toThrow(/invalid input.*missing required field/i);
    });

    it('should include field name in error', () => {
      try {
        component.process({ name: '' }); // Empty name
        fail('Should have thrown');
      } catch (e) {
        expect(e.message).toContain('name');
      }
    });
  });

  describe('System Errors', () => {
    it('should handle database connection failure', async () => {
      mockDB.connect.mockRejectedValue(new Error('Connection failed'));

      await expect(component.save(data))
        .rejects.toThrow(/connection failed/i);
    });

    it('should retry on transient errors', async () => {
      let attempts = 0;
      mockDB.save.mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Transient failure');
        }
        return Promise.resolve({ id: '123' });
      });

      const result = await component.saveWithRetry(data);
      expect(result.id).toBe('123');
      expect(attempts).toBe(3);
    });

    it('should not retry on permanent errors', async () => {
      let attempts = 0;
      mockDB.save.mockImplementation(() => {
        attempts++;
        throw new ValidationError('Invalid data');
      });

      await expect(component.saveWithRetry(data))
        .rejects.toThrow(ValidationError);
      expect(attempts).toBe(1); // No retries
    });

    it('should clean up resources after error', async () => {
      const cleanupSpy = vi.spyOn(component, 'cleanup');
      mockDB.save.mockRejectedValue(new Error('Failure'));

      try {
        await component.save(data);
      } catch (e) {
        // Expected
      }

      expect(cleanupSpy).toHaveBeenCalled();
    });
  });

  describe('Error Recovery', () => {
    it('should return fallback value on error', () => {
      mockService.getData.mockRejectedValue(new Error('Service down'));

      const result = component.getDataWithFallback();
      expect(result).toEqual(fallbackValue);
    });

    it('should log error before fallback', async () => {
      const logSpy = vi.spyOn(logger, 'error');
      mockService.getData.mockRejectedValue(new Error('Service down'));

      await component.getDataWithFallback();

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Service down')
      );
    });

    it('should emit error event', async () => {
      const errorHandler = vi.fn();
      component.onError(errorHandler);

      mockService.getData.mockRejectedValue(new Error('Service down'));
      await component.getDataWithFallback();

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Service down'
        })
      );
    });
  });

  describe('Error Propagation', () => {
    it('should propagate errors up the chain', async () => {
      mockDependency.operation.mockRejectedValue(new Error('Low level error'));

      await expect(component.highLevelOperation())
        .rejects.toThrow(/low level error/i);
    });

    it('should wrap errors with context', async () => {
      mockDependency.operation.mockRejectedValue(new Error('Low level error'));

      try {
        await component.highLevelOperationWithContext();
        fail('Should have thrown');
      } catch (e) {
        expect(e.message).toContain('Failed to perform high level operation');
        expect(e.cause?.message).toBe('Low level error');
      }
    });
  });

  describe('Error Boundaries', () => {
    it('should catch errors in callback', async () => {
      const badCallback = () => {
        throw new Error('Callback error');
      };

      const result = await component.processWithCallback(data, badCallback);
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('Callback error');
    });

    it('should continue processing after callback error', async () => {
      const callbacks = [
        () => 'success',
        () => { throw new Error('Error'); },
        () => 'success'
      ];

      const results = await component.processAll(callbacks);
      expect(results[0]).toBe('success');
      expect(results[1]).toBeInstanceOf(Error);
      expect(results[2]).toBe('success');
    });
  });
});
```

---

## Concurrency Testing

### Race Conditions and Thread Safety

```typescript
describe('Concurrency', () => {
  describe('Concurrent Reads', () => {
    it('should handle 100 concurrent reads', async () => {
      const promises = Array(100).fill(0).map(() =>
        component.read(id)
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);
      expect(results.every(r => r.id === id)).toBe(true);
    });
  });

  describe('Concurrent Writes', () => {
    it('should handle concurrent increments correctly', async () => {
      component.setValue(0);

      const promises = Array(100).fill(0).map(() =>
        component.increment()
      );

      await Promise.all(promises);
      expect(component.getValue()).toBe(100);
    });

    it('should prevent race condition in counter', async () => {
      let finalValue = 0;

      // Run test 10 times to catch race conditions
      for (let attempt = 0; attempt < 10; attempt++) {
        component.setValue(0);

        const promises = Array(50).fill(0).map(() =>
          component.increment()
        );

        await Promise.all(promises);
        finalValue = component.getValue();

        expect(finalValue).toBe(50);
      }
    });

    it('should serialize writes to same resource', async () => {
      const operations: string[] = [];

      const promise1 = component.update(id, { value: 1 }, () => {
        operations.push('update1-start');
        return new Promise(resolve =>
          setTimeout(() => {
            operations.push('update1-end');
            resolve();
          }, 100)
        );
      });

      const promise2 = component.update(id, { value: 2 }, () => {
        operations.push('update2-start');
        return new Promise(resolve =>
          setTimeout(() => {
            operations.push('update2-end');
            resolve();
          }, 100)
        );
      });

      await Promise.all([promise1, promise2]);

      // Should be serialized: one completes before other starts
      expect(operations).toEqual([
        'update1-start',
        'update1-end',
        'update2-start',
        'update2-end'
      ]);
    });
  });

  describe('Deadlock Prevention', () => {
    it('should not deadlock with circular dependencies', async () => {
      // Create two resources that depend on each other
      const promise1 = component.updateBoth(id1, id2, { order: 'first' });
      const promise2 = component.updateBoth(id2, id1, { order: 'second' });

      // Should complete without deadlock (with timeout)
      await Promise.race([
        Promise.all([promise1, promise2]),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Deadlock detected')), 5000)
        )
      ]);
    });

    it('should acquire locks in consistent order', async () => {
      const locks: string[] = [];

      const operations = [
        component.lockResources(['A', 'B'], () => locks.push('op1')),
        component.lockResources(['B', 'A'], () => locks.push('op2')),
        component.lockResources(['A', 'B'], () => locks.push('op3'))
      ];

      await Promise.all(operations);
      expect(locks).toEqual(['op1', 'op2', 'op3']);
    });
  });

  describe('Memory Consistency', () => {
    it('should see updates from other threads', async () => {
      component.setValue(0);

      // Writer thread
      const writer = (async () => {
        for (let i = 0; i < 10; i++) {
          await component.increment();
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      })();

      // Reader thread
      const reader = (async () => {
        let lastValue = 0;
        for (let i = 0; i < 10; i++) {
          const value = await component.getValue();
          expect(value).toBeGreaterThanOrEqual(lastValue);
          lastValue = value;
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      })();

      await Promise.all([writer, reader]);
    });
  });
});
```

---

## Real Examples from Memory Module

### Example 1: UnifiedMemoryStore Edge Cases

```typescript
// From: tests/unit/memory/UnifiedMemoryStore.test.ts

describe('UnifiedMemoryStore', () => {
  describe('Edge Cases', () => {
    it('should handle empty query gracefully', async () => {
      const results = await store.query('');
      expect(results).toEqual([]);
    });

    it('should handle very long query (> 1000 chars)', async () => {
      const longQuery = 'test '.repeat(250); // 1250 chars
      const results = await store.query(longQuery);
      expect(results).toBeDefined();
    });

    it('should handle special characters in query', async () => {
      const specialQuery = 'test @#$%^&*() query';
      const results = await store.query(specialQuery);
      expect(results).toBeDefined();
    });

    it('should handle concurrent queries', async () => {
      const queries = Array(10).fill(0).map((_, i) =>
        store.query(`test query ${i}`)
      );

      const results = await Promise.all(queries);
      expect(results).toHaveLength(10);
    });

    it('should deduplicate identical entities', async () => {
      const entity = {
        name: 'Duplicate Test',
        entityType: 'test' as const
      };

      const id1 = await store.addEntity(entity);
      const id2 = await store.addEntity(entity);

      expect(id1).toBe(id2); // Should return same ID
    });

    it('should handle entity with very long content', async () => {
      const longContent = 'x'.repeat(50000);
      const entity = {
        name: 'Long Content',
        entityType: 'test' as const,
        content: longContent
      };

      const id = await store.addEntity(entity);
      expect(id).toBeDefined();

      const retrieved = await store.getEntity(id);
      expect(retrieved?.content).toBe(longContent);
    });

    it('should handle NaN in similarity scores', async () => {
      // This can happen with certain text embeddings
      const mockSimilarity = vi.spyOn(store as any, 'calculateSimilarity');
      mockSimilarity.mockReturnValue(NaN);

      const results = await store.query('test');
      expect(results).toBeDefined();
      expect(results.every(r => !isNaN(r.score))).toBe(true);
    });
  });
});
```

### Example 2: SecretManager Comprehensive Testing

```typescript
// From: tests/unit/memory/SecretManager.test.ts

describe('SecretManager', () => {
  describe('Edge Cases', () => {
    it('should handle empty secret', () => {
      expect(() => secretManager.storeSecret('', 'value'))
        .toThrow(/empty.*key/i);
    });

    it('should handle very long secret value', async () => {
      const longValue = 'x'.repeat(100000);
      await secretManager.storeSecret('long-secret', longValue);

      const retrieved = await secretManager.getSecret('long-secret');
      expect(retrieved).toBe(longValue);
    });

    it('should handle special characters in secret key', async () => {
      const specialKey = 'secret-@#$%^&*()';
      await secretManager.storeSecret(specialKey, 'value');

      const retrieved = await secretManager.getSecret(specialKey);
      expect(retrieved).toBe('value');
    });

    it('should handle unicode in secret value', async () => {
      const unicodeValue = '你好世界 🚀 مرحبا';
      await secretManager.storeSecret('unicode', unicodeValue);

      const retrieved = await secretManager.getSecret('unicode');
      expect(retrieved).toBe(unicodeValue);
    });

    it('should handle binary data in secret', async () => {
      const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xFF]).toString('base64');
      await secretManager.storeSecret('binary', binaryData);

      const retrieved = await secretManager.getSecret('binary');
      expect(retrieved).toBe(binaryData);
    });
  });

  describe('Encryption Edge Cases', () => {
    it('should handle encryption failure gracefully', async () => {
      vi.spyOn(crypto, 'randomBytes').mockImplementation(() => {
        throw new Error('Crypto unavailable');
      });

      await expect(secretManager.storeSecret('key', 'value'))
        .rejects.toThrow(/encryption failed/i);
    });

    it('should handle corrupted encrypted data', async () => {
      // Store valid secret
      await secretManager.storeSecret('key', 'value');

      // Corrupt the data in storage
      const corruptedData = 'corrupted-base64-data';
      await (secretManager as any).storage.update('key', corruptedData);

      // Should handle gracefully
      await expect(secretManager.getSecret('key'))
        .rejects.toThrow(/decryption failed|corrupted/i);
    });
  });

  describe('Concurrent Access', () => {
    it('should handle concurrent secret storage', async () => {
      const promises = Array(50).fill(0).map((_, i) =>
        secretManager.storeSecret(`key-${i}`, `value-${i}`)
      );

      await Promise.all(promises);

      // Verify all secrets stored
      for (let i = 0; i < 50; i++) {
        const value = await secretManager.getSecret(`key-${i}`);
        expect(value).toBe(`value-${i}`);
      }
    });

    it('should handle concurrent updates to same secret', async () => {
      await secretManager.storeSecret('concurrent', 'initial');

      const promises = Array(10).fill(0).map((_, i) =>
        secretManager.storeSecret('concurrent', `value-${i}`)
      );

      await Promise.all(promises);

      const finalValue = await secretManager.getSecret('concurrent');
      expect(finalValue).toMatch(/^value-\d$/);
    });
  });
});
```

---

## Key Principles

### 1. Test Independence
- ✅ Each test should be independent
- ✅ Use `beforeEach` to create fresh state
- ✅ Use `afterEach` to clean up resources
- ❌ Don't rely on test execution order

### 2. Clear Test Names
- ✅ Use descriptive names: "should handle division by zero"
- ✅ Include context: "when user is authenticated"
- ❌ Avoid: "test1", "testFunction", "works"

### 3. Comprehensive Coverage
- ✅ Test happy path
- ✅ Test all edge cases
- ✅ Test all error paths
- ✅ Test concurrency scenarios
- ✅ Test performance

### 4. Maintainability
- ✅ Keep tests simple and readable
- ✅ Use helper functions for setup
- ✅ Document complex test scenarios
- ✅ Refactor tests alongside code

---

## Checklist for New Tests

When writing tests for a new component, ensure:

```
□ Basic functionality tested
□ All public methods tested
□ Edge cases covered:
  □ Zero, negative, very large numbers
  □ NaN, Infinity
  □ Empty, null, undefined
  □ Very long strings/arrays
  □ Special characters
  □ Boundary values
□ Error paths tested:
  □ Invalid input
  □ System errors
  □ Error recovery
  □ Error propagation
□ Concurrency tested:
  □ Concurrent reads
  □ Concurrent writes
  □ Race conditions
  □ Deadlocks
□ Performance tested:
  □ Time limits
  □ Memory leaks
  □ Scalability
□ Integration tested (if applicable):
  □ Cross-component workflows
  □ Data consistency
  □ Error propagation
□ Test quality:
  □ Tests are independent
  □ Clear test names
  □ Proper cleanup
  □ No shared state
```

---

## Tools and Utilities

### Useful Test Helpers

```typescript
// Test helper utilities

export function createMockLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn()
  };
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function waitFor(
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> {
  const start = Date.now();
  while (!condition()) {
    if (Date.now() - start > timeout) {
      throw new Error('Timeout waiting for condition');
    }
    await sleep(interval);
  }
}

export function createTimeoutPromise<T>(
  promise: Promise<T>,
  timeout: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeout)
    )
  ]);
}

export function expectToThrowAsync(
  fn: () => Promise<any>,
  errorMatcher?: RegExp | string
): Promise<void> {
  return fn()
    .then(() => {
      throw new Error('Expected function to throw but it did not');
    })
    .catch(error => {
      if (errorMatcher) {
        if (typeof errorMatcher === 'string') {
          expect(error.message).toContain(errorMatcher);
        } else {
          expect(error.message).toMatch(errorMatcher);
        }
      }
    });
}
```

---

**Document Version**: 1.0
**Last Updated**: 2026-02-03
**Based On**: Memory Module Test Suite (Reference Standard)
