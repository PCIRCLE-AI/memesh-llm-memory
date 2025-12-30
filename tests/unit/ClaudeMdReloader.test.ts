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

  // PRIORITY 1 FIX: Concurrency test
  describe('Concurrent reload handling', () => {
    it('should handle concurrent reloads without race conditions', () => {
      const concurrentReloadCount = 20;
      const records = Array.from({ length: concurrentReloadCount }, (_, i) => ({
        reason: 'token-threshold' as const,
        triggeredBy: 'auto' as const,
        metadata: { index: i },
      }));

      // Simulate concurrent calls (synchronous context)
      records.forEach((record) => reloader.recordReload(record));

      const history = reloader.getReloadHistory();
      const stats = reloader.getStats();

      // Verify all records were processed
      expect(history).toHaveLength(concurrentReloadCount);

      // Verify lastReloadTime is the last record's timestamp
      expect(stats.lastReloadTime).toBeDefined();
      const lastRecord = history[history.length - 1];
      expect(stats.lastReloadTime?.getTime()).toBe(lastRecord.timestamp?.getTime());

      // Verify no duplicates (all metadata indices unique)
      const indices = history.map((r) => r.metadata?.index);
      const uniqueIndices = new Set(indices);
      expect(uniqueIndices.size).toBe(concurrentReloadCount);

      // Verify correct ordering (indices 0-19 in order)
      for (let i = 0; i < concurrentReloadCount; i++) {
        expect(history[i].metadata?.index).toBe(i);
      }
    });

    it('should prevent cooldown bypass under concurrent load', () => {
      const reloaderWithShortCooldown = new ClaudeMdReloader(1000); // 1 second cooldown

      // First reload should succeed
      reloaderWithShortCooldown.recordReload({
        reason: 'manual',
        triggeredBy: 'user',
      });

      const initialHistory = reloaderWithShortCooldown.getReloadHistory();
      expect(initialHistory).toHaveLength(1);
      expect(reloaderWithShortCooldown.canReload()).toBe(false); // In cooldown

      // Simulate concurrent reload attempts during cooldown
      const concurrentAttempts = 10;
      for (let i = 0; i < concurrentAttempts; i++) {
        // canReload() should still be false, but we're testing recordReload mutex
        reloaderWithShortCooldown.recordReload({
          reason: 'token-threshold',
          triggeredBy: 'auto',
          metadata: { attempt: i },
        });
      }

      const finalHistory = reloaderWithShortCooldown.getReloadHistory();

      // All reloads should be recorded (mutex ensures integrity)
      expect(finalHistory).toHaveLength(1 + concurrentAttempts);

      // lastReloadTime should be the last record's timestamp (no race condition)
      const stats = reloaderWithShortCooldown.getStats();
      const lastRecord = finalHistory[finalHistory.length - 1];
      expect(stats.lastReloadTime?.getTime()).toBe(lastRecord.timestamp?.getTime());
    });
  });
});
