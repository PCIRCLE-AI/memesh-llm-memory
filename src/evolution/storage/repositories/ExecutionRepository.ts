import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { safeJsonParse } from '../../../utils/json.js';
import type { Execution, ExecutionRow, SQLParam } from '../types';

/**
 * Execution Repository
 *
 * Handles execution CRUD operations.
 * Single Responsibility: Execution data persistence.
 */
export class ExecutionRepository {
  constructor(private db: Database.Database) {}

  async createExecution(
    taskId: string,
    metadata?: Record<string, any>
  ): Promise<Execution> {
    // Get current attempt count
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM executions WHERE task_id = ?'
    );
    const { count } = countStmt.get(taskId) as { count: number };

    const execution: Execution = {
      id: uuid(),
      task_id: taskId,
      attempt_number: count + 1,
      status: 'running',
      started_at: new Date(),
      metadata,
    };

    const stmt = this.db.prepare(`
      INSERT INTO executions (id, task_id, attempt_number, status, started_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      execution.id,
      execution.task_id,
      execution.attempt_number,
      execution.status,
      execution.started_at.toISOString(),
      execution.metadata ? JSON.stringify(execution.metadata) : null
    );

    return execution;
  }

  async getExecution(executionId: string): Promise<Execution | null> {
    const stmt = this.db.prepare('SELECT * FROM executions WHERE id = ?');
    const row = stmt.get(executionId) as ExecutionRow | undefined;
    if (!row) return null;

    return this.rowToExecution(row);
  }

  async updateExecution(
    executionId: string,
    updates: Partial<Execution>
  ): Promise<void> {
    const fields: string[] = [];
    const values: SQLParam[] = [];

    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (updates.completed_at) {
      fields.push('completed_at = ?');
      values.push(updates.completed_at.toISOString());
    }

    if (updates.result) {
      fields.push('result = ?');
      values.push(JSON.stringify(updates.result));
    }

    if (updates.error) {
      fields.push('error = ?');
      values.push(updates.error);
    }

    if (fields.length === 0) return;

    values.push(executionId);

    const stmt = this.db.prepare(`
      UPDATE executions SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
  }

  async listExecutions(taskId: string): Promise<Execution[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM executions WHERE task_id = ? ORDER BY attempt_number ASC
    `);

    const rows = stmt.all(taskId) as ExecutionRow[];

    // Optimized: Pre-allocate array with known length
    const executions: Execution[] = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      executions[i] = this.rowToExecution(rows[i]);
    }
    return executions;
  }

  private rowToExecution(row: ExecutionRow): Execution {
    return {
      id: row.id,
      task_id: row.task_id,
      attempt_number: row.attempt_number,
      agent_id: row.agent_id ?? undefined,
      agent_type: row.agent_type ?? undefined,
      status: row.status as Execution['status'],
      started_at: new Date(row.started_at),
      completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
      result: safeJsonParse(row.result, undefined),
      error: row.error ?? undefined,
      metadata: safeJsonParse(row.metadata, undefined),
    };
  }
}
