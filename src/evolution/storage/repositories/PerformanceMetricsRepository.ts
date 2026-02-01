/**
 * PerformanceMetricsRepository - SQLite persistence for PerformanceMetrics
 *
 * Provides SQLite storage for PerformanceTracker data that was previously
 * stored only in-memory. This ensures metrics persist across restarts.
 *
 * Uses the existing execution_metrics table from schema.ts
 */

import Database from 'better-sqlite3';
import { logger } from '../../../utils/logger.js';
import { safeJsonParse, safeJsonStringify } from '../../../utils/json.js';

export interface PerformanceMetrics {
  executionId: string;
  agentId: string;
  taskType: string;
  success: boolean;
  durationMs: number;
  cost: number;
  qualityScore: number;
  userSatisfaction?: number;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

interface PerformanceMetricsRow {
  id: string;
  agent_id: string;
  task_type: string;
  success: number;
  duration_ms: number;
  timestamp: string;
  cost: number | null;
  quality_score: number | null;
  user_satisfaction: number | null;
  error_message: string | null;
  config_snapshot: string;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * PerformanceMetricsRepository
 *
 * Handles SQLite persistence for PerformanceMetrics.
 * Single Responsibility: Store and retrieve performance metrics.
 */
export class PerformanceMetricsRepository {
  constructor(private db: Database.Database) {}

  /**
   * Ensure the execution_metrics table has user_satisfaction column
   * (Migration for existing databases)
   */
  ensureSchema(): void {
    // Check if user_satisfaction column exists
    const tableInfo = this.db.prepare('PRAGMA table_info(execution_metrics)').all() as Array<{ name: string }>;
    const hasUserSatisfaction = tableInfo.some(col => col.name === 'user_satisfaction');

    if (!hasUserSatisfaction) {
      logger.info('Adding user_satisfaction column to execution_metrics table');
      this.db.exec('ALTER TABLE execution_metrics ADD COLUMN user_satisfaction REAL');
    }
  }

  /**
   * Save a single performance metric
   */
  save(metric: PerformanceMetrics): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO execution_metrics (
        id, agent_id, task_type, success, duration_ms, timestamp,
        cost, quality_score, user_satisfaction, config_snapshot, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    stmt.run(
      metric.executionId,
      metric.agentId,
      metric.taskType,
      metric.success ? 1 : 0,
      metric.durationMs,
      metric.timestamp.toISOString(),
      metric.cost,
      metric.qualityScore,
      metric.userSatisfaction ?? null,
      '{}', // config_snapshot - not used by PerformanceTracker
      metric.metadata ? safeJsonStringify(metric.metadata) : null
    );

    logger.debug('Saved performance metric', { executionId: metric.executionId });
  }

