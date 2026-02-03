import { v4 as uuid } from 'uuid';
import { safeJsonParse } from '../../../utils/json.js';
export class TaskRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async createTask(input, metadata) {
        const task = {
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
        stmt.run(task.id, JSON.stringify(task.input), task.status, task.created_at.toISOString(), task.metadata ? JSON.stringify(task.metadata) : null);
        return task;
    }
    async getTask(taskId) {
        const stmt = this.db.prepare(`
      SELECT * FROM tasks WHERE id = ?
    `);
        const row = stmt.get(taskId);
        if (!row)
            return null;
        return this.rowToTask(row);
    }
    async updateTask(taskId, updates) {
        const fields = [];
        const values = [];
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
        if (fields.length === 0)
            return;
        values.push(taskId);
        const stmt = this.db.prepare(`
      UPDATE tasks SET ${fields.join(', ')} WHERE id = ?
    `);
        stmt.run(...values);
    }
    async listTasks(filters) {
        let query = 'SELECT * FROM tasks';
        const params = [];
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
        const rows = stmt.all(...params);
        const tasks = new Array(rows.length);
        for (let i = 0; i < rows.length; i++) {
            tasks[i] = this.rowToTask(rows[i]);
        }
        return tasks;
    }
    rowToTask(row) {
        return {
            id: row.id,
            input: safeJsonParse(row.input, {}),
            task_type: row.task_type ?? undefined,
            origin: row.origin ?? undefined,
            status: row.status,
            created_at: new Date(row.created_at),
            started_at: row.started_at ? new Date(row.started_at) : undefined,
            completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
            metadata: safeJsonParse(row.metadata, undefined),
        };
    }
}
//# sourceMappingURL=TaskRepository.js.map