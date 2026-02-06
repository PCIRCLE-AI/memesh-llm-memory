import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { detectPlatform } from '../../src/a2a/utils/platformDetection.js';

describe('platformDetection', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clone env to prevent leaks between tests
    process.env = { ...originalEnv };

    // Clear all platform-related env vars
    delete process.env.MEMESH_PLATFORM;
    delete process.env.CLAUDE_CODE_VERSION;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.CURSOR_VERSION;
    delete process.env.VSCODE_PID;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('MEMESH_PLATFORM override', () => {
    it('should use MEMESH_PLATFORM when set to a valid platform', () => {
      process.env.MEMESH_PLATFORM = 'gemini';
      process.env.CLAUDE_CODE_VERSION = '1.0'; // would normally win
      expect(detectPlatform()).toBe('gemini');
    });

    it('should be case-insensitive', () => {
      process.env.MEMESH_PLATFORM = 'ChatGPT';
      expect(detectPlatform()).toBe('chatgpt');
    });

    it('should ignore invalid MEMESH_PLATFORM values', () => {
      process.env.MEMESH_PLATFORM = 'invalid-platform';
      process.env.CLAUDE_CODE_VERSION = '1.0';
      expect(detectPlatform()).toBe('claude-code');
    });

    it('should ignore empty MEMESH_PLATFORM', () => {
      process.env.MEMESH_PLATFORM = '';
      process.env.CLAUDE_CODE_VERSION = '1.0';
      expect(detectPlatform()).toBe('claude-code');
    });

    it('should ignore whitespace-only MEMESH_PLATFORM', () => {
      process.env.MEMESH_PLATFORM = '   ';
      process.env.CLAUDE_CODE_VERSION = '1.0';
      expect(detectPlatform()).toBe('claude-code');
    });
  });

  describe('auto-detection', () => {
    it('should detect claude-code', () => {
      process.env.CLAUDE_CODE_VERSION = '1.0';
      expect(detectPlatform()).toBe('claude-code');
    });

    it('should detect chatgpt', () => {
      process.env.OPENAI_API_KEY = 'sk-test';
      expect(detectPlatform()).toBe('chatgpt');
    });

    it('should detect gemini', () => {
      process.env.GEMINI_API_KEY = 'test-key';
      expect(detectPlatform()).toBe('gemini');
    });

    it('should detect cursor', () => {
      process.env.CURSOR_VERSION = '1.0';
      expect(detectPlatform()).toBe('cursor');
    });

    it('should detect vscode', () => {
      process.env.VSCODE_PID = '12345';
      expect(detectPlatform()).toBe('vscode');
    });

    it('should return unknown when no platform detected', () => {
      expect(detectPlatform()).toBe('unknown');
    });

    it('should prioritize claude-code over chatgpt', () => {
      process.env.CLAUDE_CODE_VERSION = '1.0';
      process.env.OPENAI_API_KEY = 'sk-test';
      expect(detectPlatform()).toBe('claude-code');
    });
  });
});
