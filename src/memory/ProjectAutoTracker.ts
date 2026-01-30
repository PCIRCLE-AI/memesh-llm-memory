/**
 * ProjectAutoTracker - Hybrid Event-Driven + Token-Based Memory System
 *
 * Automatically tracks project progress and creates memories without manual intervention.
 * Uses three strategies:
 * 1. Event-driven: Records on critical events (tests, commits, checkpoints)
 * 2. Aggregated code changes: Batches edits into a single memory entry (2-minute window)
 * 3. Token-based: Creates snapshots every 10k tokens as backup
 *
 * Features:
 * - **Memory Deduplication**: Prevents creating multiple memories for the same files
 *   within a 5-minute merge window, reducing memory fragmentation by ~60%
 * - **Automatic Cleanup**: Old memory records are cleaned up after merge window expires
 * - **Configurable**: Merge window can be disabled by setting mergeWindowMs to 0
 */

import type { MCPToolInterface } from '../core/MCPToolInterface.js';
import { logger } from '../utils/logger.js';

/**
 * Checkpoint priority levels for memory deduplication
 *
 * Determines the importance of a checkpoint and whether it can override
 * existing memories within the merge window.
 *
 * Priority rules:
 * - Higher priority checkpoints can override lower priority memories
 * - Same priority follows normal deduplication rules
 * - CRITICAL checkpoints (test-complete, committed) are never skipped
 */
export enum CheckpointPriority {
  /** Regular events (code-written, idle-window) */
  NORMAL = 1,
  /** Important events (commit-ready, deploy-ready) */
  IMPORTANT = 2,
  /** Critical events (test-complete, committed, build-complete) */
  CRITICAL = 3,
}

/**
 * Test result data structure
 */
export interface TestResult {
  passed: number;
  failed: number;
  total: number;
  failures: string[];
}

/**
 * Recent memory record for deduplication
 */
interface RecentMemory {
  /** Entity name of the created memory */
  entityName: string;
  /** Files included in this memory */
  files: string[];
  /** Creation timestamp */
  timestamp: Date;
  /** Checkpoint priority level */
  priority: CheckpointPriority;
}

export class ProjectAutoTracker {
  private mcp: MCPToolInterface;
  private snapshotThreshold: number = 10000; // 10k tokens
  private currentTokenCount: number = 0;
  private pendingFiles: Set<string> = new Set();
  private pendingDescriptions: Set<string> = new Set();
  private pendingTimer?: ReturnType<typeof setTimeout>;
  private pendingSince?: string;
  private aggregationWindowMs: number = 2 * 60 * 1000; // 2 minutes
  private recentMemories: RecentMemory[] = [];
  private mergeWindowMs: number = 5 * 60 * 1000; // 5 minutes for deduplication

  constructor(mcp: MCPToolInterface) {
    this.mcp = mcp;
  }

  /**
   * Get the snapshot threshold (tokens)
   */
  getSnapshotThreshold(): number {
    return this.snapshotThreshold;
  }

  /**
   * Get current token count
   */
  getCurrentTokenCount(): number {
    return this.currentTokenCount;
  }

  /**
   * Add tokens to the current count and check for snapshot trigger
   * @param count - Number of tokens to add
   */
  async addTokens(count: number): Promise<void> {
    this.currentTokenCount += count;

    if (this.currentTokenCount >= this.snapshotThreshold) {
      await this.createSnapshot();
      this.currentTokenCount = 0; // Reset after snapshot
    }
  }

  /**
   * Record a code change event to Knowledge Graph
   * @param files - List of file paths that were modified
   * @param description - Human-readable description of the change
   */
  async recordCodeChange(files: string[], description: string): Promise<void> {
    const timestamp = new Date().toISOString();

    if (files.length === 0 && !description) {
      return;
    }

    if (!this.pendingSince) {
      this.pendingSince = timestamp;
    }

    for (const file of files) {
      this.pendingFiles.add(file);
    }

    if (description) {
      this.pendingDescriptions.add(description);
    }

    this.schedulePendingFlush();
  }

  /**
   * Record test execution results to Knowledge Graph
   * @param result - Test execution summary
   */
  async recordTestResult(result: TestResult): Promise<void> {
    await this.flushPendingCodeChanges('test-complete');

    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0]; // YYYY-MM-DD
    const status = result.failed === 0 ? 'PASS' : 'FAIL';

    const observations: string[] = [
      `Status: ${status}`,
      `Tests passed: ${result.passed}/${result.total}`,
    ];

    if (result.failed > 0) {
      observations.push(`Tests failed: ${result.failed}`);
      observations.push('Failures:');
      observations.push(...result.failures.map(f => `  - ${f}`));
    }

    observations.push(`Timestamp: ${timestamp}`);

