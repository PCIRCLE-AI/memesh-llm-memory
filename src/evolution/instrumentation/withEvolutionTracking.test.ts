import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { withEvolutionTracking } from './withEvolutionTracking';
import { SpanTracker } from './SpanTracker';
import { SQLiteStore } from '../storage/SQLiteStore';
import { TelemetryCollector } from '../../telemetry/TelemetryCollector';
import { TelemetryStore } from '../../telemetry/TelemetryStore';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('withEvolutionTracking - Telemetry Integration', () => {
  let telemetryStore: TelemetryStore;
  let telemetryCollector: TelemetryCollector;
  let evolutionStore: SQLiteStore;
  let tracker: SpanTracker;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `telemetry-integration-${Date.now()}`);
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
    await tracker.startTask({ task: 'test-task' });
    await tracker.startExecution();
  });

  afterEach(async () => {
    if (evolutionStore) {
      await evolutionStore.close();
    }
    if (telemetryStore) {
      await telemetryStore.close();
    }
    if (testDir) {
      await fs.remove(testDir);
    }
  });

  it('should emit telemetry on successful agent execution', async () => {
    // Create a named function (not vi.fn()) to get proper function name in telemetry
    const mockExecute = async (input: { task: string }) => {
      // Verify the input is passed correctly to the tracked function
      expect(input).toBeDefined();
      expect(input.task).toBe('test');
      return {
        success: true,
        qualityScore: 0.95,
        cost: 0.002
      };
    };
    Object.defineProperty(mockExecute, 'name', { value: 'execute' });

    const trackedExecute = withEvolutionTracking(mockExecute, {
      tracker,
      telemetryCollector
    });

    await trackedExecute({ task: 'test' });

    const events = await telemetryStore.getLocalEvents({ event_type: 'agent_execution' });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event: 'agent_execution',
      agent_type: 'execute',
      success: true
    });
  });

  it('should emit error telemetry on agent failure', async () => {
    // Create a named function (not vi.fn()) to get proper function name in telemetry
    const mockExecute = async (input: { task: string }) => {
      // Verify the input is passed correctly before throwing
      expect(input).toBeDefined();
      expect(input.task).toBe('test');
      throw new TypeError('Test error');
    };
    Object.defineProperty(mockExecute, 'name', { value: 'mockExecute' });

    const trackedExecute = withEvolutionTracking(mockExecute, {
      tracker,
      telemetryCollector
    });

    await expect(trackedExecute({ task: 'test' })).rejects.toThrow('Test error');

    const events = await telemetryStore.getLocalEvents({ event_type: 'error' });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event: 'error',
      error_type: 'TypeError',
      component: 'agents/mockExecute'
    });
  });
});
