/**
 * AutoMemoryRecorder - Automatic memory recording for significant events
 *
 * Implements intelligent event detection and automatic memory storage
 * to realize the promise: "You don't think about memory. MeMesh does."
 *
 * Features:
 * - Auto-record code changes (based on scope and size)
 * - Auto-record test results (failures always recorded)
 * - Auto-record git commits (based on change metrics)
 * - Auto-record errors (always recorded)
 * - Importance-based threshold filtering
 *
 * @module AutoMemoryRecorder
 */

import type { UnifiedMemoryStore } from './UnifiedMemoryStore.js';
import type { UnifiedMemory } from './types/unified-memory.js';
import { logger } from '../utils/logger.js';

/**
 * AutoMemoryRecorder - Automatic memory recording for significant events
 *
 * Detects and records:
 * - Code changes (large diffs, multiple files)
 * - Test results (failures always recorded)
 * - Git commits (based on change metrics)
 * - Errors and exceptions (always high priority)
 *
 * @example
 * ```typescript
 * const recorder = new AutoMemoryRecorder(memoryStore);
 *
 * // Record significant code change
 * await recorder.recordCodeChange({
 *   files: ['src/auth.ts', 'src/user.ts'],
 *   linesChanged: 150,
 *   description: 'Refactor authentication system',
 *   projectPath: '/project',
 * });
 *
 * // Record test failure
 * await recorder.recordTestEvent({
 *   type: 'fail',
 *   testName: 'should validate input',
 *   error: 'Expected validation error',
 * });
 * ```
 */
export class AutoMemoryRecorder {
  private memoryStore: UnifiedMemoryStore;
  private importanceThreshold: number = 0.6; // Only record events with importance >= 0.6

  /**
   * Create an AutoMemoryRecorder
   *
   * @param memoryStore UnifiedMemoryStore instance for storing memories
   */
  constructor(memoryStore: UnifiedMemoryStore) {
    this.memoryStore = memoryStore;
  }

  /**
   * Record a code change event
   *
   * Importance is calculated based on:
   * - Number of files changed
   * - Number of lines changed
   *
   * @param data Code change details
   * @returns Memory ID if recorded, null if skipped (below threshold)
   */
  async recordCodeChange(data: {
    files: string[];
    linesChanged: number;
    description: string;
    projectPath?: string;
  }): Promise<string | null> {
    // Calculate importance based on scope and size
    const importance = this.calculateCodeChangeImportance(data);

    if (importance < this.importanceThreshold) {
      logger.debug(
        `[AutoMemoryRecorder] Skipping code change (importance: ${importance.toFixed(2)})`
      );
      return null;
    }

    const memory: UnifiedMemory = {
      type: 'experience',
      content: `Code change: ${data.description}`,
      tags: ['code-change', 'auto-recorded'],
      importance,
      timestamp: new Date(),
      metadata: {
        files: data.files,
        linesChanged: data.linesChanged,
      },
    };

    const id = await this.memoryStore.store(memory, {
      projectPath: data.projectPath,
    });

    logger.info(`[AutoMemoryRecorder] Recorded code change: ${id}`);
    return id;
  }

  /**
   * Record a test event (pass or fail)
   *
   * Test failures are always important (0.9).
   * Test passes have moderate importance (0.5).
   *
   * @param data Test event details
   * @returns Memory ID if recorded, null if skipped (below threshold)
   */
  async recordTestEvent(data: {
    type: 'pass' | 'fail';
    testName: string;
    error?: string;
    projectPath?: string;
  }): Promise<string | null> {
    // Test failures are always important
    const importance = data.type === 'fail' ? 0.9 : 0.5;

    if (importance < this.importanceThreshold) {
      logger.debug(
        `[AutoMemoryRecorder] Skipping test ${data.type} (importance: ${importance})`
      );
      return null;
    }

    const memory: UnifiedMemory = {
      type: data.type === 'fail' ? 'mistake' : 'experience',
      content:
        data.type === 'fail'
          ? `Test failure: ${data.testName}`
          : `Test passed: ${data.testName}`,
      tags: ['test', 'auto-recorded', data.type === 'fail' ? 'failure' : 'success'],
      importance,
      timestamp: new Date(),
      metadata: {
        testName: data.testName,
        error: data.error,
      },
    };

    const id = await this.memoryStore.store(memory, {
      projectPath: data.projectPath,
    });

    logger.info(`[AutoMemoryRecorder] Recorded test ${data.type}: ${id}`);
    return id;
  }

