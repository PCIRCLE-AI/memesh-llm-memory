/**
 * Integration test for ProjectMemoryCleanup with real KnowledgeGraph
 *
 * This test verifies that cleanup works correctly with actual SQLite database
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProjectMemoryCleanup } from '../ProjectMemoryCleanup.js';
import { KnowledgeGraph } from '../../knowledge-graph/index.js';
import { existsSync, unlinkSync } from 'fs';

describe('ProjectMemoryCleanup Integration', () => {
  let cleanup: ProjectMemoryCleanup;
  let kg: KnowledgeGraph;
  const testDbPath = './data/test-cleanup-integration.db';

  beforeEach(() => {
    // Clean up test database if exists
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
    kg = new KnowledgeGraph(testDbPath);
    cleanup = new ProjectMemoryCleanup(kg);
  });

  afterEach(() => {
    kg.close();
    // Clean up test database
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  it('should cleanup old memories with real KnowledgeGraph', async () => {
    // Create old entity (31 days ago)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 31);

    kg.createEntity({
      name: 'OldCodeChange',
      type: 'code_change',
      observations: [
        'Files modified: 2',
        'src/test.ts',
        `Timestamp: ${oldDate.toISOString()}`
      ]
    });

    // Create recent entity (10 days ago)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 10);

    kg.createEntity({
      name: 'RecentCodeChange',
      type: 'code_change',
      observations: [
        'Files modified: 1',
        'src/new.ts',
        `Timestamp: ${recentDate.toISOString()}`
      ]
    });

    // Verify both entities exist
    const beforeCleanup = kg.searchEntities({ type: 'code_change' });
    expect(beforeCleanup).toHaveLength(2);

    // Run cleanup
    const deleted = await cleanup.cleanupOldMemories();

    // Should delete only old entity
    expect(deleted).toBe(1);

    // Verify only recent entity remains
    const afterCleanup = kg.searchEntities({ type: 'code_change' });
    expect(afterCleanup).toHaveLength(1);
    expect(afterCleanup[0].name).toBe('RecentCodeChange');
  });

  it('should handle multiple entity types', async () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 35);

    // Create old entities of different types
    kg.createEntity({
      name: 'OldCodeChange',
      type: 'code_change',
      observations: [`Timestamp: ${oldDate.toISOString()}`]
    });

    kg.createEntity({
      name: 'OldTestResult',
      type: 'test_result',
      observations: [`Timestamp: ${oldDate.toISOString()}`]
    });

    kg.createEntity({
      name: 'OldSnapshot',
      type: 'session_snapshot',
      observations: [`Timestamp: ${oldDate.toISOString()}`]
    });

    // Run cleanup
    const deleted = await cleanup.cleanupOldMemories();

    // Should delete all 3 old entities
    expect(deleted).toBe(3);

    // Verify all are gone
    const stats = kg.getStats();
    expect(stats.totalEntities).toBe(0);
  });

  it('should preserve entities without timestamps', async () => {
    // Create entity without timestamp
    kg.createEntity({
      name: 'EntityNoTimestamp',
      type: 'code_change',
      observations: ['Some observation without timestamp']
    });

    // Run cleanup
    const deleted = await cleanup.cleanupOldMemories();

    // Should not delete entity without timestamp
    expect(deleted).toBe(0);

    const entities = kg.searchEntities({ type: 'code_change' });
    expect(entities).toHaveLength(1);
  });
});
