/**
 * Integration test for Project Memory System
 *
 * Tests the complete hybrid tracking system end-to-end:
 * - Event-driven memory capture and recall
 * - Token-based snapshot creation
 * - Real KnowledgeGraph persistence
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { KnowledgeGraph } from '../../knowledge-graph/index.js';
import { ProjectAutoTracker } from '../ProjectAutoTracker.js';
import { ProjectMemoryManager } from '../ProjectMemoryManager.js';
import type { MCPToolInterface } from '../../core/MCPToolInterface.js';
import path from 'path';
import { existsSync, unlinkSync } from 'fs';

describe('Project Memory System - Integration', () => {
  let kg: KnowledgeGraph;
  let tracker: ProjectAutoTracker;
  let manager: ProjectMemoryManager;
  let mockMCP: MCPToolInterface;
  const testDbPath = path.join(__dirname, 'test-memory-integration.db');

  beforeEach(() => {
    // Clean up test database if exists
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }

    // Create real Knowledge Graph for integration test
    kg = new KnowledgeGraph(testDbPath);

    // Create mock MCP that writes to real KG
    mockMCP = {
      memory: {
        createEntities: vi.fn(async (args: any) => {
          for (const entity of args.entities) {
            kg.createEntity({
              name: entity.name,
              type: entity.entityType,
              observations: entity.observations,
            });
          }
        }),
      },
    } as any;

    tracker = new ProjectAutoTracker(mockMCP);
    manager = new ProjectMemoryManager(kg);
  });

  afterEach(() => {
    kg.close();
    // Clean up test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  it('should capture and recall event-driven memories', async () => {
    // Simulate code change event
    await tracker.recordCodeChange(
      ['src/test.ts', 'src/utils.ts'],
      'Added integration test'
    );

    // Recall recent work using real manager
    const memories = await manager.recallRecentWork({ limit: 5 });

    expect(memories.length).toBeGreaterThan(0);
    expect(memories[0].type).toBe('code_change');

    // Verify observations contain file information
    const hasFileInfo = memories[0].observations?.some(
      (obs) => obs.includes('src/test.ts') || obs.includes('src/utils.ts')
    );
    expect(hasFileInfo).toBe(true);
  });

  it('should create token-based snapshots', async () => {
    // Simulate token progression (below threshold)
    await tracker.addTokens(5000);

    // Should not create snapshot yet
    let memories = await manager.recallRecentWork({
      limit: 5,
      types: ['project_snapshot'],
    });
    expect(memories).toHaveLength(0);

    // Simulate crossing threshold
    await tracker.addTokens(5000); // Total: 10,000 (triggers snapshot)

    // Should create snapshot now
    memories = await manager.recallRecentWork({
      limit: 5,
      types: ['project_snapshot'],
    });

    expect(memories.length).toBeGreaterThan(0);
    expect(memories[0].type).toBe('project_snapshot');

    // Verify snapshot contains token count
    const hasTokenInfo = memories[0].observations?.some((obs) =>
      obs.includes('10000')
    );
    expect(hasTokenInfo).toBe(true);
  });

  it('should handle multiple event types in sequence', async () => {
    // Record code change
    await tracker.recordCodeChange(
      ['src/feature.ts'],
      'Implemented new feature'
    );

    // Record test result
    await tracker.recordTestResult({
      passed: 10,
      failed: 0,
      total: 10,
      failures: [],
    });

    // Create snapshot by crossing threshold
    await tracker.addTokens(10000);

    // Verify all memories were created
    // Note: Must explicitly include 'project_snapshot' since default types use 'session_snapshot'
    const allMemories = await manager.recallRecentWork({
      limit: 10,
      types: ['code_change', 'test_result', 'project_snapshot'],
    });

    expect(allMemories.length).toBeGreaterThanOrEqual(3);

    const types = new Set(allMemories.map((m) => m.type));
    expect(types.has('code_change')).toBe(true);
    expect(types.has('test_result')).toBe(true);
    expect(types.has('project_snapshot')).toBe(true);
  });
});