  /**
   * Record a git commit
   *
   * Importance is calculated based on:
   * - Number of files changed
   * - Number of insertions + deletions
   *
   * @param data Git commit details
   * @returns Memory ID if recorded, null if skipped (below threshold)
   */
  async recordGitCommit(data: {
    message: string;
    filesChanged: number;
    insertions: number;
    deletions: number;
    projectPath?: string;
  }): Promise<string | null> {
    const importance = this.calculateCommitImportance(data);

    if (importance < this.importanceThreshold) {
      logger.debug(
        `[AutoMemoryRecorder] Skipping commit (importance: ${importance.toFixed(2)})`
      );
      return null;
    }

    const memory: UnifiedMemory = {
      type: 'decision',
      content: `Commit: ${data.message}`,
      tags: ['git', 'commit', 'auto-recorded'],
      importance,
      timestamp: new Date(),
      metadata: {
        filesChanged: data.filesChanged,
        insertions: data.insertions,
        deletions: data.deletions,
      },
    };

    const id = await this.memoryStore.store(memory, {
      projectPath: data.projectPath,
    });

    logger.info(`[AutoMemoryRecorder] Recorded commit: ${id}`);
    return id;
  }

  /**
   * Record an error or exception
   *
   * Errors are always recorded with high importance (0.95).
   *
   * @param data Error details
   * @returns Memory ID (always recorded)
   */
  async recordError(data: {
    message: string;
    stack?: string;
    context?: string;
    projectPath?: string;
  }): Promise<string> {
    // Errors are always important
    const memory: UnifiedMemory = {
      type: 'mistake',
      content: `Error: ${data.message}`,
      tags: ['error', 'auto-recorded'],
      importance: 0.95,
      timestamp: new Date(),
      metadata: {
        stack: data.stack,
        context: data.context,
      },
    };

    const id = await this.memoryStore.store(memory, {
      projectPath: data.projectPath,
    });

    logger.info(`[AutoMemoryRecorder] Recorded error: ${id}`);
    return id;
  }

  /**
   * Calculate importance for code changes
   *
   * Base importance: 0.3
   * +0.2 if > 3 files
   * +0.2 if > 50 lines
   * +0.3 if > 100 lines
   *
   * @param data Code change details
   * @returns Importance score (0.0 - 1.0)
   * @private
   */
  private calculateCodeChangeImportance(data: {
    files: string[];
    linesChanged: number;
  }): number {
    // Validate inputs to prevent integer overflow and invalid data
    if (!Array.isArray(data.files)) {
      throw new Error('Invalid files array: must be an array');
    }

    if (data.files.length < 0) {
      throw new Error('Invalid files array: length cannot be negative');
    }

    if (!Number.isFinite(data.linesChanged)) {
      throw new Error(
        `Invalid linesChanged: must be a finite number, got ${data.linesChanged}`
      );
    }

    if (data.linesChanged < 0) {
      throw new Error(`Invalid linesChanged: cannot be negative (${data.linesChanged})`);
    }

    // Base importance
    let importance = 0.3;

    // Boost for multiple files
    if (data.files.length > 3) {
      importance += 0.2;
    }

    // Boost for large changes
    if (data.linesChanged > 100) {
      importance += 0.3;
    } else if (data.linesChanged > 50) {
      importance += 0.2;
    }

    return Math.min(importance, 1.0);
  }

  /**
   * Calculate importance for commits
   *
   * Base importance: 0.4
   * +0.2 if > 5 files
   * +0.2 if > 100 total changes
   * +0.3 if > 200 total changes
   *
   * @param data Commit details
   * @returns Importance score (0.0 - 1.0)
   * @private
   */
  private calculateCommitImportance(data: {
    filesChanged: number;
    insertions: number;
    deletions: number;
  }): number {
    // Base importance
    let importance = 0.4;

    // Boost for multiple files
    if (data.filesChanged > 5) {
      importance += 0.2;
    }

    // Boost for large commits
    const totalChanges = data.insertions + data.deletions;
    if (totalChanges > 200) {
      importance += 0.3;
    } else if (totalChanges > 100) {
      importance += 0.2;
    }

    return Math.min(importance, 1.0);
  }

  /**
   * Set importance threshold for filtering
   *
   * Only events with importance >= threshold will be recorded.
   * Default threshold is 0.6.
   *
   * @param threshold Importance threshold (0.0 - 1.0)
   * @throws Error if threshold is not between 0 and 1
   */
  setImportanceThreshold(threshold: number): void {
    if (threshold < 0 || threshold > 1) {
      throw new Error('Importance threshold must be between 0 and 1');
    }
    this.importanceThreshold = threshold;
  }
}