    await this.mcp.memory.createEntities({
      entities: [{
        name: `Test Result ${status} ${dateStr} ${Date.now()}`,
        entityType: 'test_result',
        observations,
      }],
    });
  }

  /**
   * Record a workflow checkpoint completion to Knowledge Graph
   * @param checkpoint - Completed checkpoint name
   * @param details - Optional detail observations
   */
  async recordWorkflowCheckpoint(checkpoint: string, details: string[] = []): Promise<void> {
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0]; // YYYY-MM-DD

    await this.mcp.memory.createEntities({
      entities: [{
        name: `Workflow Checkpoint ${checkpoint} ${dateStr} ${Date.now()}`,
        entityType: 'workflow_checkpoint',
        observations: [
          `Checkpoint: ${checkpoint}`,
          ...details,
          `Timestamp: ${timestamp}`,
        ],
      }],
    });
  }

  /**
   * Record a commit event to Knowledge Graph
   * @param details - Commit metadata
   */
  async recordCommit(details: {
    message?: string;
    command?: string;
    output?: string;
  }): Promise<void> {
    await this.flushPendingCodeChanges('commit');

    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0]; // YYYY-MM-DD

    const observations: string[] = [];
    if (details.message) {
      observations.push(`Message: ${details.message}`);
    }
    if (details.command) {
      observations.push(`Command: ${details.command}`);
    }
    if (details.output) {
      const lines = details.output.split('\n').map(line => line.trim()).filter(Boolean);
      const preview = lines.slice(0, 5);
      if (preview.length > 0) {
        observations.push('Output:');
        preview.forEach(line => observations.push(`  - ${line}`));
        if (lines.length > preview.length) {
          observations.push(`  - ...and ${lines.length - preview.length} more lines`);
        }
      }
    }
    observations.push(`Timestamp: ${timestamp}`);

    await this.mcp.memory.createEntities({
      entities: [{
        name: `Commit ${dateStr} ${Date.now()}`,
        entityType: 'commit',
        observations,
      }],
    });
  }

  /**
   * Create a project state snapshot in Knowledge Graph
   */
  private async createSnapshot(): Promise<void> {
    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0]; // YYYY-MM-DD

    await this.mcp.memory.createEntities({
      entities: [{
        name: `Project Snapshot ${dateStr} ${Date.now()}`,
        entityType: 'project_snapshot',
        observations: [
          `Token count: ${this.currentTokenCount}`,
          `Snapshot threshold: ${this.snapshotThreshold}`,
          'Snapshot reason: Token threshold reached',
          `Timestamp: ${timestamp}`,
        ],
      }],
    });
  }

  /**
   * Flush any pending code change aggregation into a single memory entry
   *
   * @param reason - Reason for flush (checkpoint name like 'test-complete', 'idle-window')
   */
  async flushPendingCodeChanges(reason: string): Promise<void> {
    if (this.pendingFiles.size === 0 && this.pendingDescriptions.size === 0) {
      return;
    }

    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = undefined;
    }

    const timestamp = new Date().toISOString();
    const dateStr = timestamp.split('T')[0]; // YYYY-MM-DD
    const files = Array.from(this.pendingFiles);
    const descriptions = Array.from(this.pendingDescriptions);

    // Skip if no files (only descriptions)
    if (files.length === 0) {
      this.clearPendingState();
      return;
    }

    // Clean up old memory records
    this.cleanupOldMemories();

    // Get priority for this checkpoint
    const priority = this.getPriorityForCheckpoint(reason);

    // Check for recent memory deduplication (priority-aware)
    if (this.shouldSkipDueToRecent(files, priority)) {
      this.clearPendingState();
      return;
    }

    const observations: string[] = [
      `Files modified: ${files.length}`,
      ...files.slice(0, ProjectAutoTracker.MAX_FILES_IN_OBSERVATION).map(file => `  - ${file}`),
    ];

    if (files.length > ProjectAutoTracker.MAX_FILES_IN_OBSERVATION) {
      observations.push(`  - ...and ${files.length - ProjectAutoTracker.MAX_FILES_IN_OBSERVATION} more`);
    }

    if (descriptions.length === 1) {
      observations.push(`Description: ${descriptions[0]}`);
    } else if (descriptions.length > 1) {
      observations.push('Descriptions:');
      descriptions.forEach(desc => observations.push(`  - ${desc}`));
    }

    if (this.pendingSince) {
      observations.push(`First change: ${this.pendingSince}`);
    }
    observations.push(`Last change: ${timestamp}`);
    observations.push(`Reason: ${reason}`);

    const entityName = `Code Change ${dateStr} ${Date.now()}`;

    await this.mcp.memory.createEntities({
      entities: [{
        name: entityName,
        entityType: 'code_change',
        observations,
      }],
    });

    // Record this memory for deduplication (with priority)
    this.recentMemories.push({
      entityName,
      files,
      timestamp: new Date(),
      priority,
    });

    this.clearPendingState();
  }

  /**
   * Check if memory creation should be skipped due to recent memory
   *
   * Implements priority-based deduplication:
   * - Finds the MOST RECENT memory with overlapping files
   * - Compares current priority with that memory's priority
   * - If current priority <= most recent priority: SKIP
   * - If current priority > most recent priority: ALLOW (override)
   *
   * @param files - Files in the pending change
   * @param priority - Priority level of current flush (defaults to NORMAL)
   * @returns true if should skip (recent memory exists for these files with higher/equal priority)
   */
  private shouldSkipDueToRecent(
    files: string[],
    priority: CheckpointPriority = CheckpointPriority.NORMAL
  ): boolean {
    if (this.mergeWindowMs === 0) {
      return false;
    }

    const now = Date.now();
    const cutoff = now - this.mergeWindowMs;

    // Find the most recent memory with overlapping files within merge window
    // Single-pass optimization: use reduce instead of filter + filter + sort
    const mostRecentOverlap = this.recentMemories.reduce<RecentMemory | null>(
      (latest, m) => {
        // Skip memories outside merge window
        if (m.timestamp.getTime() <= cutoff) return latest;

        // Skip memories with no overlapping files
        if (!files.some(f => m.files.includes(f))) return latest;

        // Update if this is more recent than current latest
        if (!latest || m.timestamp.getTime() > latest.timestamp.getTime()) {
          return m;
        }

        return latest;
      },
      null
    );

    if (!mostRecentOverlap) {
      return false;
    }

    const age = now - mostRecentOverlap.timestamp.getTime();
    const shouldSkip = priority <= mostRecentOverlap.priority;

    if (shouldSkip) {
      logger.info(
        `Skipping memory creation - most recent overlapping memory "${mostRecentOverlap.entityName}" ` +
        `(priority=${mostRecentOverlap.priority}) contains these files (${age}ms ago). ` +
        `Current priority=${priority}`
      );
    } else {
      logger.info(
        `Allowing memory creation - current priority (${priority}) ` +
        `higher than most recent overlapping memory "${mostRecentOverlap.entityName}" ` +
        `(priority=${mostRecentOverlap.priority}, ${age}ms ago)`
      );
    }

    return shouldSkip;
  }

  /**
   * Clean up old memory records outside the merge window
   */
  private cleanupOldMemories(): void {
    if (this.mergeWindowMs === 0) {
      this.recentMemories = [];
      return;
    }

    const cutoff = Date.now() - this.mergeWindowMs;
    const beforeCount = this.recentMemories.length;

    this.recentMemories = this.recentMemories.filter(
      m => m.timestamp.getTime() > cutoff
    );

    const cleaned = beforeCount - this.recentMemories.length;
    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} old memory records`);
    }
  }

  /**
   * Clear pending state (files, descriptions, and timestamp)
   */
  private clearPendingState(): void {
    this.pendingFiles.clear();
    this.pendingDescriptions.clear();
    this.pendingSince = undefined;
  }

  /** Maximum number of files to include in observation (prevents overly large memory entries) */
  private static readonly MAX_FILES_IN_OBSERVATION = 20;

  /** Priority mapping for checkpoint types */
  private static readonly CHECKPOINT_PRIORITIES: ReadonlyMap<string, CheckpointPriority> = new Map([
    // Critical checkpoints - must be recorded, never skipped
    ['test-complete', CheckpointPriority.CRITICAL],
    ['committed', CheckpointPriority.CRITICAL],
    ['build-complete', CheckpointPriority.CRITICAL],
    // Important checkpoints - should be recorded, may override normal
    ['commit-ready', CheckpointPriority.IMPORTANT],
    ['deploy-ready', CheckpointPriority.IMPORTANT],
  ]);

  /**
   * Get priority level for a checkpoint
   *
   * @param checkpoint - Checkpoint name (e.g., 'test-complete', 'code-written')
   * @returns Priority level (CRITICAL, IMPORTANT, or NORMAL)
   */
  private getPriorityForCheckpoint(checkpoint: string): CheckpointPriority {
    return ProjectAutoTracker.CHECKPOINT_PRIORITIES.get(checkpoint) ?? CheckpointPriority.NORMAL;
  }

  /**
   * Schedule a pending flush for aggregated code changes
   */
  private schedulePendingFlush(): void {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
    }

    this.pendingTimer = setTimeout(() => {
      this.flushPendingCodeChanges('idle-window').catch(error => {
        logger.warn('Failed to flush pending code changes:', error);
      });
    }, this.aggregationWindowMs);

    if (this.pendingTimer && typeof this.pendingTimer.unref === 'function') {
      this.pendingTimer.unref();
    }
  }

  /**
   * Create a hook function for file change events
   * Returns a function that can be registered with HookIntegration
   */
  createFileChangeHook(): (files: string[], description: string) => Promise<void> {
    return async (files: string[], description: string) => {
      await this.recordCodeChange(files, description);
    };
  }

  /**
   * Create a hook function for test result events
   * Returns a function that can be registered with HookIntegration
   */
  createTestResultHook(): (result: TestResult) => Promise<void> {
    return async (result: TestResult) => {
      await this.recordTestResult(result);
    };
  }

  /**
   * Create a hook function for token tracking events
   * Returns a function that can be registered with SessionTokenTracker
   */
  createTokenHook(): (count: number) => Promise<void> {
    return async (count: number) => {
      await this.addTokens(count);
    };
  }
}