  /**
   * Save multiple performance metrics in a batch
   */
  saveBatch(metrics: PerformanceMetrics[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO execution_metrics (
        id, agent_id, task_type, success, duration_ms, timestamp,
        cost, quality_score, user_satisfaction, config_snapshot, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const insertMany = this.db.transaction((items: PerformanceMetrics[]) => {
      for (const metric of items) {
        stmt.run(
          metric.executionId,
          metric.agentId,
          metric.taskType,
          metric.success ? 1 : 0,
          metric.durationMs,
          metric.timestamp.toISOString(),
          metric.cost,
          metric.qualityScore,
          metric.userSatisfaction ?? null,
          '{}',
          metric.metadata ? safeJsonStringify(metric.metadata) : null
        );
      }
    });

    insertMany(metrics);
    logger.debug(`Saved ${metrics.length} performance metrics in batch`);
  }

  /**
   * Get metrics by agent ID
   */
  getByAgentId(agentId: string, limit?: number): PerformanceMetrics[] {
    const sql = limit
      ? 'SELECT * FROM execution_metrics WHERE agent_id = ? ORDER BY timestamp DESC LIMIT ?'
      : 'SELECT * FROM execution_metrics WHERE agent_id = ? ORDER BY timestamp DESC';

    const stmt = this.db.prepare(sql);
    const rows = (limit ? stmt.all(agentId, limit) : stmt.all(agentId)) as PerformanceMetricsRow[];

    return rows.map(row => this.rowToMetric(row));
  }

  /**
   * Get metrics within a time range
   */
  getByTimeRange(start: Date, end: Date, agentId?: string): PerformanceMetrics[] {
    let sql = `
      SELECT * FROM execution_metrics
      WHERE timestamp >= ? AND timestamp <= ?
    `;
    const params: (string | number)[] = [start.toISOString(), end.toISOString()];

    if (agentId) {
      sql += ' AND agent_id = ?';
      params.push(agentId);
    }

    sql += ' ORDER BY timestamp DESC';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as PerformanceMetricsRow[];

    return rows.map(row => this.rowToMetric(row));
  }

  /**
   * Get aggregate statistics for an agent
   */
  getStats(agentId: string, timeRange?: { start: Date; end: Date }): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    avgDurationMs: number;
    avgCost: number;
    avgQualityScore: number;
    successRate: number;
  } {
    let sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed,
        AVG(duration_ms) as avg_duration,
        AVG(cost) as avg_cost,
        AVG(quality_score) as avg_quality
      FROM execution_metrics
      WHERE agent_id = ?
    `;
    const params: (string | number)[] = [agentId];

    if (timeRange) {
      sql += ' AND timestamp >= ? AND timestamp <= ?';
      params.push(timeRange.start.toISOString(), timeRange.end.toISOString());
    }

    const stmt = this.db.prepare(sql);
    const row = stmt.get(...params) as {
      total: number;
      successful: number;
      failed: number;
      avg_duration: number | null;
      avg_cost: number | null;
      avg_quality: number | null;
    };

    const total = row.total || 0;
    return {
      totalExecutions: total,
      successfulExecutions: row.successful || 0,
      failedExecutions: row.failed || 0,
      avgDurationMs: row.avg_duration || 0,
      avgCost: row.avg_cost || 0,
      avgQualityScore: row.avg_quality || 0,
      successRate: total > 0 ? (row.successful || 0) / total : 0,
    };
  }

  /**
   * Get all distinct agent IDs
   */
  getAgentIds(): string[] {
    const stmt = this.db.prepare('SELECT DISTINCT agent_id FROM execution_metrics');
    const rows = stmt.all() as Array<{ agent_id: string }>;
    return rows.map(r => r.agent_id);
  }

  /**
   * Delete old metrics (for cleanup/eviction)
   */
  deleteOlderThan(date: Date): number {
    const stmt = this.db.prepare('DELETE FROM execution_metrics WHERE timestamp < ?');
    const result = stmt.run(date.toISOString());
    logger.debug(`Deleted ${result.changes} old performance metrics`);
    return result.changes;
  }

  /**
   * Get total count of metrics
   */
  count(agentId?: string): number {
    const sql = agentId
      ? 'SELECT COUNT(*) as count FROM execution_metrics WHERE agent_id = ?'
      : 'SELECT COUNT(*) as count FROM execution_metrics';

    const stmt = this.db.prepare(sql);
    const row = (agentId ? stmt.get(agentId) : stmt.get()) as { count: number };
    return row.count;
  }

  /**
   * Convert database row to PerformanceMetrics object
   */
  private rowToMetric(row: PerformanceMetricsRow): PerformanceMetrics {
    return {
      executionId: row.id,
      agentId: row.agent_id,
      taskType: row.task_type,
      success: row.success === 1,
      durationMs: row.duration_ms,
      cost: row.cost ?? 0,
      qualityScore: row.quality_score ?? 0,
      userSatisfaction: row.user_satisfaction ?? undefined,
      timestamp: new Date(row.timestamp),
      metadata: row.metadata ? safeJsonParse(row.metadata, undefined) : undefined,
    };
  }
}
