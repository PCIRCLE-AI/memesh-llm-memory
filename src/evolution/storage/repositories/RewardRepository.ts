import Database from 'better-sqlite3';
import { validateReward } from '../validation';
import { safeJsonParse } from '../../../utils/json.js';
import type { Reward, RewardRow, SQLParams } from '../types';

/**
 * Reward Repository
 *
 * Handles reward/feedback persistence for operations.
 * Single Responsibility: Reward tracking.
 */
export class RewardRepository {
  constructor(private db: Database.Database) {}

  /**
   * Record reward/feedback for an operation
   *
   * @param reward - Reward to record
   */
  async recordReward(reward: Reward): Promise<void> {
    // Validate reward before inserting
    validateReward(reward);

    const stmt = this.db.prepare(`
      INSERT INTO rewards (
        id, operation_span_id, value, dimensions, feedback, feedback_type,
        provided_by, provided_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      reward.id,
      reward.operation_span_id,
      reward.value,
      reward.dimensions ? JSON.stringify(reward.dimensions) : null,
      reward.feedback || null,
      reward.feedback_type || null,
      reward.provided_by || null,
      reward.provided_at.toISOString(),
      reward.metadata ? JSON.stringify(reward.metadata) : null
    );
  }

  /**
   * Get all rewards for a span, ordered by provided_at ascending
   *
   * @param spanId - Span ID to get rewards for
   * @returns Array of rewards
   */
  async getRewardsForSpan(spanId: string): Promise<Reward[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM rewards WHERE operation_span_id = ? ORDER BY provided_at ASC
    `);

    const rows = stmt.all(spanId) as RewardRow[];

    // Optimized: Pre-allocate array with known length
    const rewards: Reward[] = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      rewards[i] = this.rowToReward(rows[i]);
    }
    return rewards;
  }

  /**
   * Query rewards by operation span, ordered by provided_at descending
   *
   * @param operationSpanId - Operation span ID
   * @returns Array of rewards
   */
  async queryRewardsByOperationSpan(operationSpanId: string): Promise<Reward[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM rewards WHERE operation_span_id = ? ORDER BY provided_at DESC
    `);

    const rows = stmt.all(operationSpanId) as RewardRow[];

    // Optimized: Pre-allocate array with known length
    const rewards: Reward[] = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      rewards[i] = this.rowToReward(rows[i]);
    }
    return rewards;
  }

  /**
   * Query rewards with flexible filtering
   *
   * @param filters - Reward filters
   * @returns Array of matching rewards
   */
  async queryRewards(filters: {
    start_time?: Date;
    end_time?: Date;
    min_value?: number;
    max_value?: number;
  }): Promise<Reward[]> {
    let sql = 'SELECT * FROM rewards WHERE 1=1';
    const params: SQLParams = [];

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
    const rows = stmt.all(...params) as RewardRow[];

    // Optimized: Pre-allocate array with known length
    const rewards: Reward[] = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      rewards[i] = this.rowToReward(rows[i]);
    }
    return rewards;
  }

  /**
   * Convert database row to Reward model
   *
   * @param row - Database row
   * @returns Reward model
   */
  private rowToReward(row: RewardRow): Reward {
    return {
      id: row.id,
      operation_span_id: row.operation_span_id,
      value: row.value,
      dimensions: safeJsonParse(row.dimensions, undefined),
      feedback: row.feedback ?? undefined,
      feedback_type: row.feedback_type as Reward['feedback_type'],
      provided_by: row.provided_by ?? undefined,
      provided_at: new Date(row.provided_at),
      metadata: safeJsonParse(row.metadata, undefined),
    };
  }
}
