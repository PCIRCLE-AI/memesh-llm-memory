/**
 * ProjectAutoTracker - Hybrid Event-Driven + Token-Based Memory System
 *
 * Automatically tracks project progress and creates memories without manual intervention.
 * Uses two strategies:
 * 1. Event-driven: Records on critical events (tests, commits, checkpoints)
 * 2. Aggregated code changes: Batches edits into a single memory entry
 * 3. Token-based: Creates snapshots every 10k tokens as backup
 */

import type { MCPToolInterface } from '../core/MCPToolInterface.js';
import { logger } from '../utils/logger.js';

/**
 * Test result data structure
 */
export interface TestResult {
  passed: number;
  failed: number;
  total: number;
  failures: string[];
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
    const maxFiles = 20;
    const observations: string[] = [
      `Files modified: ${files.length}`,
      ...files.slice(0, maxFiles).map(file => `  - ${file}`),
    ];

    if (files.length > maxFiles) {
      observations.push(`  - ...and ${files.length - maxFiles} more`);
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

    await this.mcp.memory.createEntities({
      entities: [{
        name: `Code Change ${dateStr} ${Date.now()}`,
        entityType: 'code_change',
        observations,
      }],
    });

    this.pendingFiles.clear();
    this.pendingDescriptions.clear();
    this.pendingSince = undefined;
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
