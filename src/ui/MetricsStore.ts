// src/ui/MetricsStore.ts
import { promises as fs } from 'fs';
import { randomBytes } from 'crypto';
import type { SessionMetrics, AttributionMessage } from './types.js';

/**
 * Stores and manages productivity metrics
 */
export class MetricsStore {
  private storePath: string;
  private currentSession: SessionMetrics;

  constructor(storePath: string = '~/.smart-agents/metrics.json') {
    // Expand home directory
    this.storePath = storePath.replace(/^~/, process.env.HOME || process.env.USERPROFILE || '');

    this.currentSession = {
      sessionId: this.generateSessionId(),
      startedAt: new Date(),
      tasksCompleted: 0,
      tasksFailed: 0,
      totalTimeSaved: 0,
      totalTokensUsed: 0,
      agentUsageBreakdown: {},
    };
  }

  /**
   * Record attribution event
   */
  public recordAttribution(attribution: AttributionMessage): void {
    if (attribution.type === 'success') {
      this.currentSession.tasksCompleted++;
      this.currentSession.totalTimeSaved += attribution.metadata?.timeSaved || 0;
      this.currentSession.totalTokensUsed += attribution.metadata?.tokensUsed || 0;
    } else if (attribution.type === 'error') {
      this.currentSession.tasksFailed++;
    }

    // Track agent usage
    attribution.agentIds.forEach((agentId) => {
      this.currentSession.agentUsageBreakdown[agentId] =
        (this.currentSession.agentUsageBreakdown[agentId] || 0) + 1;
    });
  }

  /**
   * Get current session metrics
   */
  public getCurrentSessionMetrics(): SessionMetrics {
    return { ...this.currentSession };
  }

  /**
   * Persist metrics to disk
   */
  public async persist(): Promise<void> {
    const data = JSON.stringify(this.currentSession, null, 2);
    await fs.writeFile(this.storePath, data, 'utf-8');
  }

  /**
   * Load metrics from disk
   */
  public async load(): Promise<void> {
    try {
      const data = await fs.readFile(this.storePath, 'utf-8');
      const loaded = JSON.parse(data);

      // Convert date strings back to Date objects
      loaded.startedAt = new Date(loaded.startedAt);

      this.currentSession = loaded;
    } catch (error: unknown) {
      // Only ignore "file not found" errors
      const isFileNotFound =
        error instanceof Error &&
        'code' in error &&
        (error as { code?: string }).code === 'ENOENT';

      if (!isFileNotFound) {
        throw error;
      }
      // File doesn't exist yet, use current session
    }
  }

  /**
   * Generate daily summary report
   */
  public async generateDailyReport(date: Date = new Date()): Promise<string> {
    const metrics = this.currentSession;

    const lines: string[] = [];
    lines.push(`# Daily Productivity Report`);
    lines.push(`**Date:** ${date.toLocaleDateString()}`);
    lines.push('');

    lines.push('## Summary');
    lines.push(`- **Tasks Completed:** ${metrics.tasksCompleted}`);
    lines.push(`- **Tasks Failed:** ${metrics.tasksFailed}`);
    lines.push(`- **Time Saved:** ${metrics.totalTimeSaved} minutes`);
    lines.push(`- **Tokens Used:** ${metrics.totalTokensUsed.toLocaleString()}`);
    lines.push('');

    lines.push('## Agent Usage');
    const sortedAgents = Object.entries(metrics.agentUsageBreakdown).sort(
      (a, b) => b[1] - a[1]
    );

    sortedAgents.forEach(([agent, count]) => {
      lines.push(`- **${agent}:** ${count} tasks`);
    });
    lines.push('');

    const successRate =
      metrics.tasksCompleted + metrics.tasksFailed > 0
        ? (
            (metrics.tasksCompleted / (metrics.tasksCompleted + metrics.tasksFailed)) *
            100
          ).toFixed(1)
        : '0.0';

    lines.push('## Performance');
    lines.push(`- **Success Rate:** ${successRate}%`);

    if (metrics.totalTimeSaved > 0 && metrics.tasksCompleted > 0) {
      const avgTimeSaved = (metrics.totalTimeSaved / metrics.tasksCompleted).toFixed(1);
      lines.push(`- **Avg Time Saved per Task:** ${avgTimeSaved} minutes`);
    }

    return lines.join('\n');
  }

  /**
   * Export metrics as CSV
   */
  public async exportAsCSV(): Promise<string> {
    const metrics = this.currentSession;

    const lines: string[] = [];
    lines.push('Agent,Task Count,Time Saved (min),Tokens Used');

    Object.entries(metrics.agentUsageBreakdown).forEach(([agent, count]) => {
      // This is simplified - in reality, we'd need per-agent breakdown
      const timeSaved = Math.floor(metrics.totalTimeSaved / (metrics.tasksCompleted || 1));
      const tokens = Math.floor(metrics.totalTokensUsed / (metrics.tasksCompleted || 1));
      lines.push(`${agent},${count},${timeSaved},${tokens}`);
    });

    return lines.join('\n');
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${randomBytes(8).toString('hex')}`;
  }
}
