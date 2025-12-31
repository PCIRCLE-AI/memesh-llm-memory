/**
 * ProjectAutoTracker - Hybrid Event-Driven + Token-Based Memory System
 *
 * Automatically tracks project progress and creates memories without manual intervention.
 * Uses two strategies:
 * 1. Event-driven: Records on critical events (code changes, test results)
 * 2. Token-based: Creates snapshots every 10k tokens as backup
 */

import type { MCPToolInterface } from '../core/MCPToolInterface.js';

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
}
