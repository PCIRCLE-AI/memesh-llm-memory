/**
 * ServerInitializer Cloud-Only Mode Tests
 *
 * Tests for Phase 2: Cloud-Only Fallback Mode
 * Verifies that the server can initialize successfully when better-sqlite3
 * is unavailable but MEMESH_API_KEY is set.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServerInitializer } from '../../../src/mcp/ServerInitializer.js';
import * as BetterSqlite3Adapter from '../../../src/db/adapters/BetterSqlite3Adapter.js';
import * as MeMeshCloudClient from '../../../src/cloud/MeMeshCloudClient.js';

describe('ServerInitializer - Cloud-Only Mode', () => {
  beforeEach(() => {
    // Reset environment
    delete process.env.MEMESH_API_KEY;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.MEMESH_API_KEY;
  });

  it('should initialize successfully when SQLite available', async () => {
    // Mock SQLite as available
    vi.spyOn(BetterSqlite3Adapter, 'checkBetterSqlite3Availability').mockResolvedValue({
      available: true,
      name: 'better-sqlite3',
    });

    const components = await ServerInitializer.initialize();

    expect(components.cloudOnlyMode).toBe(false);
    expect(components.knowledgeGraph).toBeDefined();
    expect(components.projectMemoryManager).toBeDefined();
    expect(components.unifiedMemoryStore).toBeDefined();
    expect(components.sessionMemoryPipeline).toBeDefined();

    // Cleanup
    if (components.knowledgeGraph) {
      await components.knowledgeGraph.close();
    }
  });

  it('should initialize in cloud-only mode when SQLite unavailable but API key present', async () => {
    // Mock SQLite as unavailable
    vi.spyOn(BetterSqlite3Adapter, 'checkBetterSqlite3Availability').mockResolvedValue({
      available: false,
      name: 'better-sqlite3',
      error: 'Module not found',
      fallbackSuggestion: 'Run: npm install better-sqlite3',
    });

    // Mock cloud as enabled
    process.env.MEMESH_API_KEY = 'test-key';
    vi.spyOn(MeMeshCloudClient, 'isCloudEnabled').mockReturnValue(true);

    const components = await ServerInitializer.initialize();

    // Should be in cloud-only mode
    expect(components.cloudOnlyMode).toBe(true);
    expect(components.knowledgeGraph).toBeUndefined();
    expect(components.projectMemoryManager).toBeUndefined();
    expect(components.unifiedMemoryStore).toBeUndefined();
    expect(components.sessionMemoryPipeline).toBeUndefined();

    // Core components should still be initialized
    expect(components.formatter).toBeDefined();
    expect(components.agentRegistry).toBeDefined();
    expect(components.skillManager).toBeDefined();
    expect(components.toolHandlers).toBeDefined();
    expect(components.buddyHandlers).toBeDefined();
  });

  it('should throw error when both SQLite and Cloud are unavailable', async () => {
    // Mock SQLite as unavailable
    vi.spyOn(BetterSqlite3Adapter, 'checkBetterSqlite3Availability').mockResolvedValue({
      available: false,
      name: 'better-sqlite3',
      error: 'Module not found',
      fallbackSuggestion: 'Run: npm install better-sqlite3',
    });

    // Mock cloud as disabled
    vi.spyOn(MeMeshCloudClient, 'isCloudEnabled').mockReturnValue(false);

    await expect(ServerInitializer.initialize()).rejects.toThrow(
      /Cannot start MCP server.*better-sqlite3 is unavailable.*no cloud API key/
    );
  });

  it('should initialize with standard mode when both SQLite and Cloud are available', async () => {
    // Mock SQLite as available
    vi.spyOn(BetterSqlite3Adapter, 'checkBetterSqlite3Availability').mockResolvedValue({
      available: true,
      name: 'better-sqlite3',
    });

    // Mock cloud as enabled
    process.env.MEMESH_API_KEY = 'test-key';
    vi.spyOn(MeMeshCloudClient, 'isCloudEnabled').mockReturnValue(true);

    const components = await ServerInitializer.initialize();

    // Should prefer local SQLite over cloud
    expect(components.cloudOnlyMode).toBe(false);
    expect(components.knowledgeGraph).toBeDefined();
    expect(components.projectMemoryManager).toBeDefined();

    // Cleanup
    if (components.knowledgeGraph) {
      await components.knowledgeGraph.close();
    }
  });
});
