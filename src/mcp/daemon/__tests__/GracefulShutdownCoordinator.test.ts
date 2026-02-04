/**
 * GracefulShutdownCoordinator Tests
 *
 * Tests for graceful shutdown coordination:
 * - Request tracking (start/complete)
 * - Shutdown flow (wait for pending, timeout)
 * - Upgrade coordination flow
 * - State management
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  GracefulShutdownCoordinator,
  type ShutdownConfig,
  type RequestInfo,
  ShutdownReason,
} from '../GracefulShutdownCoordinator.js';

describe('GracefulShutdownCoordinator', () => {
  let coordinator: GracefulShutdownCoordinator;
  let mockNotifyClients: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    mockNotifyClients = vi.fn().mockResolvedValue(undefined);
    coordinator = new GracefulShutdownCoordinator({
      maxWaitTime: 5000,
      checkInterval: 100,
      notifyClients: mockNotifyClients,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Request Tracking Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe('trackRequest', () => {
    it('should track a new request', () => {
      coordinator.trackRequest('req-1', 'client-1');

      const pending = coordinator.getPendingRequests();
      expect(pending).toHaveLength(1);
      expect(pending[0].requestId).toBe('req-1');
      expect(pending[0].clientId).toBe('client-1');
      expect(pending[0].startTime).toBeDefined();
    });

    it('should track multiple requests', () => {
      coordinator.trackRequest('req-1', 'client-1');
      coordinator.trackRequest('req-2', 'client-1');
      coordinator.trackRequest('req-3', 'client-2');

      const pending = coordinator.getPendingRequests();
      expect(pending).toHaveLength(3);
    });

    it('should not track duplicate request IDs', () => {
      coordinator.trackRequest('req-1', 'client-1');
      coordinator.trackRequest('req-1', 'client-2'); // Same ID, different client

      const pending = coordinator.getPendingRequests();
      expect(pending).toHaveLength(1);
      expect(pending[0].clientId).toBe('client-1'); // Original client
    });

    it('should throw error when shutting down', async () => {
      // Start shutdown
      const shutdownPromise = coordinator.initiateShutdown(ShutdownReason.USER_REQUESTED);

      // Try to track a new request
      expect(() => coordinator.trackRequest('req-1', 'client-1')).toThrow(
        'Cannot accept new requests: shutdown in progress'
      );

      // Clean up - advance timers to complete shutdown
      await vi.advanceTimersByTimeAsync(5100);
      await shutdownPromise;
    });

    it('should throw error when upgrade is pending', async () => {
      // Start upgrade
      const upgradePromise = coordinator.initiateUpgrade('2.0.0', 'client-new');

      // Try to track a new request - should fail because pendingUpgrade is true
      expect(() => coordinator.trackRequest('req-1', 'client-1')).toThrow(
        'Cannot accept new requests: shutdown in progress'
      );

      // Clean up - advance timers to complete shutdown
      await vi.advanceTimersByTimeAsync(5100);
      await upgradePromise;
    });
  });

  describe('completeRequest', () => {
    it('should remove completed request from pending', () => {
      coordinator.trackRequest('req-1', 'client-1');
      coordinator.trackRequest('req-2', 'client-1');

      coordinator.completeRequest('req-1');

      const pending = coordinator.getPendingRequests();
      expect(pending).toHaveLength(1);
      expect(pending[0].requestId).toBe('req-2');
    });

    it('should handle completing non-existent request gracefully', () => {
      expect(() => coordinator.completeRequest('non-existent')).not.toThrow();
    });

    it('should track completion in metrics', () => {
      coordinator.trackRequest('req-1', 'client-1');
      coordinator.completeRequest('req-1');

      const metrics = coordinator.getMetrics();
      expect(metrics.totalRequestsTracked).toBe(1);
      expect(metrics.totalRequestsCompleted).toBe(1);
      expect(metrics.currentPending).toBe(0);
    });
  });

  describe('getPendingRequests', () => {
    it('should return empty array when no pending requests', () => {
      const pending = coordinator.getPendingRequests();
      expect(pending).toEqual([]);
    });

    it('should return copy of pending requests', () => {
      coordinator.trackRequest('req-1', 'client-1');

      const pending1 = coordinator.getPendingRequests();
      const pending2 = coordinator.getPendingRequests();

      expect(pending1).not.toBe(pending2);
      expect(pending1).toEqual(pending2);
    });

    it('should include request metadata', () => {
      const beforeTime = Date.now();
      coordinator.trackRequest('req-1', 'client-1');
      const afterTime = Date.now();

      const pending = coordinator.getPendingRequests();
      expect(pending[0]).toMatchObject({
        requestId: 'req-1',
        clientId: 'client-1',
      });
      expect(pending[0].startTime).toBeGreaterThanOrEqual(beforeTime);
      expect(pending[0].startTime).toBeLessThanOrEqual(afterTime);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Status Checks Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe('isShuttingDown', () => {
    it('should be false initially', () => {
      expect(coordinator.isShuttingDown).toBe(false);
    });

    it('should be true after initiating shutdown', async () => {
      const shutdownPromise = coordinator.initiateShutdown(ShutdownReason.USER_REQUESTED);
      expect(coordinator.isShuttingDown).toBe(true);

      await vi.advanceTimersByTimeAsync(5100);
      await shutdownPromise;
    });
  });

  describe('isPendingUpgrade', () => {
    it('should be false initially', () => {
      expect(coordinator.isPendingUpgrade).toBe(false);
    });

    it('should be true after initiating upgrade', async () => {
      const upgradePromise = coordinator.initiateUpgrade('2.0.0', 'client-1');
      expect(coordinator.isPendingUpgrade).toBe(true);

      await vi.advanceTimersByTimeAsync(5100);
      await upgradePromise;
    });
  });

  describe('canAcceptRequest', () => {
    it('should be true initially', () => {
      expect(coordinator.canAcceptRequest()).toBe(true);
    });

    it('should be false during shutdown', async () => {
      const shutdownPromise = coordinator.initiateShutdown(ShutdownReason.USER_REQUESTED);
      expect(coordinator.canAcceptRequest()).toBe(false);

      await vi.advanceTimersByTimeAsync(5100);
      await shutdownPromise;
    });

    it('should be false during upgrade', async () => {
      const upgradePromise = coordinator.initiateUpgrade('2.0.0', 'client-1');
      expect(coordinator.canAcceptRequest()).toBe(false);

      await vi.advanceTimersByTimeAsync(5100);
      await upgradePromise;
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Shutdown Flow Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe('initiateShutdown', () => {
    it('should notify clients about shutdown', async () => {
      const shutdownPromise = coordinator.initiateShutdown(ShutdownReason.USER_REQUESTED);

      expect(mockNotifyClients).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'shutdown',
          reason: 'user_requested',
        })
      );

      await vi.advanceTimersByTimeAsync(5100);
      await shutdownPromise;
    });

    it('should wait for pending requests to complete', async () => {
      coordinator.trackRequest('req-1', 'client-1');

      const shutdownPromise = coordinator.initiateShutdown(ShutdownReason.USER_REQUESTED);

      // Not done yet - request still pending
      await vi.advanceTimersByTimeAsync(100);
      expect(coordinator.getPendingRequests()).toHaveLength(1);

      // Complete the request
      coordinator.completeRequest('req-1');

      // Now shutdown should complete quickly
      await vi.advanceTimersByTimeAsync(100);
      await shutdownPromise;

      expect(coordinator.getPendingRequests()).toHaveLength(0);
    });

    it('should timeout if requests take too long', async () => {
      coordinator.trackRequest('req-1', 'client-1');
      // Don't complete the request

      const shutdownPromise = coordinator.initiateShutdown(ShutdownReason.USER_REQUESTED);

      // Advance past the timeout
      await vi.advanceTimersByTimeAsync(5100);
      await shutdownPromise;

      // Should have force-shutdown despite pending request
      const metrics = coordinator.getMetrics();
      expect(metrics.forceShutdown).toBe(true);
    });

    it('should not allow multiple simultaneous shutdowns', async () => {
      const shutdown1 = coordinator.initiateShutdown(ShutdownReason.USER_REQUESTED);

      await expect(
        coordinator.initiateShutdown(ShutdownReason.IDLE_TIMEOUT)
      ).rejects.toThrow('Shutdown already in progress');

      await vi.advanceTimersByTimeAsync(5100);
      await shutdown1;
    });

    it('should handle different shutdown reasons', async () => {
      const reasons = [
        ShutdownReason.UPGRADE,
        ShutdownReason.USER_REQUESTED,
        ShutdownReason.IDLE_TIMEOUT,
        ShutdownReason.ERROR,
      ];

      for (const reason of reasons) {
        mockNotifyClients.mockClear();
        const newCoordinator = new GracefulShutdownCoordinator({
          maxWaitTime: 100,
          checkInterval: 10,
          notifyClients: mockNotifyClients,
        });

        const shutdownPromise = newCoordinator.initiateShutdown(reason);
        await vi.advanceTimersByTimeAsync(200);
        await shutdownPromise;

        expect(mockNotifyClients).toHaveBeenCalledWith(
          expect.objectContaining({
            reason: reason,
          })
        );
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Upgrade Flow Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe('initiateUpgrade', () => {
    it('should notify clients about pending upgrade first', async () => {
      const upgradePromise = coordinator.initiateUpgrade('2.0.0', 'client-new');

      // First notification should be upgrade_pending
      expect(mockNotifyClients).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          type: 'upgrade_pending',
          newVersion: '2.0.0',
          initiatorClientId: 'client-new',
        })
      );

      await vi.advanceTimersByTimeAsync(5100);
      await upgradePromise;
    });

    it('should send shutdown after upgrade pending notification', async () => {
      const upgradePromise = coordinator.initiateUpgrade('2.0.0', 'client-new');

      await vi.advanceTimersByTimeAsync(5100);
      await upgradePromise;

      // Second notification should be shutdown with upgrade reason
      expect(mockNotifyClients).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: 'shutdown',
          reason: 'upgrade',
        })
      );
    });

    it('should wait for pending requests during upgrade', async () => {
      coordinator.trackRequest('req-1', 'client-1');

      const upgradePromise = coordinator.initiateUpgrade('2.0.0', 'client-new');

      // Not done yet
      await vi.advanceTimersByTimeAsync(100);
      expect(coordinator.getPendingRequests()).toHaveLength(1);

      // Complete the request
      coordinator.completeRequest('req-1');

      // Now should complete
      await vi.advanceTimersByTimeAsync(100);
      await upgradePromise;
    });

    it('should include estimated shutdown time in upgrade pending message', async () => {
      const upgradePromise = coordinator.initiateUpgrade('2.0.0', 'client-new');

      expect(mockNotifyClients).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'upgrade_pending',
          estimatedShutdownTime: expect.any(Number),
        })
      );

      await vi.advanceTimersByTimeAsync(5100);
      await upgradePromise;
    });

    it('should set isPendingUpgrade to true during upgrade', async () => {
      expect(coordinator.isPendingUpgrade).toBe(false);

      const upgradePromise = coordinator.initiateUpgrade('2.0.0', 'client-new');
      expect(coordinator.isPendingUpgrade).toBe(true);

      await vi.advanceTimersByTimeAsync(5100);
      await upgradePromise;
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Metrics Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getMetrics', () => {
    it('should track total requests', () => {
      coordinator.trackRequest('req-1', 'client-1');
      coordinator.trackRequest('req-2', 'client-2');
      coordinator.trackRequest('req-3', 'client-1');

      const metrics = coordinator.getMetrics();
      expect(metrics.totalRequestsTracked).toBe(3);
    });

    it('should track completed requests', () => {
      coordinator.trackRequest('req-1', 'client-1');
      coordinator.trackRequest('req-2', 'client-2');
      coordinator.completeRequest('req-1');

      const metrics = coordinator.getMetrics();
      expect(metrics.totalRequestsCompleted).toBe(1);
      expect(metrics.currentPending).toBe(1);
    });

    it('should track requests by client', () => {
      coordinator.trackRequest('req-1', 'client-1');
      coordinator.trackRequest('req-2', 'client-1');
      coordinator.trackRequest('req-3', 'client-2');

      const metrics = coordinator.getMetrics();
      expect(metrics.requestsByClient).toEqual({
        'client-1': 2,
        'client-2': 1,
      });
    });

    it('should update requestsByClient when requests complete', () => {
      coordinator.trackRequest('req-1', 'client-1');
      coordinator.trackRequest('req-2', 'client-1');
      coordinator.completeRequest('req-1');

      const metrics = coordinator.getMetrics();
      expect(metrics.requestsByClient['client-1']).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Configuration Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe('configuration', () => {
    it('should use default config when not provided', () => {
      const defaultCoordinator = new GracefulShutdownCoordinator({});

      // Just verify it doesn't throw
      expect(defaultCoordinator.canAcceptRequest()).toBe(true);
    });

    it('should throw error if checkInterval is less than 10ms', () => {
      expect(() => new GracefulShutdownCoordinator({
        checkInterval: 5,
      })).toThrow('checkInterval must be at least 10ms');

      expect(() => new GracefulShutdownCoordinator({
        checkInterval: 0,
      })).toThrow('checkInterval must be at least 10ms');

      expect(() => new GracefulShutdownCoordinator({
        checkInterval: -1,
      })).toThrow('checkInterval must be at least 10ms');
    });

    it('should accept checkInterval of exactly 10ms', () => {
      const coordinator10ms = new GracefulShutdownCoordinator({
        checkInterval: 10,
        notifyClients: mockNotifyClients,
      });
      expect(coordinator10ms.canAcceptRequest()).toBe(true);
    });

    it('should respect custom maxWaitTime', async () => {
      const quickCoordinator = new GracefulShutdownCoordinator({
        maxWaitTime: 500,
        checkInterval: 50,
        notifyClients: mockNotifyClients,
      });

      quickCoordinator.trackRequest('req-1', 'client-1');
      const shutdownPromise = quickCoordinator.initiateShutdown(ShutdownReason.USER_REQUESTED);

      // Should timeout at 500ms, not 5000ms
      await vi.advanceTimersByTimeAsync(600);
      await shutdownPromise;

      const metrics = quickCoordinator.getMetrics();
      expect(metrics.forceShutdown).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Edge Cases Tests
  // ═══════════════════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle rapid request completion during shutdown', async () => {
      // Track many requests
      for (let i = 0; i < 100; i++) {
        coordinator.trackRequest(`req-${i}`, 'client-1');
      }

      const shutdownPromise = coordinator.initiateShutdown(ShutdownReason.USER_REQUESTED);

      // Complete all requests rapidly
      for (let i = 0; i < 100; i++) {
        coordinator.completeRequest(`req-${i}`);
      }

      // Should complete quickly without timeout
      await vi.advanceTimersByTimeAsync(200);
      await shutdownPromise;

      const metrics = coordinator.getMetrics();
      expect(metrics.forceShutdown).toBe(false);
    });

    it('should handle notifyClients error gracefully', async () => {
      const failingNotify = vi.fn().mockRejectedValue(new Error('Notification failed'));
      const errorCoordinator = new GracefulShutdownCoordinator({
        maxWaitTime: 100,
        checkInterval: 10,
        notifyClients: failingNotify,
      });

      // Should not throw
      const shutdownPromise = errorCoordinator.initiateShutdown(ShutdownReason.USER_REQUESTED);
      await vi.advanceTimersByTimeAsync(200);
      await shutdownPromise;
    });

    it('should cleanup pending requests on force shutdown', async () => {
      coordinator.trackRequest('req-1', 'client-1');
      coordinator.trackRequest('req-2', 'client-2');

      const shutdownPromise = coordinator.initiateShutdown(ShutdownReason.USER_REQUESTED);

      // Force timeout
      await vi.advanceTimersByTimeAsync(5100);
      await shutdownPromise;

      // Should report which requests were force-killed
      const metrics = coordinator.getMetrics();
      expect(metrics.forceKilledRequests).toContain('req-1');
      expect(metrics.forceKilledRequests).toContain('req-2');
    });
  });
});
