import { logger } from '../../../utils/logger.js';
import { safeJsonParse, safeJsonStringify } from '../../../utils/json.js';
export class PerformanceMetricsRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    ensureSchema() {
        const tableInfo = this.db.prepare('PRAGMA table_info(execution_metrics)').all();
        const hasUserSatisfaction = tableInfo.some(col => col.name === 'user_satisfaction');
        if (!hasUserSatisfaction) {
            logger.info('Adding user_satisfaction column to execution_metrics table');
            this.db.exec('ALTER TABLE execution_metrics ADD COLUMN user_satisfaction REAL');
        }
    }
    save(metric) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO execution_metrics (
        id, agent_id, task_type, success, duration_ms, timestamp,
        cost, quality_score, user_satisfaction, config_snapshot, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
        stmt.run(metric.executionId, metric.agentId, metric.taskType, metric.success ? 1 : 0, metric.durationMs, metric.timestamp.toISOString(), metric.cost, metric.qualityScore, metric.userSatisfaction ?? null, '{}', metric.metadata ? safeJsonStringify(metric.metadata) : null);
        logger.debug('Saved performance metric', { executionId: metric.executionId });
    }
    saveBatch(metrics) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO execution_metrics (
        id, agent_id, task_type, success, duration_ms, timestamp,
        cost, quality_score, user_satisfaction, config_snapshot, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
        const insertMany = this.db.transaction((items) => {
            for (const metric of items) {
                stmt.run(metric.executionId, metric.agentId, metric.taskType, metric.success ? 1 : 0, metric.durationMs, metric.timestamp.toISOString(), metric.cost, metric.qualityScore, metric.userSatisfaction ?? null, '{}', metric.metadata ? safeJsonStringify(metric.metadata) : null);
            }
        });
        insertMany(metrics);
        logger.debug(`Saved ${metrics.length} performance metrics in batch`);
    }
    getByAgentId(agentId, limit) {
        const sql = limit
            ? 'SELECT * FROM execution_metrics WHERE agent_id = ? ORDER BY timestamp DESC LIMIT ?'
            : 'SELECT * FROM execution_metrics WHERE agent_id = ? ORDER BY timestamp DESC';
        const stmt = this.db.prepare(sql);
        const rows = (limit ? stmt.all(agentId, limit) : stmt.all(agentId));
        return rows.map(row => this.rowToMetric(row));
    }
    getByTimeRange(start, end, agentId) {
        let sql = `
      SELECT * FROM execution_metrics
      WHERE timestamp >= ? AND timestamp <= ?
    `;
        const params = [start.toISOString(), end.toISOString()];
        if (agentId) {
            sql += ' AND agent_id = ?';
            params.push(agentId);
        }
        sql += ' ORDER BY timestamp DESC';
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        return rows.map(row => this.rowToMetric(row));
    }
    getStats(agentId, timeRange) {
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
        const params = [agentId];
        if (timeRange) {
            sql += ' AND timestamp >= ? AND timestamp <= ?';
            params.push(timeRange.start.toISOString(), timeRange.end.toISOString());
        }
        const stmt = this.db.prepare(sql);
        const row = stmt.get(...params);
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
    getAgentIds() {
        const stmt = this.db.prepare('SELECT DISTINCT agent_id FROM execution_metrics');
        const rows = stmt.all();
        return rows.map(r => r.agent_id);
    }
    deleteOlderThan(date) {
        const stmt = this.db.prepare('DELETE FROM execution_metrics WHERE timestamp < ?');
        const result = stmt.run(date.toISOString());
        logger.debug(`Deleted ${result.changes} old performance metrics`);
        return result.changes;
    }
    count(agentId) {
        const sql = agentId
            ? 'SELECT COUNT(*) as count FROM execution_metrics WHERE agent_id = ?'
            : 'SELECT COUNT(*) as count FROM execution_metrics';
        const stmt = this.db.prepare(sql);
        const row = (agentId ? stmt.get(agentId) : stmt.get());
        return row.count;
    }
    rowToMetric(row) {
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
//# sourceMappingURL=PerformanceMetricsRepository.js.map