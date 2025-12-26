import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TelemetryStore } from './TelemetryStore';
import type { AgentUsageEvent, TelemetryConfig } from './types';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('TelemetryStore', () => {
  let store: TelemetryStore;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `telemetry-test-${Date.now()}`);
    await fs.ensureDir(testDir);
    store = new TelemetryStore({ storagePath: testDir });
    await store.initialize();
  });

  afterEach(async () => {
    await store.close();
    await fs.remove(testDir);
  });

  it('should initialize with disabled telemetry by default', async () => {
    const config = await store.getConfig();
    expect(config.enabled).toBe(false);
    expect(config.anonymous_id).toBeTruthy();
    expect(config.send_automatically).toBe(false);
  });

  it('should store events locally', async () => {
    const event: AgentUsageEvent = {
      event: 'agent_execution',
      agent_type: 'code-reviewer',
      success: true,
      duration_ms: 3500,
      anonymous_id: 'test-id',
      timestamp: new Date().toISOString(),
      sdk_version: '1.0.0',
      node_version: 'v20.0.0',
      os_platform: 'darwin'
    };

    await store.storeEventLocally(event);

    const events = await store.getLocalEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('agent_execution');
  });

  it('should filter events by type', async () => {
    await store.storeEventLocally({
      event: 'agent_execution',
      agent_type: 'code-reviewer',
      success: true,
      duration_ms: 1000,
      anonymous_id: 'test-id',
      timestamp: new Date().toISOString(),
      sdk_version: '1.0.0',
      node_version: 'v20.0.0',
      os_platform: 'darwin'
    });

    await store.storeEventLocally({
      event: 'error',
      error_type: 'TypeError',
      error_category: 'runtime',
      component: 'test',
      anonymous_id: 'test-id',
      timestamp: new Date().toISOString(),
      sdk_version: '1.0.0',
      node_version: 'v20.0.0',
      os_platform: 'darwin'
    });

    const agentEvents = await store.getLocalEvents({ event_type: 'agent_execution' });
    expect(agentEvents).toHaveLength(1);
    expect(agentEvents[0].event).toBe('agent_execution');
  });

  it('should enable and disable telemetry', async () => {
    await store.updateConfig({ enabled: true });
    let config = await store.getConfig();
    expect(config.enabled).toBe(true);

    await store.updateConfig({ enabled: false });
    config = await store.getConfig();
    expect(config.enabled).toBe(false);
  });

  it('should clear all local data', async () => {
    await store.storeEventLocally({
      event: 'agent_execution',
      agent_type: 'test',
      success: true,
      duration_ms: 100,
      anonymous_id: 'test-id',
      timestamp: new Date().toISOString(),
      sdk_version: '1.0.0',
      node_version: 'v20.0.0',
      os_platform: 'darwin'
    });

    await store.clearLocalData();

    const events = await store.getLocalEvents();
    expect(events).toHaveLength(0);
  });
});
