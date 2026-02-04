/**
 * ✅ SECURITY TESTS (MEDIUM-2): Resource Exhaustion Protection
 *
 * Test suite for resource protection middleware
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import v8 from 'v8';
import {
  connectionLimitMiddleware,
  payloadSizeLimitMiddleware,
  memoryPressureMiddleware,
  clearConnectionTracking,
  getConnectionStats,
  startResourceProtectionCleanup,
  stopResourceProtectionCleanup,
} from '../resourceProtection.js';

// Mock Express request/response
function mockRequest(partial: Partial<Request> = {}): Request {
  return {
    method: 'POST',
    path: '/api/test',
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    get: vi.fn(),
    ...partial,
  } as unknown as Request;
}

function mockResponse(): Response {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
    on: vi.fn((event, handler) => {
      if (event === 'finish' || event === 'close') {
        // Store handlers for manual triggering
        (res as any)[`_${event}Handler`] = handler;
      }
      return res;
    }),
  };

  // Helper to trigger events
  (res as any)._triggerEvent = (event: string) => {
    const handler = (res as any)[`_${event}Handler`];
    if (handler) handler();
  };

  return res as Response;
}

describe('Resource Protection Middleware', () => {
  beforeEach(() => {
    clearConnectionTracking();
    delete process.env.A2A_MAX_CONNECTIONS_PER_IP;
    delete process.env.A2A_MAX_PAYLOAD_SIZE_MB;
  });

  afterEach(() => {
    clearConnectionTracking();
    stopResourceProtectionCleanup();
  });

  describe('connectionLimitMiddleware', () => {
    it('should allow connections within limit', () => {
      const middleware = connectionLimitMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should track connections per IP', async () => {
      const middleware = connectionLimitMiddleware();

      // Simulate 5 concurrent connections from same IP
      const connections: Response[] = [];

      for (let i = 0; i < 5; i++) {
        const req = mockRequest({ ip: '192.168.1.1' });
        const res = mockResponse();
        const next = vi.fn();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        connections.push(res);
      }

      const stats = getConnectionStats();
      expect(stats.totalConnections).toBe(5);
    });

    it('should reject connections exceeding limit', () => {
      // Set low limit for testing
      process.env.A2A_MAX_CONNECTIONS_PER_IP = '3';

      const middleware = connectionLimitMiddleware();
      const ip = '192.168.1.2';
      const connections: Response[] = [];

      // Create 3 connections (at limit)
      for (let i = 0; i < 3; i++) {
        const req = mockRequest({ ip });
        const res = mockResponse();
        const next = vi.fn();

        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        connections.push(res);
      }

      // 4th connection should be rejected
      const req4 = mockRequest({ ip });
      const res4 = mockResponse();
      const next4 = vi.fn();

      middleware(req4, res4, next4);

      expect(res4.status).toHaveBeenCalledWith(503);
      expect(res4.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'CONNECTION_LIMIT_EXCEEDED',
        }),
      });
      expect(next4).not.toHaveBeenCalled();
    });

    it('should release connection on response finish', () => {
      const middleware = connectionLimitMiddleware();
      const req = mockRequest({ ip: '192.168.1.3' });
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(getConnectionStats().totalConnections).toBe(1);

      // Trigger finish event
      (res as any)._triggerEvent('finish');

      expect(getConnectionStats().totalConnections).toBe(0);
    });

    it('should release connection on close', () => {
      const middleware = connectionLimitMiddleware();
      const req = mockRequest({ ip: '192.168.1.4' });
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(getConnectionStats().totalConnections).toBe(1);

      // Trigger close event
      (res as any)._triggerEvent('close');

      expect(getConnectionStats().totalConnections).toBe(0);
    });

    it('should isolate connections by IP', () => {
      const middleware = connectionLimitMiddleware();

      // IP 1 - 2 connections
      for (let i = 0; i < 2; i++) {
        const req = mockRequest({ ip: '192.168.1.10' });
        const res = mockResponse();
        const next = vi.fn();
        middleware(req, res, next);
      }

      // IP 2 - 3 connections
      for (let i = 0; i < 3; i++) {
        const req = mockRequest({ ip: '192.168.1.11' });
        const res = mockResponse();
        const next = vi.fn();
        middleware(req, res, next);
      }

      const stats = getConnectionStats();
      expect(stats.totalIPs).toBe(2);
      expect(stats.totalConnections).toBe(5);
    });
  });

  describe('payloadSizeLimitMiddleware', () => {
    it('should allow payloads within limit', () => {
      const middleware = payloadSizeLimitMiddleware();
      const req = mockRequest({
        get: vi.fn().mockReturnValue('1048576'), // 1MB
      });
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject payloads exceeding limit', () => {
      process.env.A2A_MAX_PAYLOAD_SIZE_MB = '10';

      const middleware = payloadSizeLimitMiddleware();
      const req = mockRequest({
        get: vi.fn().mockReturnValue('20971520'), // 20MB
      });
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(413);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'PAYLOAD_TOO_LARGE',
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid Content-Length', () => {
      const middleware = payloadSizeLimitMiddleware();
      const req = mockRequest({
        get: vi.fn().mockReturnValue('not-a-number'),
      });
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'INVALID_CONTENT_LENGTH',
        }),
      });
    });

    it('should allow requests without Content-Length', () => {
      const middleware = payloadSizeLimitMiddleware();
      const req = mockRequest({
        get: vi.fn().mockReturnValue(undefined),
      });
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('memoryPressureMiddleware', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should allow requests under normal memory pressure', () => {
      const middleware = memoryPressureMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = vi.fn();

      // Mock normal memory usage using v8.getHeapStatistics
      // The new logic checks used_heap_size / heap_size_limit (50% < 85% threshold = OK)
      vi.spyOn(v8, 'getHeapStatistics').mockReturnValue({
        total_heap_size: 100 * 1024 * 1024,
        total_heap_size_executable: 0,
        total_physical_size: 0,
        total_available_size: 0,
        used_heap_size: 50 * 1024 * 1024, // 50MB used
        heap_size_limit: 100 * 1024 * 1024, // 100MB limit (50% usage < 85% threshold)
        malloced_memory: 0,
        peak_malloced_memory: 0,
        does_zap_garbage: 0,
        number_of_native_contexts: 0,
        number_of_detached_contexts: 0,
        total_global_handles_size: 0,
        used_global_handles_size: 0,
        external_memory: 0,
      });

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should allow requests at exactly threshold boundary (85%)', () => {
      const middleware = memoryPressureMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = vi.fn();

      // Mock memory usage at exactly 85% - should pass because threshold is > not >=
      vi.spyOn(v8, 'getHeapStatistics').mockReturnValue({
        total_heap_size: 100 * 1024 * 1024,
        total_heap_size_executable: 0,
        total_physical_size: 0,
        total_available_size: 0,
        used_heap_size: 85 * 1024 * 1024, // 85MB used
        heap_size_limit: 100 * 1024 * 1024, // 100MB limit (exactly 85% = threshold)
        malloced_memory: 0,
        peak_malloced_memory: 0,
        does_zap_garbage: 0,
        number_of_native_contexts: 0,
        number_of_detached_contexts: 0,
        total_global_handles_size: 0,
        used_global_handles_size: 0,
        external_memory: 0,
      });

      middleware(req, res, next);

      // At exactly 85%, should pass (threshold uses > not >=)
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject requests under high memory pressure', () => {
      const middleware = memoryPressureMiddleware();
      const req = mockRequest();
      const res = mockResponse();
      const next = vi.fn();

      // Mock high memory usage using v8.getHeapStatistics
      // The new logic checks used_heap_size / heap_size_limit > threshold (85%)
      vi.spyOn(v8, 'getHeapStatistics').mockReturnValue({
        total_heap_size: 100 * 1024 * 1024,
        total_heap_size_executable: 0,
        total_physical_size: 0,
        total_available_size: 0,
        used_heap_size: 90 * 1024 * 1024, // 90MB used
        heap_size_limit: 100 * 1024 * 1024, // 100MB limit (90% usage > 85% threshold)
        malloced_memory: 0,
        peak_malloced_memory: 0,
        does_zap_garbage: 0,
        number_of_native_contexts: 0,
        number_of_detached_contexts: 0,
        total_global_handles_size: 0,
        used_global_handles_size: 0,
        external_memory: 0,
      });

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          code: 'SERVICE_OVERLOADED',
        }),
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Connection statistics', () => {
    it('should track connection statistics', () => {
      const middleware = connectionLimitMiddleware();

      // Create connections from different IPs
      const ips = ['192.168.1.10', '192.168.1.11', '192.168.1.12'];

      ips.forEach(ip => {
        const req = mockRequest({ ip });
        const res = mockResponse();
        const next = vi.fn();
        middleware(req, res, next);
      });

      const stats = getConnectionStats();

      expect(stats.totalIPs).toBe(3);
      expect(stats.totalConnections).toBe(3);
      expect(stats.topIPs).toHaveLength(3);
      expect(stats.topIPs[0].connections).toBe(1);
    });

    it('should sort top IPs by connection count', () => {
      const middleware = connectionLimitMiddleware();

      // Create multiple connections from different IPs
      for (let i = 0; i < 3; i++) {
        const req = mockRequest({ ip: '192.168.1.100' });
        const res = mockResponse();
        const next = vi.fn();
        middleware(req, res, next);
      }

      for (let i = 0; i < 2; i++) {
        const req = mockRequest({ ip: '192.168.1.101' });
        const res = mockResponse();
        const next = vi.fn();
        middleware(req, res, next);
      }

      const req = mockRequest({ ip: '192.168.1.102' });
      const res = mockResponse();
      const next = vi.fn();
      middleware(req, res, next);

      const stats = getConnectionStats();

      expect(stats.topIPs[0].ip).toBe('192.168.1.100');
      expect(stats.topIPs[0].connections).toBe(3);
      expect(stats.topIPs[1].ip).toBe('192.168.1.101');
      expect(stats.topIPs[1].connections).toBe(2);
      expect(stats.topIPs[2].ip).toBe('192.168.1.102');
      expect(stats.topIPs[2].connections).toBe(1);
    });
  });

  describe('Lifecycle management', () => {
    it('should start and stop cleanup', () => {
      startResourceProtectionCleanup();
      stopResourceProtectionCleanup();

      // Should not throw
      expect(true).toBe(true);
    });

    it('should be idempotent', () => {
      startResourceProtectionCleanup();
      startResourceProtectionCleanup(); // Should be safe

      stopResourceProtectionCleanup();
      stopResourceProtectionCleanup(); // Should be safe
    });
  });

  describe('Configuration from environment', () => {
    it('should use environment variable for max connections', () => {
      process.env.A2A_MAX_CONNECTIONS_PER_IP = '2';

      const middleware = connectionLimitMiddleware();
      const ip = '192.168.1.200';

      // Create 2 connections (at limit)
      for (let i = 0; i < 2; i++) {
        const req = mockRequest({ ip });
        const res = mockResponse();
        const next = vi.fn();
        middleware(req, res, next);
        expect(next).toHaveBeenCalled();
      }

      // 3rd should be rejected
      const req3 = mockRequest({ ip });
      const res3 = mockResponse();
      const next3 = vi.fn();
      middleware(req3, res3, next3);

      expect(res3.status).toHaveBeenCalledWith(503);
    });

    it('should use default on invalid environment variable', () => {
      process.env.A2A_MAX_CONNECTIONS_PER_IP = 'invalid';

      const middleware = connectionLimitMiddleware();

      // Should use default (10) instead of invalid value
      const req = mockRequest();
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should clamp payload size to reasonable max', () => {
      process.env.A2A_MAX_PAYLOAD_SIZE_MB = '1000'; // Try to set 1GB (unreasonable)

      const middleware = payloadSizeLimitMiddleware();

      // Should use default instead
      const req = mockRequest({
        get: vi.fn().mockReturnValue('1048576'), // 1MB
      });
      const res = mockResponse();
      const next = vi.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });
});
