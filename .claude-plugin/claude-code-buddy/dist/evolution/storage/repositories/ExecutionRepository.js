import { v4 as uuid } from 'uuid';
import { safeJsonParse } from '../../../utils/json.js';
export class ExecutionRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async createExecution(taskId, metadata) {
        const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM executions WHERE task_id = ?');
        const { count } = countStmt.get(taskId);
        const execution = {
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
        stmt.run(execution.id, execution.task_id, execution.attempt_number, execution.status, execution.started_at.toISOString(), execution.metadata ? JSON.stringify(execution.metadata) : null);
        return execution;
    }
    async getExecution(executionId) {
        const stmt = this.db.prepare('SELECT * FROM executions WHERE id = ?');
        const row = stmt.get(executionId);
        if (!row)
            return null;
        return this.rowToExecution(row);
    }
    async updateExecution(executionId, updates) {
        const fields = [];
        const values = [];
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
        if (fields.length === 0)
            return;
        values.push(executionId);
        const stmt = this.db.prepare(`
      UPDATE executions SET ${fields.join(', ')} WHERE id = ?
    `);
        stmt.run(...values);
    }
    async listExecutions(taskId) {
        const stmt = this.db.prepare(`
      SELECT * FROM executions WHERE task_id = ? ORDER BY attempt_number ASC
    `);
        const rows = stmt.all(taskId);
        const executions = new Array(rows.length);
        for (let i = 0; i < rows.length; i++) {
            executions[i] = this.rowToExecution(rows[i]);
        }
        return executions;
    }
    rowToExecution(row) {
        return {
            id: row.id,
            task_id: row.task_id,
            attempt_number: row.attempt_number,
            agent_id: row.agent_id ?? undefined,
            agent_type: row.agent_type ?? undefined,
            status: row.status,
            started_at: new Date(row.started_at),
            completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
            result: safeJsonParse(row.result, undefined),
            error: row.error ?? undefined,
            metadata: safeJsonParse(row.metadata, undefined),
        };
    }
}
//# sourceMappingURL=ExecutionRepository.js.map