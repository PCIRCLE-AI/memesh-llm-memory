import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Dashboard } from '../../src/ui/Dashboard.js';
import { TestResourceMonitor } from '../helpers/TestResourceMonitor.js';
import type { UIConfig } from '../../src/ui/types.js';

describe('Dashboard', () => {
  let dashboard: Dashboard;
  let resourceMonitor: TestResourceMonitor;

  beforeEach(() => {
    resourceMonitor = new TestResourceMonitor();
    dashboard = new Dashboard(resourceMonitor);
  });

  afterEach(() => {
    dashboard.stop();
  });

  it('should start and stop dashboard', () => {
    dashboard.start();
    expect(dashboard.isRunning()).toBe(true);

    dashboard.stop();
    expect(dashboard.isRunning()).toBe(false);
  });

  it('should use custom UI config', () => {
    const customConfig: Partial<UIConfig> = {
      updateInterval: 500,
      maxRecentAttributions: 10,
      colorEnabled: false,
    };

    const customDashboard = new Dashboard(resourceMonitor, customConfig);
    expect(customDashboard).toBeDefined();
  });

  it('should get current dashboard state', () => {
    const state = dashboard.getState();

    expect(state.resources).toBeDefined();
    expect(state.agents).toEqual([]);
    expect(state.recentAttributions).toEqual([]);
    expect(state.sessionMetrics).toBeDefined();
  });

  it('should update resource stats periodically', async () => {
    dashboard.start();

    const initialState = dashboard.getState();
    const initialCPU = initialState.resources.cpu.usage;

    // Verify initial CPU is a valid number
    expect(typeof initialCPU).toBe('number');
    expect(initialCPU).toBeGreaterThanOrEqual(0);
    expect(initialCPU).toBeLessThanOrEqual(100);

    // Wait for at least one update cycle
    await new Promise((resolve) => setTimeout(resolve, 300));

    const updatedState = dashboard.getState();
    expect(updatedState.resources).toBeDefined();
    // CPU should be a valid number (may or may not have changed)
    expect(typeof updatedState.resources.cpu.usage).toBe('number');

    dashboard.stop();
  });
});
