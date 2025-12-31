/**
 * ProjectAutoTracker - Hybrid Event-Driven + Token-Based Memory System
 *
 * Automatically tracks project progress and creates memories without manual intervention.
 * Uses two strategies:
 * 1. Event-driven: Records on critical events (code changes, test results)
 * 2. Token-based: Creates snapshots every 10k tokens as backup
 */

import type { MCPToolInterface } from '../core/MCPToolInterface.js';

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
    const dateStr = timestamp.split('T')[0]; // YYYY-MM-DD

    await this.mcp.memory.createEntities({
      entities: [{
        name: `Code Change ${dateStr} ${Date.now()}`,
        entityType: 'code_change',
        observations: [
          `Files modified: ${files.length}`,
          ...files.map(f => `  - ${f}`),
          `Description: ${description}`,
          `Timestamp: ${timestamp}`,
        ],
      }],
    });
  }

  /**
   * Record test execution results to Knowledge Graph
   * @param result - Test execution summary
   */
  async recordTestResult(result: TestResult): Promise<void> {
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
