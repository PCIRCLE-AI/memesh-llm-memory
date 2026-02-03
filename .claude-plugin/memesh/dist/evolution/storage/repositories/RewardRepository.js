import { validateReward } from '../validation';
import { safeJsonParse } from '../../../utils/json.js';
export class RewardRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async recordReward(reward) {
        validateReward(reward);
        const stmt = this.db.prepare(`
      INSERT INTO rewards (
        id, operation_span_id, value, dimensions, feedback, feedback_type,
        provided_by, provided_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(reward.id, reward.operation_span_id, reward.value, reward.dimensions ? JSON.stringify(reward.dimensions) : null, reward.feedback || null, reward.feedback_type || null, reward.provided_by || null, reward.provided_at.toISOString(), reward.metadata ? JSON.stringify(reward.metadata) : null);
    }
    async getRewardsForSpan(spanId) {
        const stmt = this.db.prepare(`
      SELECT * FROM rewards WHERE operation_span_id = ? ORDER BY provided_at ASC
    `);
        const rows = stmt.all(spanId);
        const rewards = new Array(rows.length);
        for (let i = 0; i < rows.length; i++) {
            rewards[i] = this.rowToReward(rows[i]);
        }
        return rewards;
    }
    async queryRewardsByOperationSpan(operationSpanId) {
        const stmt = this.db.prepare(`
      SELECT * FROM rewards WHERE operation_span_id = ? ORDER BY provided_at DESC
    `);
        const rows = stmt.all(operationSpanId);
        const rewards = new Array(rows.length);
        for (let i = 0; i < rows.length; i++) {
            rewards[i] = this.rowToReward(rows[i]);
        }
        return rewards;
    }
    async queryRewards(filters) {
        let sql = 'SELECT * FROM rewards WHERE 1=1';
        const params = [];
        if (filters.start_time) {
            sql += ' AND provided_at >= ?';
            params.push(filters.start_time.toISOString());
        }
        if (filters.end_time) {
            sql += ' AND provided_at <= ?';
            params.push(filters.end_time.toISOString());
        }
        if (filters.min_value !== undefined) {
            sql += ' AND value >= ?';
            params.push(filters.min_value);
        }
        if (filters.max_value !== undefined) {
            sql += ' AND value <= ?';
            params.push(filters.max_value);
        }
        sql += ' ORDER BY provided_at DESC';
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        const rewards = new Array(rows.length);
        for (let i = 0; i < rows.length; i++) {
            rewards[i] = this.rowToReward(rows[i]);
        }
        return rewards;
    }
    rowToReward(row) {
        return {
            id: row.id,
            operation_span_id: row.operation_span_id,
            value: row.value,
            dimensions: safeJsonParse(row.dimensions, undefined),
            feedback: row.feedback ?? undefined,
            feedback_type: row.feedback_type,
            provided_by: row.provided_by ?? undefined,
            provided_at: new Date(row.provided_at),
            metadata: safeJsonParse(row.metadata, undefined),
        };
    }
}
//# sourceMappingURL=RewardRepository.js.map