/**
 * StatsService - Unified Statistics Collection and Persistence
 *
 * Provides real statistics tracking for buddy_stats command:
 * - Token usage tracking
 * - Cost tracking and savings calculation
 * - Agent/model routing decisions
 * - Task completion metrics
 * - Complexity scores
 *
 * All data is persisted to SQLite for historical queries.
 */

import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { logger } from '../utils/logger.js';
import { type MicroDollars, toMicroDollars, toDollars, formatMoney } from '../utils/money.js';

// ============================================================================
// Types
// ============================================================================

export interface TaskRecord {
  id: string;
  timestamp: Date;
  agentType: string;
  taskDescription: string;
  complexity: number; // 1-10
  durationMs: number;
  tokensUsed: number;
  tokensSaved: number; // Tokens saved by using Ollama instead of Claude
  costMicro: MicroDollars;
  success: boolean;
  modelUsed: 'ollama' | 'claude' | 'hybrid';
}

export interface RoutingDecision {
  id: string;
  timestamp: Date;
  taskId: string;
  selectedModel: 'ollama' | 'claude' | 'hybrid';
  reason: string;
  complexity: number;
  estimatedTokens: number;
}

export interface PeriodStats {
  period: 'day' | 'week' | 'month' | 'all';
  startDate: Date;
  endDate: Date;
  tokensUsed: number;
  tokensSaved: number;
  costMicro: MicroDollars;
  costSavingsMicro: MicroDollars;
  routingDecisions: {
    ollama: number;
    claude: number;
    hybrid: number;
  };
  tasksCompleted: number;
  tasksFailed: number;
  avgComplexity: number;
  avgDurationMs: number;
  successRate: number;
}

// ============================================================================
// StatsService Class
// ============================================================================

export class StatsService {
  private db: Database.Database;
  private static instance: StatsService | null = null;

  constructor(dbPath?: string) {
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    const defaultPath = join(dataDir, 'stats.db');
    this.db = new Database(dbPath || defaultPath);
    this.db.pragma('journal_mode = WAL');
    this.createTables();

    logger.info('StatsService initialized', { dbPath: dbPath || defaultPath });
  }

  /**
   * Get singleton instance
   */
  static getInstance(): StatsService {
    if (!StatsService.instance) {
      StatsService.instance = new StatsService();
    }
    return StatsService.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    if (StatsService.instance) {
      StatsService.instance.close();
      StatsService.instance = null;
    }
  }

  // ==========================================================================
  // Database Schema
  // ==========================================================================

  private createTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS task_records (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        agent_type TEXT NOT NULL,
        task_description TEXT,
        complexity INTEGER NOT NULL DEFAULT 5,
        duration_ms INTEGER NOT NULL DEFAULT 0,
        tokens_used INTEGER NOT NULL DEFAULT 0,
        tokens_saved INTEGER NOT NULL DEFAULT 0,
        cost_micro INTEGER NOT NULL DEFAULT 0,
        success INTEGER NOT NULL DEFAULT 1,
        model_used TEXT NOT NULL DEFAULT 'claude'
      );

      CREATE TABLE IF NOT EXISTS routing_decisions (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        task_id TEXT,
        selected_model TEXT NOT NULL,
        reason TEXT,
        complexity INTEGER NOT NULL DEFAULT 5,
        estimated_tokens INTEGER NOT NULL DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_task_timestamp ON task_records(timestamp);
      CREATE INDEX IF NOT EXISTS idx_task_model ON task_records(model_used);
      CREATE INDEX IF NOT EXISTS idx_routing_timestamp ON routing_decisions(timestamp);
      CREATE INDEX IF NOT EXISTS idx_routing_model ON routing_decisions(selected_model);
    `);
  }

  // ==========================================================================
  // Recording Methods
  // ==========================================================================

  /**
   * Record a completed task
   */
  recordTask(task: Omit<TaskRecord, 'id'>): string {
    const id = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const stmt = this.db.prepare(`
      INSERT INTO task_records (
        id, timestamp, agent_type, task_description, complexity,
        duration_ms, tokens_used, tokens_saved, cost_micro, success, model_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      task.timestamp.getTime(),
      task.agentType,
      task.taskDescription,
      task.complexity,
      task.durationMs,
      task.tokensUsed,
      task.tokensSaved,
      task.costMicro,
      task.success ? 1 : 0,
      task.modelUsed
    );

    logger.debug('Task recorded', { id, agentType: task.agentType, model: task.modelUsed });
    return id;
  }

  /**
   * Record a routing decision
   */
  recordRoutingDecision(decision: Omit<RoutingDecision, 'id'>): string {
    const id = `route_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const stmt = this.db.prepare(`
      INSERT INTO routing_decisions (
        id, timestamp, task_id, selected_model, reason, complexity, estimated_tokens
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      decision.timestamp.getTime(),
      decision.taskId,
      decision.selectedModel,
      decision.reason,
      decision.complexity,
      decision.estimatedTokens
    );

    logger.debug('Routing decision recorded', { id, model: decision.selectedModel });
    return id;
  }

  // ==========================================================================
  // Query Methods
  // ==========================================================================

