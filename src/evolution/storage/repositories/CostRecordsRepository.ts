/**
 * CostRecordsRepository - SQLite persistence for CostTracker data
 *
 * Provides SQLite storage for cost records that were previously
 * stored only in-memory. This ensures cost data persists across restarts.
 *
 * Creates and manages the cost_records table.
 */

import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { logger } from '../../../utils/logger.js';
import { type MicroDollars } from '../../../utils/money.js';

export interface CostRecord {
  id?: string;
  timestamp: Date;
  taskId: string;
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  cost: MicroDollars;
}

interface CostRecordRow {
  id: string;
  timestamp: string;
  task_id: string;
  model_name: string;
  input_tokens: number;
  output_tokens: number;
  cost_micro: number;
  created_at: string;
}

/**
 * CostRecordsRepository
 *
 * Handles SQLite persistence for CostRecords.
 * Single Responsibility: Store and retrieve cost records.
 */
export class CostRecordsRepository {
  constructor(private db: Database.Database) {}

  /**
   * Ensure the cost_records table exists
   */
  ensureSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS cost_records (
        id TEXT PRIMARY KEY,
        timestamp DATETIME NOT NULL,
        task_id TEXT NOT NULL,
        model_name TEXT NOT NULL,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        cost_micro INTEGER NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_cost_records_timestamp ON cost_records(timestamp);
      CREATE INDEX IF NOT EXISTS idx_cost_records_task_id ON cost_records(task_id);
      CREATE INDEX IF NOT EXISTS idx_cost_records_model_name ON cost_records(model_name);
    `);
    logger.debug('CostRecordsRepository schema ensured');
  }

  /**
   * Save a single cost record
   */
  save(record: CostRecord): string {
    const id = record.id || uuid();
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO cost_records (
        id, timestamp, task_id, model_name, input_tokens, output_tokens, cost_micro, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    stmt.run(
      id,
      record.timestamp.toISOString(),
      record.taskId,
      record.modelName,
      record.inputTokens,
      record.outputTokens,
      record.cost
    );

    logger.debug('Saved cost record', { id, taskId: record.taskId });
    return id;
  }

  /**
   * Save multiple cost records in a batch
   */
  saveBatch(records: CostRecord[]): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO cost_records (
        id, timestamp, task_id, model_name, input_tokens, output_tokens, cost_micro, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const insertMany = this.db.transaction((items: CostRecord[]) => {
      for (const record of items) {
        const id = record.id || uuid();
        stmt.run(
          id,
          record.timestamp.toISOString(),
          record.taskId,
          record.modelName,
          record.inputTokens,
          record.outputTokens,
          record.cost
        );
      }
    });

    insertMany(records);
    logger.debug(`Saved ${records.length} cost records in batch`);
  }

  /**
   * Get all cost records
   */
  getAll(limit?: number): CostRecord[] {
    const sql = limit
      ? 'SELECT * FROM cost_records ORDER BY timestamp DESC LIMIT ?'
      : 'SELECT * FROM cost_records ORDER BY timestamp DESC';

    const stmt = this.db.prepare(sql);
    const rows = (limit ? stmt.all(limit) : stmt.all()) as CostRecordRow[];

    return rows.map(row => this.rowToRecord(row));
  }

  /**
   * Get cost records by time range
   */
  getByTimeRange(start: Date, end: Date): CostRecord[] {
    const stmt = this.db.prepare(`
      SELECT * FROM cost_records
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
    `);

    const rows = stmt.all(start.toISOString(), end.toISOString()) as CostRecordRow[];
    return rows.map(row => this.rowToRecord(row));
  }

  /**
   * Get cost records by model name
   */
  getByModel(modelName: string, limit?: number): CostRecord[] {
    const sql = limit
      ? 'SELECT * FROM cost_records WHERE model_name = ? ORDER BY timestamp DESC LIMIT ?'
      : 'SELECT * FROM cost_records WHERE model_name = ? ORDER BY timestamp DESC';

    const stmt = this.db.prepare(sql);
    const rows = (limit ? stmt.all(modelName, limit) : stmt.all(modelName)) as CostRecordRow[];

    return rows.map(row => this.rowToRecord(row));
  }

  /**
   * Get total cost in time range
   */
  getTotalCost(timeRange?: { start: Date; end: Date }): MicroDollars {
    let sql = 'SELECT SUM(cost_micro) as total FROM cost_records';
    const params: string[] = [];

    if (timeRange) {
      sql += ' WHERE timestamp >= ? AND timestamp <= ?';
      params.push(timeRange.start.toISOString(), timeRange.end.toISOString());
    }

    const stmt = this.db.prepare(sql);
    const row = (params.length > 0 ? stmt.get(...params) : stmt.get()) as { total: number | null };

    return (row.total || 0) as MicroDollars;
  }

  /**
   * Get cost breakdown by model
   */
  getCostByModel(timeRange?: { start: Date; end: Date }): Map<string, MicroDollars> {
    let sql = `
      SELECT model_name, SUM(cost_micro) as total
      FROM cost_records
    `;
    const params: string[] = [];

    if (timeRange) {
      sql += ' WHERE timestamp >= ? AND timestamp <= ?';
      params.push(timeRange.start.toISOString(), timeRange.end.toISOString());
    }

    sql += ' GROUP BY model_name';

    const stmt = this.db.prepare(sql);
    const rows = (params.length > 0 ? stmt.all(...params) : stmt.all()) as Array<{
      model_name: string;
      total: number;
    }>;

    const result = new Map<string, MicroDollars>();
    for (const row of rows) {
      result.set(row.model_name, row.total as MicroDollars);
    }

    return result;
  }

  /**
   * Get aggregate statistics
   */
  getStats(timeRange?: { start: Date; end: Date }): {
    totalRecords: number;
    totalCost: MicroDollars;
    totalInputTokens: number;
    totalOutputTokens: number;
    avgCostPerRecord: MicroDollars;
  } {
    let sql = `
      SELECT
        COUNT(*) as total_records,
        SUM(cost_micro) as total_cost,
        SUM(input_tokens) as total_input,
        SUM(output_tokens) as total_output
      FROM cost_records
    `;
    const params: string[] = [];

    if (timeRange) {
      sql += ' WHERE timestamp >= ? AND timestamp <= ?';
      params.push(timeRange.start.toISOString(), timeRange.end.toISOString());
    }

    const stmt = this.db.prepare(sql);
    const row = (params.length > 0 ? stmt.get(...params) : stmt.get()) as {
      total_records: number;
      total_cost: number | null;
      total_input: number | null;
      total_output: number | null;
    };

    const totalRecords = row.total_records || 0;
    const totalCost = (row.total_cost || 0) as MicroDollars;

    return {
      totalRecords,
      totalCost,
      totalInputTokens: row.total_input || 0,
      totalOutputTokens: row.total_output || 0,
      avgCostPerRecord: (totalRecords > 0 ? Math.round(totalCost / totalRecords) : 0) as MicroDollars,
    };
  }

  /**
   * Delete old records (for cleanup)
   */
  deleteOlderThan(date: Date): number {
    const stmt = this.db.prepare('DELETE FROM cost_records WHERE timestamp < ?');
    const result = stmt.run(date.toISOString());
    logger.debug(`Deleted ${result.changes} old cost records`);
    return result.changes;
  }

  /**
   * Get total count of records
   */
  count(): number {
    const stmt = this.db.prepare('SELECT COUNT(*) as count FROM cost_records');
    const row = stmt.get() as { count: number };
    return row.count;
  }

  /**
   * Convert database row to CostRecord object
   */
  private rowToRecord(row: CostRecordRow): CostRecord {
    return {
      id: row.id,
      timestamp: new Date(row.timestamp),
      taskId: row.task_id,
      modelName: row.model_name,
      inputTokens: row.input_tokens,
      outputTokens: row.output_tokens,
      cost: row.cost_micro as MicroDollars,
    };
  }
}
