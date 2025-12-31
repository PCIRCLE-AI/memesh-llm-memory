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
}
