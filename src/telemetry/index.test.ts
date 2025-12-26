import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getTelemetryCollector, setTelemetryCollector } from './index';
import { TelemetryStore } from './TelemetryStore';
import { TelemetryCollector } from './TelemetryCollector';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';

describe('Telemetry Global Instance', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `telemetry-global-${Date.now()}`);
    await fs.ensureDir(testDir);

    // Reset global instance between tests
    setTelemetryCollector(null as any);
  });

  afterEach(async () => {
    await fs.remove(testDir);
  });

  it('should initialize telemetry store before returning collector', async () => {
    const collector = await getTelemetryCollector();

    expect(collector).toBeDefined();

    // Should be able to use immediately without errors
    await expect(
      collector.recordEvent({
        event: 'agent_execution',
        agent_type: 'test',
        success: true,
        duration_ms: 100,
      })
    ).resolves.not.toThrow();
  });

  it('should return same instance on multiple calls', async () => {
    const collector1 = await getTelemetryCollector();
    const collector2 = await getTelemetryCollector();

    expect(collector1).toBe(collector2);
  });

  it('should handle concurrent initialization requests', async () => {
    // Simulate multiple concurrent calls
    const promises = Array(10).fill(null).map(() => getTelemetryCollector());

    const collectors = await Promise.all(promises);

    // All should be the same instance
    const firstCollector = collectors[0];
    for (const collector of collectors) {
      expect(collector).toBe(firstCollector);
    }
  });

  it('should allow setting custom collector', async () => {
    const customStore = new TelemetryStore({ storagePath: testDir });
    await customStore.initialize();
    const customCollector = new TelemetryCollector(customStore);

    setTelemetryCollector(customCollector);

    const retrieved = await getTelemetryCollector();
    expect(retrieved).toBe(customCollector);

    await customStore.close();
  });

  it('should not create collector before initialization completes', async () => {
    // This test verifies that the collector is only created after
    // the store is fully initialized
    let initStarted = false;
    let initCompleted = false;

    // Spy on TelemetryStore.initialize
    const originalInitialize = TelemetryStore.prototype.initialize;
    TelemetryStore.prototype.initialize = async function() {
      initStarted = true;
      await originalInitialize.call(this);
      initCompleted = true;
    };

    const collector = await getTelemetryCollector();

    expect(initStarted).toBe(true);
    expect(initCompleted).toBe(true);
    expect(collector).toBeDefined();

    // Restore
    TelemetryStore.prototype.initialize = originalInitialize;
  });
});
