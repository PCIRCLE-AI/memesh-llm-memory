/**
 * @fileoverview Tests for platform-aware agent ID generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock os module before importing anything that uses it
vi.mock('os', () => ({
  hostname: vi.fn(() => 'default-hostname'),
  userInfo: vi.fn(() => ({
    username: 'default-user',
    uid: 1000,
    gid: 1000,
    shell: '/bin/bash',
    homedir: '/home/default-user',
  })),
}));

// Mock platform detection
vi.mock('../platformDetection.js', () => ({
  detectPlatform: vi.fn(() => 'claude-code'),
}));

import { generateAgentId } from '../agentId.js';
import { detectPlatform } from '../platformDetection.js';
import * as os from 'os';

describe('generateAgentId', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should generate ID in format: hostname-username-platform', () => {
    // Mock os functions
    vi.mocked(os.hostname).mockReturnValue('test-machine');
    vi.mocked(os.userInfo).mockReturnValue({
      username: 'testuser',
      uid: 1000,
      gid: 1000,
      shell: '/bin/bash',
      homedir: '/home/testuser',
    });
    vi.mocked(detectPlatform).mockReturnValue('claude-code');

    const agentId = generateAgentId();

    expect(agentId).toBe('test-machine-testuser-claude-code');
  });

  it('should produce same ID for same machine/user/platform (deterministic)', () => {
    // Mock os functions with consistent values
    vi.mocked(os.hostname).mockReturnValue('my-laptop');
    vi.mocked(os.userInfo).mockReturnValue({
      username: 'john',
      uid: 1000,
      gid: 1000,
      shell: '/bin/bash',
      homedir: '/home/john',
    });
    vi.mocked(detectPlatform).mockReturnValue('claude-code');

    const id1 = generateAgentId();
    const id2 = generateAgentId();

    expect(id1).toBe(id2);
    expect(id1).toBe('my-laptop-john-claude-code');
  });

  it('should sanitize hostname (lowercase, replace special chars with hyphen)', () => {
    // Mock hostname with special characters
    vi.mocked(os.hostname).mockReturnValue('Test.Machine_123');
    vi.mocked(os.userInfo).mockReturnValue({
      username: 'user',
      uid: 1000,
      gid: 1000,
      shell: '/bin/bash',
      homedir: '/home/user',
    });
    vi.mocked(detectPlatform).mockReturnValue('claude-code');

    const agentId = generateAgentId();

    expect(agentId).toBe('test-machine-123-user-claude-code');
    expect(agentId).toMatch(/^[a-z0-9-]+$/); // Only lowercase alphanumeric and hyphens
  });

  it('should produce different IDs for different platforms', () => {
    vi.mocked(os.hostname).mockReturnValue('laptop');
    vi.mocked(os.userInfo).mockReturnValue({
      username: 'developer',
      uid: 1000,
      gid: 1000,
      shell: '/bin/bash',
      homedir: '/home/developer',
    });

    // First call with Claude Code
    vi.mocked(detectPlatform).mockReturnValue('claude-code');
    const claudeId = generateAgentId();

    // Second call with ChatGPT
    vi.mocked(detectPlatform).mockReturnValue('chatgpt');
    const chatgptId = generateAgentId();

    expect(claudeId).toBe('laptop-developer-claude-code');
    expect(chatgptId).toBe('laptop-developer-chatgpt');
    expect(claudeId).not.toBe(chatgptId);
  });

  it('should handle unknown platform', () => {
    vi.mocked(os.hostname).mockReturnValue('server');
    vi.mocked(os.userInfo).mockReturnValue({
      username: 'admin',
      uid: 0,
      gid: 0,
      shell: '/bin/bash',
      homedir: '/root',
    });
    vi.mocked(detectPlatform).mockReturnValue('unknown');

    const agentId = generateAgentId();

    expect(agentId).toBe('server-admin-unknown');
  });
});
