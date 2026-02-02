import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { requestTimeoutMiddleware, getTimeoutMs } from '../../../../src/a2a/server/middleware/timeout.js';

describe('Request Timeout Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;
  let jsonSpy: ReturnType<typeof vi.fn>;
  let statusSpy: ReturnType<typeof vi.fn>;
  let headersSentValue: boolean;
  let finishCallback: (() => void) | null;
  let closeCallback: (() => void) | null;

  beforeEach(() => {
    vi.useFakeTimers();
    headersSentValue = false;
    finishCallback = null;
    closeCallback = null;
    jsonSpy = vi.fn();
    statusSpy = vi.fn().mockReturnValue({ json: jsonSpy });

    req = {};
    res = {
      status: statusSpy,
      get headersSent() {
        return headersSentValue;
      },
      on: vi.fn((event: string, callback: () => void) => {
        if (event === 'finish') {
          finishCallback = callback;
        } else if (event === 'close') {
          closeCallback = callback;
        }
      }) as any,
    };
    next = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('getTimeoutMs', () => {
    it('should return default timeout when env var not set', () => {
      delete process.env.A2A_REQUEST_TIMEOUT_MS;
      expect(getTimeoutMs()).toBe(30000);
    });

    it('should return env var value when valid', () => {
      process.env.A2A_REQUEST_TIMEOUT_MS = '60000';
      expect(getTimeoutMs()).toBe(60000);
    });

    it('should return default when env var is invalid', () => {
      process.env.A2A_REQUEST_TIMEOUT_MS = 'invalid';
      expect(getTimeoutMs()).toBe(30000);
    });

    it('should return default when env var is negative', () => {
      process.env.A2A_REQUEST_TIMEOUT_MS = '-1000';
      expect(getTimeoutMs()).toBe(30000);
    });
  });

  describe('requestTimeoutMiddleware', () => {
    it('should call next immediately', () => {
      const middleware = requestTimeoutMiddleware(1000);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledTimes(1);
    });

    it('should return 408 timeout error when request exceeds timeout', () => {
      const timeoutMs = 1000;
      const middleware = requestTimeoutMiddleware(timeoutMs);
      middleware(req as Request, res as Response, next);

      // Fast-forward time to trigger timeout
      vi.advanceTimersByTime(timeoutMs);

      expect(statusSpy).toHaveBeenCalledWith(408);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'REQUEST_TIMEOUT',
          message: `Request timeout after ${timeoutMs}ms`
        }
      });
    });

    it('should not send timeout error if headers already sent', () => {
      const middleware = requestTimeoutMiddleware(1000);
      middleware(req as Request, res as Response, next);

      // Simulate headers already sent
      headersSentValue = true;

      // Fast-forward time
      vi.advanceTimersByTime(1000);

      expect(statusSpy).not.toHaveBeenCalled();
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    it('should clear timeout when response finishes', () => {
      const middleware = requestTimeoutMiddleware(1000);
      middleware(req as Request, res as Response, next);

      // Simulate response finish
      finishCallback?.();

      // Fast-forward time
      vi.advanceTimersByTime(1000);

      // Should not send timeout error
      expect(statusSpy).not.toHaveBeenCalled();
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    it('should clear timeout when connection closes', () => {
      const middleware = requestTimeoutMiddleware(1000);
      middleware(req as Request, res as Response, next);

      // Simulate connection close
      closeCallback?.();

      // Fast-forward time
      vi.advanceTimersByTime(1000);

      // Should not send timeout error
      expect(statusSpy).not.toHaveBeenCalled();
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    it('should not affect fast requests', () => {
      const middleware = requestTimeoutMiddleware(1000);
      middleware(req as Request, res as Response, next);

      // Complete request quickly
      finishCallback?.();

      // Verify no timeout occurred
      expect(statusSpy).not.toHaveBeenCalled();
      expect(jsonSpy).not.toHaveBeenCalled();
    });

    it('should use custom timeout value', () => {
      const customTimeout = 5000;
      const middleware = requestTimeoutMiddleware(customTimeout);
      middleware(req as Request, res as Response, next);

      // Fast-forward to just before timeout
      vi.advanceTimersByTime(customTimeout - 1);
      expect(statusSpy).not.toHaveBeenCalled();

      // Fast-forward to trigger timeout
      vi.advanceTimersByTime(1);
      expect(statusSpy).toHaveBeenCalledWith(408);
      expect(jsonSpy).toHaveBeenCalledWith({
        success: false,
        error: {
          code: 'REQUEST_TIMEOUT',
          message: `Request timeout after ${customTimeout}ms`
        }
      });
    });
  });
});
