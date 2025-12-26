import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { withEvolutionTracking } from './withEvolutionTracking';
import { SpanTracker } from './SpanTracker';
import { SQLiteStore } from '../storage/SQLiteStore';
import { TelemetryCollector } from '../../telemetry/TelemetryCollector';
import { TelemetryStore } from '../../telemetry/TelemetryStore';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

describe('withEvolutionTracking - Privacy Protection', () => {
  let tracker: SpanTracker;
  let evolutionStore: SQLiteStore;
  let telemetryStore: TelemetryStore;
  let telemetryCollector: TelemetryCollector;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `privacy-test-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Setup telemetry
    telemetryStore = new TelemetryStore({ storagePath: testDir });
    await telemetryStore.initialize();
    telemetryCollector = new TelemetryCollector(telemetryStore);
    await telemetryStore.updateConfig({ enabled: true });

    // Setup evolution tracking
    evolutionStore = new SQLiteStore({ dbPath: ':memory:' });
    await evolutionStore.initialize();
    tracker = new SpanTracker({ store: evolutionStore });

    // Start task and execution for tracking context
    await tracker.startTask({ task: 'privacy-test' });
    await tracker.startExecution();
  });

  afterEach(async () => {
    if (evolutionStore) {
      await evolutionStore.close();
    }
    if (telemetryStore) {
      await telemetryStore.close();
    }
    await fs.remove(testDir);
  });

  it('should NOT store sensitive data in error messages', async () => {
    // Create function that throws error with sensitive data
    const sensitiveData = {
      apiKey: 'sk-1234567890abcdef',
      password: 'MySecretPassword123!',
      token: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
      email: 'user@example.com',
      filePath: '/Users/ktseng/secret/config.json',
    };

    const failingFunction = async () => {
      throw new Error(
        `Failed to authenticate: API_KEY=${sensitiveData.apiKey}, ` +
          `PASSWORD=${sensitiveData.password}, ` +
          `TOKEN=${sensitiveData.token}, ` +
          `EMAIL=${sensitiveData.email}, ` +
          `CONFIG_PATH=${sensitiveData.filePath}`
      );
    };

    const wrapped = withEvolutionTracking(failingFunction, {
      tracker,
      telemetryCollector,
    });

    // Execute and catch error
    try {
      await wrapped();
    } catch (error) {
      // Expected to throw
    }

    // Get the recorded span
    const task = await tracker.getCurrentTask();
    const execution = await tracker.getCurrentExecution();
    const spans = await evolutionStore.querySpans({
      task_id: task?.id,
      execution_id: execution?.id,
    });

    expect(spans.length).toBeGreaterThan(0);
    const span = spans[0];

    // Verify error message is sanitized
    const statusMessage = span.status.message || '';
    const errorMessage = span.attributes['error.message'] || '';

    // Should NOT contain sensitive data
    expect(statusMessage).not.toContain(sensitiveData.apiKey);
    expect(statusMessage).not.toContain(sensitiveData.password);
    expect(statusMessage).not.toContain(sensitiveData.token);
    expect(statusMessage).not.toContain(sensitiveData.email);
    expect(statusMessage).not.toContain(sensitiveData.filePath);

    expect(errorMessage).not.toContain(sensitiveData.apiKey);
    expect(errorMessage).not.toContain(sensitiveData.password);
    expect(errorMessage).not.toContain(sensitiveData.token);
    expect(errorMessage).not.toContain(sensitiveData.email);
    expect(errorMessage).not.toContain(sensitiveData.filePath);

    // Should contain sanitized/redacted version
    expect(statusMessage || errorMessage).toBeTruthy();
    expect(statusMessage || errorMessage).toMatch(/REDACTED|sanitized|hidden/i);
  });

  it('should NOT store file paths in error messages', async () => {
    const failingFunction = async () => {
      throw new Error(
        'File not found: /Users/ktseng/Documents/secret-keys.txt'
      );
    };

    const wrapped = withEvolutionTracking(failingFunction, {
      tracker,
      telemetryCollector,
    });

    try {
      await wrapped();
    } catch (error) {
      // Expected
    }

    const task = await tracker.getCurrentTask();
    const execution = await tracker.getCurrentExecution();
    const spans = await evolutionStore.querySpans({
      task_id: task?.id,
      execution_id: execution?.id,
    });

    const span = spans[0];
    const statusMessage = span.status.message || '';
    const errorMessage = span.attributes['error.message'] || '';

    // Should not contain actual file path
    expect(statusMessage).not.toContain('/Users/ktseng');
    expect(statusMessage).not.toContain('secret-keys.txt');
    expect(errorMessage).not.toContain('/Users/ktseng');
    expect(errorMessage).not.toContain('secret-keys.txt');
  });

  it('should preserve error type but sanitize error message', async () => {
    const failingFunction = async () => {
      const error = new TypeError('Invalid password: MySecretPass123!');
      throw error;
    };

    const wrapped = withEvolutionTracking(failingFunction, {
      tracker,
      telemetryCollector,
    });

    try {
      await wrapped();
    } catch (error) {
      // Expected
    }

    const task = await tracker.getCurrentTask();
    const execution = await tracker.getCurrentExecution();
    const spans = await evolutionStore.querySpans({
      task_id: task?.id,
      execution_id: execution?.id,
    });

    const span = spans[0];

    // Error type should be preserved
    expect(span.attributes['error.type']).toBe('TypeError');

    // Error message should be sanitized
    const errorMessage = span.attributes['error.message'] || '';
    expect(errorMessage).not.toContain('MySecretPass123!');
  });

  it('should handle stack traces without leaking paths', async () => {
    const failingFunction = async () => {
      throw new Error('Test error');
    };

    const wrapped = withEvolutionTracking(failingFunction, {
      tracker,
      telemetryCollector,
    });

    try {
      await wrapped();
    } catch (error) {
      // Expected
    }

    const task = await tracker.getCurrentTask();
    const execution = await tracker.getCurrentExecution();
    const spans = await evolutionStore.querySpans({
      task_id: task?.id,
      execution_id: execution?.id,
    });

    const span = spans[0];

    // Should not have stack trace attribute (only hashed in telemetry)
    expect(span.attributes).not.toHaveProperty('error.stack');
    expect(span.attributes).not.toHaveProperty('stack_trace');

    // Status message should not contain stack trace
    const statusMessage = span.status.message || '';
    expect(statusMessage).not.toMatch(/at\s+\w+\s+\(/); // Stack trace format
  });
});
