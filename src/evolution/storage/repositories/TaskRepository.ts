import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { safeJsonParse } from '../../../utils/json.js';
import type { Task, TaskRow, SQLParam } from '../types';

/**
 * Task Repository
 *
 * Handles task CRUD operations.
 * Single Responsibility: Task data persistence.
 */
export class TaskRepository {
  constructor(private db: Database.Database) {}

  async createTask(
    input: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<Task> {
    const task: Task = {
      id: uuid(),
      input,
      status: 'pending',
      created_at: new Date(),
      metadata,
    };

    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, input, status, created_at, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      task.id,
      JSON.stringify(task.input),
      task.status,
      task.created_at.toISOString(),
      task.metadata ? JSON.stringify(task.metadata) : null
    );

    return task;
  }

  async getTask(taskId: string): Promise<Task | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks WHERE id = ?
    `);

    const row = stmt.get(taskId) as TaskRow | undefined;
    if (!row) return null;

    return this.rowToTask(row);
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const fields: string[] = [];
    const values: SQLParam[] = [];

    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (updates.started_at) {
      fields.push('started_at = ?');
      values.push(updates.started_at.toISOString());
    }

    if (updates.completed_at) {
      fields.push('completed_at = ?');
      values.push(updates.completed_at.toISOString());
    }

    if (fields.length === 0) return;

    values.push(taskId);

    const stmt = this.db.prepare(`
      UPDATE tasks SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
  }

  async listTasks(filters?: {
    status?: Task['status'];
    limit?: number;
    offset?: number;
  }): Promise<Task[]> {
    let query = 'SELECT * FROM tasks';
    const params: (string | number)[] = [];

    if (filters?.status) {
      query += ' WHERE status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as TaskRow[];

    const tasks: Task[] = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      tasks[i] = this.rowToTask(rows[i]);
    }
    return tasks;
  }

  private rowToTask(row: TaskRow): Task {
    return {
      id: row.id,
      input: safeJsonParse(row.input, {}),
      task_type: row.task_type ?? undefined,
      origin: row.origin ?? undefined,
      status: row.status as Task['status'],
      created_at: new Date(row.created_at),
      started_at: row.started_at ? new Date(row.started_at) : undefined,
      completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
      metadata: safeJsonParse(row.metadata, undefined),
    };
  }
}
