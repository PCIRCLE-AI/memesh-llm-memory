/**
 * Cloud-Only Mode Integration Tests
 *
 * Verifies that when running in cloud-only mode:
 * 1. Memory-dependent tools return appropriate error messages
 * 2. Non-memory tools continue to work normally
 * 3. Error messages provide clear guidance to users
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServerInitializer } from '../../src/mcp/ServerInitializer.js';
import { ToolHandlers } from '../../src/mcp/handlers/ToolHandlers.js';
import { BuddyHandlers } from '../../src/mcp/handlers/BuddyHandlers.js';
import * as BetterSqlite3Adapter from '../../src/db/adapters/BetterSqlite3Adapter.js';
import * as MeMeshCloudClient from '../../src/cloud/MeMeshCloudClient.js';

describe('Cloud-Only Mode - Integration Tests', () => {
  let toolHandlers: ToolHandlers;
  let buddyHandlers: BuddyHandlers;

  beforeEach(async () => {
    // Mock SQLite as unavailable
    vi.spyOn(BetterSqlite3Adapter, 'checkBetterSqlite3Availability').mockResolvedValue({
      available: false,
      name: 'better-sqlite3',
      error: 'Module not found',
      fallbackSuggestion: 'Run: npm install better-sqlite3',
    });

    // Mock cloud as enabled
    process.env.MEMESH_API_KEY = 'test-integration-key';
    vi.spyOn(MeMeshCloudClient, 'isCloudEnabled').mockReturnValue(true);

    // Initialize server in cloud-only mode
    const components = await ServerInitializer.initialize();

    // Verify we're in cloud-only mode
    expect(components.cloudOnlyMode).toBe(true);
    expect(components.knowledgeGraph).toBeUndefined();
    expect(components.projectMemoryManager).toBeUndefined();

    // Get handler instances
    toolHandlers = components.toolHandlers;
    buddyHandlers = components.buddyHandlers;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.MEMESH_API_KEY;
  });

  describe('Memory-Dependent Tools', () => {
    it('should return cloud-only error for recall-memory tool', async () => {
      const result = await toolHandlers.handleRecallMemory({
        query: 'test query',
        limit: 5,
      });

      expect(result.isError).toBe(true);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining("❌ Tool 'recall-memory' is not available in cloud-only mode"),
      });
      expect(result.content[0].text).toContain('better-sqlite3 unavailable');
      expect(result.content[0].text).toContain('Install better-sqlite3');
      expect(result.content[0].text).toContain('memesh-cloud-sync');
    });

    it('should return cloud-only error for create-entities tool', async () => {
      const result = await toolHandlers.handleCreateEntities({
        entities: [{ text: 'test entity' }],
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("❌ Tool 'create-entities' is not available in cloud-only mode");
    });

    it('should return cloud-only error for buddy-do tool', async () => {
      const result = await buddyHandlers.handleBuddyDo({
        task: 'test task',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("❌ Tool 'buddy-do' is not available in cloud-only mode");
    });

    it('should return cloud-only error for buddy-remember tool', async () => {
      const result = await buddyHandlers.handleBuddyRemember({
        query: 'test query',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("❌ Tool 'buddy-remember' is not available in cloud-only mode");
    });

    it('should return cloud-only error for hook-tool-use', async () => {
      const result = await toolHandlers.handleHookToolUse({
        toolName: 'test-tool',
        success: true,
        durationMs: 100,
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("❌ Tool 'hook-tool-use' is not available in cloud-only mode");
    });
  });

  describe('Non-Memory Tools', () => {
    it('should work normally for buddy-help tool', async () => {
      const result = await buddyHandlers.handleBuddyHelp({});

      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();
      // Check for MeMesh branding in output
      expect(result.content[0].text).toMatch(/MeMesh|buddy-do|buddy-remember/i);
    });

    it('should work normally for list-skills tool', async () => {
      const result = await toolHandlers.handleListSkills({});

      expect(result.isError).toBeUndefined();
      expect(result.content).toBeDefined();
      // Should return skill list (may be empty, but not an error)
    });
  });

  describe('Error Message Quality', () => {
    it('should provide actionable guidance in error messages', async () => {
      const result = await toolHandlers.handleRecallMemory({
        query: 'test',
      });

      const errorText = result.content[0].text;

      // Should explain what's wrong
      expect(errorText).toMatch(/cloud-only mode/i);
      expect(errorText).toMatch(/better-sqlite3 unavailable/i);

      // Should provide solutions
      expect(errorText).toMatch(/Install better-sqlite3/i);
      expect(errorText).toMatch(/Restart.*MCP server/i);
      expect(errorText).toMatch(/memesh-cloud-sync/i);

      // Should mention cloud alternative
      expect(errorText).toMatch(/MEMESH_API_KEY/i);
    });

    it('should use consistent error format across all memory tools', async () => {
      const tools = [
        () => toolHandlers.handleRecallMemory({ query: 'test' }),
        () => toolHandlers.handleCreateEntities({ entities: [] }),
        () => buddyHandlers.handleBuddyDo({ task: 'test' }),
        () => buddyHandlers.handleBuddyRemember({ query: 'test' }),
      ];

      const results = await Promise.all(tools.map(fn => fn()));

      // All should be errors
      expect(results.every(r => r.isError === true)).toBe(true);

      // All should start with ❌ emoji
      expect(results.every(r => r.content[0].text.startsWith('❌'))).toBe(true);

      // All should mention cloud-only mode
      expect(results.every(r => r.content[0].text.includes('cloud-only mode'))).toBe(true);

      // All should provide installation instructions
      expect(results.every(r => r.content[0].text.includes('npm install better-sqlite3'))).toBe(true);
    });
  });
});
