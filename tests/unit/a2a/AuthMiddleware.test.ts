import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { authenticateToken } from '../../../src/a2a/server/middleware/auth.js';
import type { Request, Response, NextFunction } from 'express';

describe('authenticateToken middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    jsonMock = vi.fn();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockReq = {
      headers: {}
    };
    mockRes = {
      status: statusMock,
      json: jsonMock
    };
    mockNext = vi.fn();

    // Set valid token for tests
    process.env.MEMESH_A2A_TOKEN = 'test-token-123';
  });

  afterEach(() => {
    delete process.env.MEMESH_A2A_TOKEN;
  });

  it('should call next() with valid token', () => {
    mockReq.headers = {
      authorization: 'Bearer test-token-123'
    };

    authenticateToken(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(statusMock).not.toHaveBeenCalled();
  });

  it('should return 401 when token is missing', () => {
    mockReq.headers = {};

    authenticateToken(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Authentication token required',
      code: 'AUTH_MISSING'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when token is invalid', () => {
    mockReq.headers = {
      authorization: 'Bearer wrong-token'
    };

    authenticateToken(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Invalid authentication token',
      code: 'AUTH_INVALID'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 500 when MEMESH_A2A_TOKEN not configured', () => {
    delete process.env.MEMESH_A2A_TOKEN;

    mockReq.headers = {
      authorization: 'Bearer some-token'
    };

    authenticateToken(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Server configuration error',
      code: 'TOKEN_NOT_CONFIGURED'
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should handle malformed Authorization header', () => {
    mockReq.headers = {
      authorization: 'InvalidFormat'
    };

    authenticateToken(mockReq as Request, mockRes as Response, mockNext);

    expect(statusMock).toHaveBeenCalledWith(401);
    expect(jsonMock).toHaveBeenCalledWith({
      error: 'Authentication token required',
      code: 'AUTH_MISSING'
    });
  });
});
