/**
 * Error Handler Test Suite
 *
 * Tests for centralized error handling utilities including:
 * - Error recovery suggestions
 * - Error formatting with suggestions
 * - Stack trace sanitization
 */

import { describe, it, expect } from 'vitest';
import {
  getRecoverySuggestion,
  formatErrorWithSuggestion,
  getErrorMessage,
  getErrorStack,
} from '../errorHandler.js';

describe('errorHandler', () => {
  describe('getRecoverySuggestion', () => {
    it('should return git repository suggestion for git errors', () => {
      const error = new Error('fatal: not a git repository');
      const result = getRecoverySuggestion(error);
      expect(result).toBeDefined();
      expect(result?.suggestion).toContain('git init');
      expect(result?.category).toBe('GIT');
    });

    it('should return suggestion for nothing to commit', () => {
      const error = new Error('nothing to commit, working tree clean');
      const result = getRecoverySuggestion(error);
      expect(result).toBeDefined();
      expect(result?.suggestion).toContain('No changes detected');
    });

    it('should return suggestion for invalid reference', () => {
      const error = new Error('invalid reference: HEAD~100');
      const result = getRecoverySuggestion(error);
      expect(result).toBeDefined();
      expect(result?.suggestion).toContain('git log');
    });

    it('should return suggestion for permission denied', () => {
      const error = new Error('EACCES: permission denied');
      const result = getRecoverySuggestion(error);
      expect(result).toBeDefined();
      expect(result?.suggestion).toContain('permissions');
      expect(result?.category).toBe('FILESYSTEM');
    });

    it('should return suggestion for file not found', () => {
      const error = new Error('ENOENT: no such file or directory');
      const result = getRecoverySuggestion(error);
      expect(result).toBeDefined();
      expect(result?.suggestion).toContain('path');
      expect(result?.category).toBe('FILESYSTEM');
    });

    it('should return suggestion for disk space errors', () => {
      const error = new Error('insufficient disk space');
      const result = getRecoverySuggestion(error);
      expect(result).toBeDefined();
      expect(result?.suggestion).toContain('disk space');
    });

    it('should return suggestion for connection refused', () => {
      const error = new Error('ECONNREFUSED: connection refused');
      const result = getRecoverySuggestion(error);
      expect(result).toBeDefined();
      expect(result?.suggestion).toContain('service');
      expect(result?.category).toBe('NETWORK');
    });

    it('should return suggestion for timeout errors', () => {
      const error = new Error('ETIMEDOUT: connection timed out');
      const result = getRecoverySuggestion(error);
      expect(result).toBeDefined();
      expect(result?.suggestion).toContain('network');
      expect(result?.category).toBe('NETWORK');
    });

    it('should return suggestion for DNS errors', () => {
      const error = new Error('ENOTFOUND: DNS lookup failed');
      const result = getRecoverySuggestion(error);
      expect(result).toBeDefined();
      expect(result?.suggestion).toContain('hostname');
      expect(result?.category).toBe('NETWORK');
    });

    it('should return suggestion for validation errors', () => {
      const error = new Error('validation failed: invalid input');
      const result = getRecoverySuggestion(error);
      expect(result).toBeDefined();
      expect(result?.suggestion).toContain('input');
      expect(result?.category).toBe('VALIDATION');
    });

    it('should return suggestion for unauthorized errors', () => {
      const error = new Error('unauthorized: authentication failed');
      const result = getRecoverySuggestion(error);
      expect(result).toBeDefined();
      expect(result?.suggestion).toContain('credentials');
      expect(result?.category).toBe('AUTH');
    });

    it('should return suggestion for database locked errors', () => {
      const error = new Error('SQLITE_BUSY: database is locked');
      const result = getRecoverySuggestion(error);
      expect(result).toBeDefined();
      expect(result?.suggestion).toContain('database');
      expect(result?.category).toBe('DATABASE');
    });

    it('should return suggestion for rate limit errors', () => {
      const error = new Error('rate limit exceeded');
      const result = getRecoverySuggestion(error);
      expect(result).toBeDefined();
      expect(result?.suggestion).toContain('rate limit');
    });

    it('should return undefined for unknown errors', () => {
      const error = new Error('some random unknown error');
      const suggestion = getRecoverySuggestion(error);
      expect(suggestion).toBeUndefined();
    });

    it('should handle string errors', () => {
      const result = getRecoverySuggestion('not a git repository');
      expect(result).toBeDefined();
      expect(result?.suggestion).toContain('git init');
    });
  });

  describe('formatErrorWithSuggestion', () => {
    it('should format error with operation name', () => {
      const error = new Error('Something went wrong');
      const formatted = formatErrorWithSuggestion(error, 'save work');
      expect(formatted).toContain('Failed to save work');
      expect(formatted).toContain('Something went wrong');
    });

    it('should include recovery suggestion when available', () => {
      const error = new Error('not a git repository');
      const formatted = formatErrorWithSuggestion(error, 'list versions');
      expect(formatted).toContain('Failed to list versions');
      expect(formatted).toContain('git init');
    });

    it('should not include suggestion for unknown errors', () => {
      const error = new Error('some random error');
      const formatted = formatErrorWithSuggestion(error, 'do something');
      expect(formatted).toContain('Failed to do something');
      expect(formatted).not.toContain('Try:');
      expect(formatted).not.toContain('Check:');
    });

    it('should handle string errors', () => {
      const formatted = formatErrorWithSuggestion('connection refused', 'connect');
      expect(formatted).toContain('Failed to connect');
      expect(formatted).toContain('connection refused');
    });
  });

  describe('getErrorMessage', () => {
    it('should extract message from Error object', () => {
      const error = new Error('Test error message');
      expect(getErrorMessage(error)).toBe('Test error message');
    });

    it('should convert string to message', () => {
      expect(getErrorMessage('String error')).toBe('String error');
    });

    it('should convert number to message', () => {
      expect(getErrorMessage(404)).toBe('404');
    });

    it('should convert object to string', () => {
      expect(getErrorMessage({ code: 'ERR' })).toBe('[object Object]');
    });
  });

  describe('getErrorStack', () => {
    it('should return stack from Error object', () => {
      const error = new Error('Test error');
      const stack = getErrorStack(error);
      expect(stack).toContain('Error: Test error');
    });

    it('should return undefined for non-Error objects', () => {
      expect(getErrorStack('string error')).toBeUndefined();
      expect(getErrorStack(123)).toBeUndefined();
      expect(getErrorStack(null)).toBeUndefined();
    });
  });
});