  /**
   * Get statistics for a specific period
   */
  getStats(period: 'day' | 'week' | 'month' | 'all' = 'all'): PeriodStats {
    const { startDate, endDate } = this.getPeriodRange(period);
    const startTs = startDate.getTime();
    const endTs = endDate.getTime();

    // Query task records
    const taskStats = this.db.prepare(`
      SELECT
        COUNT(*) as total_tasks,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_tasks,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_tasks,
        SUM(tokens_used) as total_tokens_used,
        SUM(tokens_saved) as total_tokens_saved,
        SUM(cost_micro) as total_cost_micro,
        AVG(complexity) as avg_complexity,
        AVG(duration_ms) as avg_duration_ms
      FROM task_records
      WHERE timestamp >= ? AND timestamp <= ?
    `).get(startTs, endTs) as {
      total_tasks: number;
      successful_tasks: number;
      failed_tasks: number;
      total_tokens_used: number;
      total_tokens_saved: number;
      total_cost_micro: number;
      avg_complexity: number;
      avg_duration_ms: number;
    } | undefined;

    // Query routing decisions
    const routingStats = this.db.prepare(`
      SELECT
        selected_model,
        COUNT(*) as count
      FROM routing_decisions
      WHERE timestamp >= ? AND timestamp <= ?
      GROUP BY selected_model
    `).all(startTs, endTs) as { selected_model: string; count: number }[];

    // Build routing decisions map
    const routingDecisions = {
      ollama: 0,
      claude: 0,
      hybrid: 0,
    };

    for (const row of routingStats) {
      if (row.selected_model in routingDecisions) {
        routingDecisions[row.selected_model as keyof typeof routingDecisions] = row.count;
      }
    }

    // Calculate cost savings (assuming Claude costs ~10x more than Ollama for similar tasks)
    const tokensSaved = taskStats?.total_tokens_saved || 0;
    // Estimate: saved tokens would have cost $3/1M input + $15/1M output ≈ $9/1M average
    const costSavingsMicro = Math.round(tokensSaved * 0.000009 * 1_000_000) as MicroDollars;

    const totalTasks = taskStats?.total_tasks || 0;
    const successfulTasks = taskStats?.successful_tasks || 0;

    return {
      period,
      startDate,
      endDate,
      tokensUsed: taskStats?.total_tokens_used || 0,
      tokensSaved,
      costMicro: (taskStats?.total_cost_micro || 0) as MicroDollars,
      costSavingsMicro,
      routingDecisions,
      tasksCompleted: successfulTasks,
      tasksFailed: taskStats?.failed_tasks || 0,
      avgComplexity: taskStats?.avg_complexity || 0,
      avgDurationMs: taskStats?.avg_duration_ms || 0,
      successRate: totalTasks > 0 ? successfulTasks / totalTasks : 0,
    };
  }

  /**
   * Get period date range
   */
  private getPeriodRange(period: 'day' | 'week' | 'month' | 'all'): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = now;
    let startDate: Date;

    switch (period) {
      case 'day':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'all':
      default:
        startDate = new Date(0); // Unix epoch
        break;
    }

    return { startDate, endDate };
  }

  /**
   * Format stats for display
   */
  formatStatsForDisplay(stats: PeriodStats): {
    period: string;
    tokensUsed: number;
    tokensSaved: number;
    costSavings: string;
    routingDecisions: { ollama: number; claude: number; hybrid?: number };
    tasksCompleted: number;
    avgComplexity: number;
  } {
    return {
      period: stats.period,
      tokensUsed: stats.tokensUsed,
      tokensSaved: stats.tokensSaved,
      costSavings: formatMoney(stats.costSavingsMicro, 2),
      routingDecisions: {
        ollama: stats.routingDecisions.ollama,
        claude: stats.routingDecisions.claude,
        ...(stats.routingDecisions.hybrid > 0 ? { hybrid: stats.routingDecisions.hybrid } : {}),
      },
      tasksCompleted: stats.tasksCompleted,
      avgComplexity: Math.round(stats.avgComplexity * 10) / 10,
    };
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Get database statistics
   */
  getDatabaseStats(): { totalTasks: number; totalRoutingDecisions: number } {
    const tasks = this.db.prepare('SELECT COUNT(*) as count FROM task_records').get() as { count: number };
    const routing = this.db.prepare('SELECT COUNT(*) as count FROM routing_decisions').get() as { count: number };

    return {
      totalTasks: tasks.count,
      totalRoutingDecisions: routing.count,
    };
  }

  /**
   * Clean old records (keep last N days)
   */
  cleanOldRecords(keepDays: number = 90): number {
    const cutoffTs = Date.now() - keepDays * 24 * 60 * 60 * 1000;

    const taskResult = this.db.prepare('DELETE FROM task_records WHERE timestamp < ?').run(cutoffTs);
    const routingResult = this.db.prepare('DELETE FROM routing_decisions WHERE timestamp < ?').run(cutoffTs);

    const deleted = taskResult.changes + routingResult.changes;
    if (deleted > 0) {
      logger.info(`Cleaned ${deleted} old records (older than ${keepDays} days)`);
    }

    return deleted;
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

// Export singleton getter
export function getStatsService(): StatsService {
  return StatsService.getInstance();
}
