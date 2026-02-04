/**
 * Stats Command Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { StatsCommand } from '../stats.js';
import { KnowledgeGraph } from '../../knowledge-graph/index.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync } from 'fs';

describe('StatsCommand', () => {
  let testDir: string;
  let kg: KnowledgeGraph;

  beforeAll(async () => {
    // Create temporary directory for test database
    testDir = join(tmpdir(), `memesh-stats-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Create test database with sample data
    const dbPath = join(testDir, 'test-kg.db');
    kg = await KnowledgeGraph.create(dbPath);

    // Add sample entities
    await kg.createEntity({
      name: 'Test Decision 1',
      entityType: 'decision',
      observations: ['This is a test decision'],
      tags: ['test', 'sample'],
    });

    await kg.createEntity({
      name: 'Test Bug Fix 1',
      entityType: 'bug_fix',
      observations: ['Fixed a critical bug'],
      tags: ['bug', 'critical'],
    });

    await kg.createEntity({
      name: 'Test Feature 1',
      entityType: 'feature',
      observations: ['Implemented new feature'],
      tags: ['feature', 'enhancement'],
    });
  });

  it('should create StatsCommand instance', async () => {
    const stats = await StatsCommand.create();
    expect(stats).toBeDefined();
  });

  it('should run stats without errors (default options)', async () => {
    const stats = await StatsCommand.create();
    await expect(stats.run()).resolves.not.toThrow();
  });

  it('should run stats with time range filter', async () => {
    const stats = await StatsCommand.create();
    await expect(stats.run({ range: 'week' })).resolves.not.toThrow();
  });

  it('should run stats with verbose mode', async () => {
    const stats = await StatsCommand.create();
    await expect(stats.run({ verbose: true })).resolves.not.toThrow();
  });

  it('should export as JSON', async () => {
    const stats = await StatsCommand.create();
    await expect(stats.run({ export: 'json' })).resolves.not.toThrow();
  });

  it('should export as CSV', async () => {
    const stats = await StatsCommand.create();
    await expect(stats.run({ export: 'csv' })).resolves.not.toThrow();
  });
});
