/**
 * AutoMemoryRecorder Tests
 *
 * TDD tests for automatic memory recording based on event detection.
 *
 * Test coverage:
 * - Code change recording
 * - Test event recording
 * - Git commit recording
 * - Error recording
 * - Importance calculation
 * - Threshold filtering
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AutoMemoryRecorder } from '../../../src/memory/AutoMemoryRecorder.js';
import { UnifiedMemoryStore } from '../../../src/memory/UnifiedMemoryStore.js';
import { KnowledgeGraph } from '../../../src/knowledge-graph/index.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('AutoMemoryRecorder', () => {
  let recorder: AutoMemoryRecorder;
  let memoryStore: UnifiedMemoryStore;
  let knowledgeGraph: KnowledgeGraph;
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for test database
    tempDir = mkdtempSync(join(tmpdir(), 'auto-memory-test-'));
    const dbPath = join(tempDir, 'test-kg.db');

    // Create KnowledgeGraph and UnifiedMemoryStore
    knowledgeGraph = await KnowledgeGraph.create(dbPath);
    memoryStore = new UnifiedMemoryStore(knowledgeGraph);

    // Create AutoMemoryRecorder
    recorder = new AutoMemoryRecorder(memoryStore);
  });

  afterEach(() => {
    // Cleanup
    knowledgeGraph.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Code change recording', () => {
    it('should record significant code change (high importance)', async () => {
      const id = await recorder.recordCodeChange({
        files: ['src/file1.ts', 'src/file2.ts', 'src/file3.ts', 'src/file4.ts'],
        linesChanged: 150,
        description: 'Major refactoring of auth module',
        projectPath: '/test/project',
      });

      // Should record (4 files + 150 lines = importance ~0.8)
      expect(id).not.toBeNull();
      expect(typeof id).toBe('string');

      // Verify memory was stored
      const memory = await memoryStore.get(id!);
      expect(memory).not.toBeNull();
      expect(memory!.type).toBe('experience');
      expect(memory!.content).toContain('Major refactoring');
      expect(memory!.tags).toContain('auto-recorded');
      expect(memory!.tags).toContain('code-change');
    });

    it('should skip insignificant code change (low importance)', async () => {
      const id = await recorder.recordCodeChange({
        files: ['src/file1.ts'],
        linesChanged: 10,
        description: 'Minor formatting fix',
        projectPath: '/test/project',
      });

      // Should skip (1 file + 10 lines = importance ~0.3, below threshold 0.6)
      expect(id).toBeNull();
    });

    it('should include metadata in recorded code change', async () => {
      const id = await recorder.recordCodeChange({
        files: ['file1.ts', 'file2.ts', 'file3.ts', 'file4.ts'],
        linesChanged: 120,
        description: 'Feature implementation',
        projectPath: '/test/project',
      });

      expect(id).not.toBeNull();

      const memory = await memoryStore.get(id!);
      expect(memory!.metadata).toBeDefined();
      expect(memory!.metadata!.files).toEqual(['file1.ts', 'file2.ts', 'file3.ts', 'file4.ts']);
      expect(memory!.metadata!.linesChanged).toBe(120);
    });
  });

  describe('Test event recording', () => {
    it('should record test failure (always high importance)', async () => {
      const id = await recorder.recordTestEvent({
        type: 'fail',
        testName: 'should validate user input',
        error: 'Expected validation to throw error',
        projectPath: '/test/project',
      });

      // Test failures always recorded (importance = 0.9)
      expect(id).not.toBeNull();

      const memory = await memoryStore.get(id!);
      expect(memory).not.toBeNull();
      expect(memory!.type).toBe('mistake');
      expect(memory!.content).toContain('Test failure');
      expect(memory!.tags).toContain('test');
      expect(memory!.tags).toContain('failure');
      expect(memory!.importance).toBe(0.9);
    });

    it('should skip test pass if below threshold', async () => {
      const id = await recorder.recordTestEvent({
        type: 'pass',
        testName: 'should return correct value',
        projectPath: '/test/project',
      });

      // Test pass has importance 0.5, below threshold 0.6
      expect(id).toBeNull();
    });

    it('should record test pass if threshold is lowered', async () => {
      recorder.setImportanceThreshold(0.4);

      const id = await recorder.recordTestEvent({
        type: 'pass',
        testName: 'should work correctly',
        projectPath: '/test/project',
      });

      // Test pass has importance 0.5, above new threshold 0.4
      expect(id).not.toBeNull();

      const memory = await memoryStore.get(id!);
      expect(memory!.type).toBe('experience');
      expect(memory!.tags).toContain('success');
    });
  });

  describe('Git commit recording', () => {
    it('should record significant commit', async () => {
      const id = await recorder.recordGitCommit({
        message: 'feat: implement user authentication system',
        filesChanged: 8,
        insertions: 250,
        deletions: 30,
        projectPath: '/test/project',
      });

      // Significant commit (8 files + 280 changes = importance ~0.9)
      expect(id).not.toBeNull();

      const memory = await memoryStore.get(id!);
      expect(memory).not.toBeNull();
      expect(memory!.type).toBe('decision');
      expect(memory!.content).toContain('implement user authentication');
      expect(memory!.tags).toContain('git');
      expect(memory!.tags).toContain('commit');
    });

    it('should skip small commits', async () => {
      const id = await recorder.recordGitCommit({
        message: 'fix: typo in comment',
        filesChanged: 1,
        insertions: 1,
        deletions: 1,
        projectPath: '/test/project',
      });

      // Small commit (1 file + 2 changes = importance ~0.4, below threshold)
      expect(id).toBeNull();
    });

    it('should include commit metadata', async () => {
      const id = await recorder.recordGitCommit({
        message: 'refactor: restructure auth module',
        filesChanged: 6,
        insertions: 180,
        deletions: 120,
        projectPath: '/test/project',
      });

      expect(id).not.toBeNull();

      const memory = await memoryStore.get(id!);
      expect(memory!.metadata!.filesChanged).toBe(6);
      expect(memory!.metadata!.insertions).toBe(180);
      expect(memory!.metadata!.deletions).toBe(120);
    });
  });

  describe('Error recording', () => {
    it('should always record errors (high importance)', async () => {
      const id = await recorder.recordError({
        message: 'Database connection failed',
        stack: 'Error: ECONNREFUSED\n  at connect()',
        context: 'During user login',
        projectPath: '/test/project',
      });

      // Errors always recorded (importance = 0.95)
      expect(id).not.toBeNull();

      const memory = await memoryStore.get(id);
      expect(memory).not.toBeNull();
      expect(memory!.type).toBe('mistake');
      expect(memory!.content).toContain('Database connection failed');
      expect(memory!.tags).toContain('error');
      expect(memory!.importance).toBe(0.95);
    });

    it('should include error metadata', async () => {
      const id = await recorder.recordError({
        message: 'Null pointer exception',
        stack: 'TypeError: Cannot read property',
        context: 'User profile rendering',
      });

      const memory = await memoryStore.get(id);
      expect(memory!.metadata!.stack).toContain('TypeError');
      expect(memory!.metadata!.context).toBe('User profile rendering');
    });
  });

  describe('Importance calculation', () => {
    it('should calculate code change importance correctly', async () => {
      // Small change: 1 file, 20 lines
      let id = await recorder.recordCodeChange({
        files: ['file.ts'],
        linesChanged: 20,
        description: 'Small change',
      });
      expect(id).toBeNull(); // importance ~0.3, below threshold

      // Medium change: 4 files, 60 lines
      id = await recorder.recordCodeChange({
        files: ['f1.ts', 'f2.ts', 'f3.ts', 'f4.ts'],
        linesChanged: 60,
        description: 'Medium change',
      });
      expect(id).not.toBeNull(); // importance ~0.7, above threshold

      // Large change: 5 files, 150 lines
      id = await recorder.recordCodeChange({
        files: ['f1.ts', 'f2.ts', 'f3.ts', 'f4.ts', 'f5.ts'],
        linesChanged: 150,
        description: 'Large change',
      });
      expect(id).not.toBeNull(); // importance ~0.8, well above threshold
    });

    it('should calculate commit importance correctly', async () => {
      // Small commit: 1 file, 10 changes
      let id = await recorder.recordGitCommit({
        message: 'Small commit',
        filesChanged: 1,
        insertions: 5,
        deletions: 5,
      });
      expect(id).toBeNull(); // importance ~0.4, below threshold

      // Medium commit: 6 files, 120 changes
      id = await recorder.recordGitCommit({
        message: 'Medium commit',
        filesChanged: 6,
        insertions: 80,
        deletions: 40,
      });
      expect(id).not.toBeNull(); // importance ~0.8, above threshold

      // Large commit: 10 files, 250 changes
      id = await recorder.recordGitCommit({
        message: 'Large commit',
        filesChanged: 10,
        insertions: 200,
        deletions: 50,
      });
      expect(id).not.toBeNull(); // importance ~0.9, well above threshold
    });
  });

  describe('Custom importance threshold', () => {
    it('should respect custom threshold', async () => {
      recorder.setImportanceThreshold(0.6);

      const id = await recorder.recordCodeChange({
        files: ['f1.ts', 'f2.ts', 'f3.ts', 'f4.ts'],
        linesChanged: 60,
        description: 'Moderate change',
      });

      // importance = 0.3 + 0.2 (>3 files) + 0.2 (>50 lines) = 0.7, above threshold 0.6
      expect(id).not.toBeNull();

      recorder.setImportanceThreshold(0.8);
      const id2 = await recorder.recordCodeChange({
        files: ['f1.ts', 'f2.ts', 'f3.ts', 'f4.ts'],
        linesChanged: 60,
        description: 'Moderate change 2',
      });

      // importance = 0.7, below threshold 0.8
      expect(id2).toBeNull();
    });

    it('should throw error for invalid threshold', () => {
      expect(() => recorder.setImportanceThreshold(-0.1)).toThrow('between 0 and 1');
      expect(() => recorder.setImportanceThreshold(1.1)).toThrow('between 0 and 1');
    });

    it('should allow threshold of 0 and 1', () => {
      expect(() => recorder.setImportanceThreshold(0)).not.toThrow();
      expect(() => recorder.setImportanceThreshold(1)).not.toThrow();
    });
  });

  describe('Auto-recorded tags', () => {
    it('should add auto-recorded tag to all memories', async () => {
      // Code change
      const id1 = await recorder.recordCodeChange({
        files: ['f1.ts', 'f2.ts', 'f3.ts', 'f4.ts'],
        linesChanged: 100,
        description: 'Change',
      });
      let memory = await memoryStore.get(id1!);
      expect(memory!.tags).toContain('auto-recorded');

      // Test failure
      const id2 = await recorder.recordTestEvent({
        type: 'fail',
        testName: 'test',
      });
      memory = await memoryStore.get(id2!);
      expect(memory!.tags).toContain('auto-recorded');

      // Commit
      const id3 = await recorder.recordGitCommit({
        message: 'commit',
        filesChanged: 6,
        insertions: 150,
        deletions: 50,
      });
      memory = await memoryStore.get(id3!);
      expect(memory!.tags).toContain('auto-recorded');

      // Error
      const id4 = await recorder.recordError({
        message: 'error',
      });
      memory = await memoryStore.get(id4);
      expect(memory!.tags).toContain('auto-recorded');
    });
  });
});
