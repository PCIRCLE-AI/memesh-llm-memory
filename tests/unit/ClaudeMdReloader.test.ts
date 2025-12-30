import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaudeMdReloader } from '../../src/mcp/ClaudeMdReloader.js';

describe('ClaudeMdReloader', () => {
  let reloader: ClaudeMdReloader;

  beforeEach(() => {
    reloader = new ClaudeMdReloader();
  });

  it('should generate MCP resource update request', () => {
    const resourceUpdate = reloader.generateReloadRequest();

    expect(resourceUpdate).toMatchObject({
      method: 'resources/updated',
      params: {
        uri: expect.stringContaining('CLAUDE.md'),
      },
    });
  });

  it('should track reload history', () => {
    reloader.recordReload({ reason: 'token-threshold', triggeredBy: 'auto' });
    reloader.recordReload({ reason: 'manual', triggeredBy: 'user' });

    const history = reloader.getReloadHistory();

    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      reason: 'token-threshold',
      triggeredBy: 'auto',
    });
  });

  it('should prevent reload spam (cooldown period)', () => {
    const first = reloader.canReload();
    expect(first).toBe(true);

    reloader.recordReload({ reason: 'test', triggeredBy: 'auto' });

    const second = reloader.canReload();
    expect(second).toBe(false); // Too soon after last reload
  });

  it('should allow reload after cooldown period', () => {
    vi.useFakeTimers();

    reloader.recordReload({ reason: 'test', triggeredBy: 'auto' });
    expect(reloader.canReload()).toBe(false);

    // Advance time past cooldown (5 minutes default)
    vi.advanceTimersByTime(6 * 60 * 1000);

    expect(reloader.canReload()).toBe(true);

    vi.useRealTimers();
  });
});
