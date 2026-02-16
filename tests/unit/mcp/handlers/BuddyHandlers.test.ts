/**
 * BuddyHandlers Unit Tests
 *
 * Tests for the buddy command handlers (buddy-help, buddy-do, buddy-remember).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BuddyHandlers } from '../../../../src/mcp/handlers/BuddyHandlers.js';
import { ResponseFormatter } from '../../../../src/ui/ResponseFormatter.js';
import type { ProjectMemoryManager } from '../../../../src/memory/ProjectMemoryManager.js';
import type { ProjectAutoTracker } from '../../../../src/memory/ProjectAutoTracker.js';

describe('BuddyHandlers', () => {
  let buddyHandlers: BuddyHandlers;
  let mockFormatter: ResponseFormatter;
  let mockProjectMemoryManager: ProjectMemoryManager;
  let mockAutoTracker: ProjectAutoTracker;

  beforeEach(() => {
    // Create mock formatter
    mockFormatter = new ResponseFormatter();

    // Create mock ProjectMemoryManager
    mockProjectMemoryManager = {
      recallRecentWork: vi.fn(),
      searchMemories: vi.fn(),
    } as unknown as ProjectMemoryManager;

    // Create mock ProjectAutoTracker
    mockAutoTracker = {} as ProjectAutoTracker;

    // Initialize BuddyHandlers with mocks
    buddyHandlers = new BuddyHandlers(
      mockFormatter,
      mockProjectMemoryManager,
      mockAutoTracker
    );
  });

  describe('buddy-help', () => {
    it('should return general help when called with no arguments', async () => {
      const result = await buddyHandlers.handleBuddyHelp({});

      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0].type).toBe('text');

      const helpText = result.content[0].text;

      // Should contain MeMesh branding
      expect(helpText).toMatch(/MeMesh|buddy-do|buddy-remember/i);

      // Should contain essential commands
      expect(helpText).toContain('buddy-do');
      expect(helpText).toContain('buddy-remember');
    });

    it('should return help for specific command when "command" argument provided', async () => {
      const result = await buddyHandlers.handleBuddyHelp({
        command: 'do'
      });

      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const helpText = result.content[0].text;

      // Should contain specific command help
      expect(helpText).toMatch(/buddy-do/i);
    });

    it('should handle invalid command gracefully', async () => {
      const result = await buddyHandlers.handleBuddyHelp({
        command: 'invalid-command-that-does-not-exist'
      });

      // Should still return help (not an error)
      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
    });

    it('should work in cloud-only mode (no ProjectMemoryManager)', async () => {
      // Create BuddyHandlers without ProjectMemoryManager
      const cloudOnlyHandlers = new BuddyHandlers(
        mockFormatter,
        undefined, // No ProjectMemoryManager
        undefined  // No ProjectAutoTracker
      );

      const result = await cloudOnlyHandlers.handleBuddyHelp({});

      // buddy-help should work even in cloud-only mode
      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].text).toMatch(/MeMesh|buddy/i);
    });
  });

  describe('buddy-do (cloud-only mode)', () => {
    it('should return cloud-only error when ProjectMemoryManager unavailable', async () => {
      // Create BuddyHandlers without ProjectMemoryManager
      const cloudOnlyHandlers = new BuddyHandlers(
        mockFormatter,
        undefined, // No ProjectMemoryManager
        undefined
      );

      const result = await cloudOnlyHandlers.handleBuddyDo({
        task: 'test task'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not available in cloud-only mode');
      expect(result.content[0].text).toContain('better-sqlite3');
    });
  });

  describe('buddy-remember (cloud-only mode)', () => {
    it('should return cloud-only error when ProjectMemoryManager unavailable', async () => {
      // Create BuddyHandlers without ProjectMemoryManager
      const cloudOnlyHandlers = new BuddyHandlers(
        mockFormatter,
        undefined, // No ProjectMemoryManager
        undefined
      );

      const result = await cloudOnlyHandlers.handleBuddyRemember({
        query: 'test query'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not available in cloud-only mode');
      expect(result.content[0].text).toContain('better-sqlite3');
    });
  });

  describe('Input validation', () => {
    it('should handle missing task parameter for buddy-do', async () => {
      const result = await buddyHandlers.handleBuddyDo({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid');
    });

    it('should handle missing query parameter for buddy-remember', async () => {
      const result = await buddyHandlers.handleBuddyRemember({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid');
    });

    it('should handle invalid input types', async () => {
      const result = await buddyHandlers.handleBuddyDo({
        task: 123 // Should be string
      });

      expect(result.isError).toBe(true);
    });
  });
});
