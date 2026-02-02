/**
 * Error Messages Test Suite
 *
 * Tests centralized error code and message system.
 */

import { describe, it, expect } from 'vitest';
import { ErrorCodes } from '../ErrorCodes.js';
import {
  ErrorMessages,
  formatErrorMessage,
  createError,
  getErrorMessage,
} from '../ErrorMessages.js';

describe('ErrorMessages', () => {
  describe('formatErrorMessage', () => {
    it('should format static error messages', () => {
      const message = formatErrorMessage(ErrorCodes.AUTH_FAILED);
      expect(message).toBe('Authentication failed - invalid A2A token');
    });

    it('should format dynamic error messages with parameters', () => {
      const message = formatErrorMessage(ErrorCodes.AGENT_NOT_FOUND, 'agent-123');
      expect(message).toBe('Agent not found: agent-123');
    });

    it('should format task timeout with multiple parameters', () => {
      const message = formatErrorMessage(ErrorCodes.TASK_TIMEOUT, 'task-456', 300);
      expect(message).toBe('Task timeout detected: task-456 (timeout: 300s)');
    });

    it('should format error with agent and target agent', () => {
      const message = formatErrorMessage(
        ErrorCodes.TASK_SEND_FAILED,
        'agent-2',
        'Connection refused'
      );
      expect(message).toBe('Failed to send message to agent-2: Connection refused');
    });
  });

  describe('createError', () => {
    it('should create error with static message', () => {
      const error = createError(ErrorCodes.AUTH_TOKEN_NOT_CONFIGURED);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('MEMESH_A2A_TOKEN environment variable is not configured');
      expect((error as any).code).toBe(ErrorCodes.AUTH_TOKEN_NOT_CONFIGURED);
    });

    it('should create error with dynamic message', () => {
      const error = createError(ErrorCodes.AGENT_NOT_FOUND, 'test-agent');
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Agent not found: test-agent');
      expect((error as any).code).toBe(ErrorCodes.AGENT_NOT_FOUND);
    });

    it('should create error with multiple parameters', () => {
      const error = createError(ErrorCodes.PORT_NOT_AVAILABLE, 3000, 3999);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('No available port in range 3000-3999');
      expect((error as any).code).toBe(ErrorCodes.PORT_NOT_AVAILABLE);
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error instance', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('should convert string to message', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should convert unknown types to string', () => {
      expect(getErrorMessage(null)).toBe('null');
      expect(getErrorMessage(undefined)).toBe('undefined');
      expect(getErrorMessage(42)).toBe('42');
      expect(getErrorMessage({ message: 'Object' })).toBe('[object Object]');
    });
  });

  describe('ErrorCodes', () => {
    it('should define authentication error codes', () => {
      expect(ErrorCodes.AUTH_TOKEN_NOT_CONFIGURED).toBe('AUTH_TOKEN_NOT_CONFIGURED');
      expect(ErrorCodes.AUTH_FAILED).toBe('AUTH_FAILED');
      expect(ErrorCodes.AUTH_TOKEN_MISSING).toBe('AUTH_TOKEN_MISSING');
    });

    it('should define agent error codes', () => {
      expect(ErrorCodes.AGENT_NOT_FOUND).toBe('AGENT_NOT_FOUND');
      expect(ErrorCodes.AGENT_ALREADY_PROCESSING).toBe('AGENT_ALREADY_PROCESSING');
    });

    it('should define task error codes', () => {
      expect(ErrorCodes.TASK_TIMEOUT).toBe('TASK_TIMEOUT');
      expect(ErrorCodes.TASK_SEND_FAILED).toBe('TASK_SEND_FAILED');
      expect(ErrorCodes.TASK_GET_FAILED).toBe('TASK_GET_FAILED');
    });

    it('should define timeout checker error codes', () => {
      expect(ErrorCodes.TIMEOUT_CHECKER_ERROR).toBe('TIMEOUT_CHECKER_ERROR');
      expect(ErrorCodes.TIMEOUT_CHECKER_CIRCUIT_OPEN).toBe('TIMEOUT_CHECKER_CIRCUIT_OPEN');
    });
  });

  describe('ErrorMessages mapping', () => {
    it('should have message for every error code', () => {
      // Get all error codes
      const codes = Object.values(ErrorCodes);

      // Check that each code has a corresponding message
      codes.forEach((code) => {
        expect(ErrorMessages[code as keyof typeof ErrorMessages]).toBeDefined();
      });
    });

    it('should have consistent error code keys', () => {
      // All error codes should match their key
      Object.entries(ErrorCodes).forEach(([key, value]) => {
        expect(key).toBe(value);
      });
    });
  });

  describe('Circuit breaker error messages', () => {
    it('should format circuit breaker open message', () => {
      const message = formatErrorMessage(
        ErrorCodes.TIMEOUT_CHECKER_CIRCUIT_OPEN,
        5,
        5
      );
      expect(message).toContain('circuit breaker is open');
      expect(message).toContain('5/5 consecutive failures');
    });
  });

  describe('Error consistency', () => {
    it('should maintain consistent error format', () => {
      // Agent errors should mention agent ID
      const agentError = formatErrorMessage(ErrorCodes.AGENT_NOT_FOUND, 'test-agent');
      expect(agentError).toContain('test-agent');

      // Task errors should mention task ID
      const taskError = formatErrorMessage(ErrorCodes.TASK_TIMEOUT, 'task-123', 300);
      expect(taskError).toContain('task-123');

      // Auth errors should be clear
      const authError = formatErrorMessage(ErrorCodes.AUTH_FAILED);
      expect(authError).toContain('Authentication failed');
    });
  });
});
