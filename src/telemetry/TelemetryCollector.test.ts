import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TelemetryCollector } from './TelemetryCollector';
import { TelemetryStore } from './TelemetryStore';
import type { AgentUsageEvent } from './types';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('TelemetryCollector', () => {
  let collector: TelemetryCollector;
  let store: TelemetryStore;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `telemetry-collector-test-${Date.now()}`);
    await fs.ensureDir(testDir);
    store = new TelemetryStore({ storagePath: testDir });
    await store.initialize();
    collector = new TelemetryCollector(store);
  });

  afterEach(async () => {
    await store.close();
    await fs.remove(testDir);
  });

  it('should not record events when disabled', async () => {
    const event: Partial<AgentUsageEvent> = {
      event: 'agent_execution',
      agent_type: 'code-reviewer',
      success: true,
      duration_ms: 3500
    };

    await collector.recordEvent(event);

    const events = await store.getLocalEvents();
    expect(events).toHaveLength(0);
  });

  it('should record events when enabled', async () => {
    await store.updateConfig({ enabled: true });

    const event: Partial<AgentUsageEvent> = {
      event: 'agent_execution',
      agent_type: 'code-reviewer',
      success: true,
      duration_ms: 3500
    };

    await collector.recordEvent(event);

    const events = await store.getLocalEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('agent_execution');
    expect(events[0].anonymous_id).toBeTruthy();
    expect(events[0].timestamp).toBeTruthy();
    expect(events[0].sdk_version).toBeTruthy();
  });

  it('should sanitize events before storing', async () => {
    await store.updateConfig({ enabled: true });

    const event = {
      event: 'agent_execution',
      agent_type: 'code-reviewer',
      success: true,
      duration_ms: 1000,
      api_key: 'sk-secret-123',  // Should be removed
      password: 'password123'     // Should be removed
    };

    await collector.recordEvent(event);

    const events = await store.getLocalEvents();
    expect(events).toHaveLength(1);
    expect((events[0] as any).api_key).toBeUndefined();
    expect((events[0] as any).password).toBeUndefined();
  });

  it('should check if telemetry is enabled', async () => {
    expect(await collector.isEnabled()).toBe(false);

    await store.updateConfig({ enabled: true });
    expect(await collector.isEnabled()).toBe(true);
  });
});
