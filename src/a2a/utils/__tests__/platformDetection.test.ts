/**
 * @fileoverview Tests for platform detection utility
 * Tests AI platform detection from environment variables
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { detectPlatform, type Platform } from '../platformDetection.js';

describe('Platform Detection', () => {
  // Store original env vars to restore after tests
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Clean all platform-related env vars before each test
    delete process.env.CLAUDE_CODE_VERSION;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.CURSOR_VERSION;
    delete process.env.VSCODE_PID;
  });

  afterEach(() => {
    // Restore original env vars after each test
    process.env = { ...originalEnv };
  });

  it('should detect Claude Code platform', () => {
    process.env.CLAUDE_CODE_VERSION = '1.0.0';
    const platform = detectPlatform();
    expect(platform).toBe('claude-code');
  });

  it('should detect ChatGPT platform', () => {
    process.env.OPENAI_API_KEY = 'sk-test-key';
    const platform = detectPlatform();
    expect(platform).toBe('chatgpt');
  });

  it('should detect Gemini platform', () => {
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    const platform = detectPlatform();
    expect(platform).toBe('gemini');
  });

  it('should detect Cursor platform', () => {
    process.env.CURSOR_VERSION = '1.0.0';
    const platform = detectPlatform();
    expect(platform).toBe('cursor');
  });

  it('should detect VS Code platform', () => {
    process.env.VSCODE_PID = '12345';
    const platform = detectPlatform();
    expect(platform).toBe('vscode');
  });

  it('should return unknown when no platform detected', () => {
    // All env vars already cleared in beforeEach
    const platform = detectPlatform();
    expect(platform).toBe('unknown');
  });

  it('should prioritize Claude Code over other platforms', () => {
    // Set multiple env vars - Claude Code should win
    process.env.CLAUDE_CODE_VERSION = '1.0.0';
    process.env.OPENAI_API_KEY = 'sk-test-key';
    process.env.GEMINI_API_KEY = 'test-gemini-key';
    process.env.CURSOR_VERSION = '1.0.0';
    process.env.VSCODE_PID = '12345';

    const platform = detectPlatform();
    expect(platform).toBe('claude-code');
  });
});
