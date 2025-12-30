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

  // CRITICAL ISSUE 1: Constructor validation
  describe('Constructor validation', () => {
    it('should reject negative cooldown', () => {
      expect(() => new ClaudeMdReloader(-1000)).toThrow(
        'cooldownMs must be positive'
      );
    });

    it('should reject zero cooldown', () => {
      expect(() => new ClaudeMdReloader(0)).toThrow(
        'cooldownMs must be positive'
      );
    });
  });

  // CRITICAL ISSUE 2: recordReload validation
  describe('recordReload validation', () => {
    it('should reject invalid reload records - missing reason', () => {
      expect(() =>
        reloader.recordReload({ reason: '', triggeredBy: 'auto' } as any)
      ).toThrow('reason and triggeredBy are required');
    });

    it('should reject invalid reload records - missing triggeredBy', () => {
      expect(() =>
        reloader.recordReload({ reason: 'manual', triggeredBy: '' } as any)
      ).toThrow('reason and triggeredBy are required');
    });
  });

  // IMPORTANT ISSUE 5: History overflow edge case
  describe('History overflow', () => {
    it('should limit history to 50 records', () => {
      // Add 60 records
      for (let i = 0; i < 60; i++) {
        reloader.recordReload({
          reason: 'manual',
          triggeredBy: 'auto',
          metadata: { index: i },
        });
      }

      const history = reloader.getReloadHistory();
      expect(history).toHaveLength(50);

      // Verify oldest records were removed (FIFO)
      expect(history[0].metadata).toEqual({ index: 10 });
    });
  });

  // IMPORTANT ISSUE 6: Race condition documentation
  describe('Rapid sequential reloads', () => {
    it('should handle rapid sequential reloads', () => {
      // Simulate rapid-fire reloads
      for (let i = 0; i < 100; i++) {
        reloader.recordReload({ reason: 'manual', triggeredBy: 'auto' });
      }

      const history = reloader.getReloadHistory();
      expect(history.length).toBeLessThanOrEqual(50);
    });
  });
});
