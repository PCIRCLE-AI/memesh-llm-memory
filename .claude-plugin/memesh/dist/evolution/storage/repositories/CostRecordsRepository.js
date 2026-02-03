import { v4 as uuid } from 'uuid';
import { logger } from '../../../utils/logger.js';
export class CostRecordsRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    ensureSchema() {
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
    save(record) {
        const id = record.id || uuid();
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO cost_records (
        id, timestamp, task_id, model_name, input_tokens, output_tokens, cost_micro, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
        stmt.run(id, record.timestamp.toISOString(), record.taskId, record.modelName, record.inputTokens, record.outputTokens, record.cost);
        logger.debug('Saved cost record', { id, taskId: record.taskId });
        return id;
    }
    saveBatch(records) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO cost_records (
        id, timestamp, task_id, model_name, input_tokens, output_tokens, cost_micro, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);
        const insertMany = this.db.transaction((items) => {
            for (const record of items) {
                const id = record.id || uuid();
                stmt.run(id, record.timestamp.toISOString(), record.taskId, record.modelName, record.inputTokens, record.outputTokens, record.cost);
            }
        });
        insertMany(records);
        logger.debug(`Saved ${records.length} cost records in batch`);
    }
    getAll(limit) {
        const sql = limit
            ? 'SELECT * FROM cost_records ORDER BY timestamp DESC LIMIT ?'
            : 'SELECT * FROM cost_records ORDER BY timestamp DESC';
        const stmt = this.db.prepare(sql);
        const rows = (limit ? stmt.all(limit) : stmt.all());
        return rows.map(row => this.rowToRecord(row));
    }
    getByTimeRange(start, end) {
        const stmt = this.db.prepare(`
      SELECT * FROM cost_records
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp DESC
    `);
        const rows = stmt.all(start.toISOString(), end.toISOString());
        return rows.map(row => this.rowToRecord(row));
    }
    getByModel(modelName, limit) {
        const sql = limit
            ? 'SELECT * FROM cost_records WHERE model_name = ? ORDER BY timestamp DESC LIMIT ?'
            : 'SELECT * FROM cost_records WHERE model_name = ? ORDER BY timestamp DESC';
        const stmt = this.db.prepare(sql);
        const rows = (limit ? stmt.all(modelName, limit) : stmt.all(modelName));
        return rows.map(row => this.rowToRecord(row));
    }
    getTotalCost(timeRange) {
        let sql = 'SELECT SUM(cost_micro) as total FROM cost_records';
        const params = [];
        if (timeRange) {
            sql += ' WHERE timestamp >= ? AND timestamp <= ?';
            params.push(timeRange.start.toISOString(), timeRange.end.toISOString());
        }
        const stmt = this.db.prepare(sql);
        const row = (params.length > 0 ? stmt.get(...params) : stmt.get());
        return (row.total || 0);
    }
    getCostByModel(timeRange) {
        let sql = `
      SELECT model_name, SUM(cost_micro) as total
      FROM cost_records
    `;
        const params = [];
        if (timeRange) {
            sql += ' WHERE timestamp >= ? AND timestamp <= ?';
            params.push(timeRange.start.toISOString(), timeRange.end.toISOString());
        }
        sql += ' GROUP BY model_name';
        const stmt = this.db.prepare(sql);
        const rows = (params.length > 0 ? stmt.all(...params) : stmt.all());
        const result = new Map();
        for (const row of rows) {
            result.set(row.model_name, row.total);
        }
        return result;
    }
    getStats(timeRange) {
        let sql = `
      SELECT
        COUNT(*) as total_records,
        SUM(cost_micro) as total_cost,
        SUM(input_tokens) as total_input,
        SUM(output_tokens) as total_output
      FROM cost_records
    `;
        const params = [];
        if (timeRange) {
            sql += ' WHERE timestamp >= ? AND timestamp <= ?';
            params.push(timeRange.start.toISOString(), timeRange.end.toISOString());
        }
        const stmt = this.db.prepare(sql);
        const row = (params.length > 0 ? stmt.get(...params) : stmt.get());
        const totalRecords = row.total_records || 0;
        const totalCost = (row.total_cost || 0);
        return {
            totalRecords,
            totalCost,
            totalInputTokens: row.total_input || 0,
            totalOutputTokens: row.total_output || 0,
            avgCostPerRecord: (totalRecords > 0 ? Math.round(totalCost / totalRecords) : 0),
        };
    }
    deleteOlderThan(date) {
        const stmt = this.db.prepare('DELETE FROM cost_records WHERE timestamp < ?');
        const result = stmt.run(date.toISOString());
        logger.debug(`Deleted ${result.changes} old cost records`);
        return result.changes;
    }
    count() {
        const stmt = this.db.prepare('SELECT COUNT(*) as count FROM cost_records');
        const row = stmt.get();
        return row.count;
    }
    rowToRecord(row) {
        return {
            id: row.id,
            timestamp: new Date(row.timestamp),
            taskId: row.task_id,
            modelName: row.model_name,
            inputTokens: row.input_tokens,
            outputTokens: row.output_tokens,
            cost: row.cost_micro,
        };
    }
}
//# sourceMappingURL=CostRecordsRepository.js.map