/**
 * Pattern Repository
 *
 * Handles pattern CRUD operations.
 * Single Responsibility: Pattern data persistence.
 */

import Database from 'better-sqlite3';
import { safeJsonParse } from '../../../utils/json.js';
import { validatePattern } from '../validation';
import type {
  Pattern,
  PatternData,
  PatternQuery,
  PatternRow,
  SQLParams,
  SQLParam,
} from '../types';

export class PatternRepository {
  constructor(private db: Database.Database) {}

  /**
   * Store or update a learned pattern
   */
  async recordPattern(pattern: Pattern): Promise<void> {
    // Validate pattern before inserting
    validatePattern(pattern);

    const stmt = this.db.prepare(`
      INSERT INTO patterns (
        id, type, confidence, occurrences, pattern_data, source_span_ids,
        applies_to_agent_type, applies_to_task_type, applies_to_skill,
        first_observed, last_observed, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      pattern.id,
      pattern.type,
      pattern.confidence,
      pattern.occurrences,
      JSON.stringify(pattern.pattern_data),
      JSON.stringify(pattern.source_span_ids),
      pattern.applies_to_agent_type || null,
      pattern.applies_to_task_type || null,
      pattern.applies_to_skill || null,
      pattern.first_observed.toISOString(),
      pattern.last_observed.toISOString(),
      pattern.is_active ? 1 : 0
    );
  }

  /**
   * Get a pattern by ID
   */
  async getPattern(patternId: string): Promise<Pattern | null> {
    const stmt = this.db.prepare('SELECT * FROM patterns WHERE id = ?');
    const row = stmt.get(patternId) as PatternRow | undefined;
    if (!row) return null;

    return this.rowToPattern(row);
  }

  /**
   * Query patterns with flexible filtering
   */
  async queryPatterns(query: PatternQuery): Promise<Pattern[]> {
    let sql = 'SELECT * FROM patterns WHERE 1=1';
    const params: SQLParams = [];

    if (query.type) {
      if (Array.isArray(query.type)) {
        sql += ` AND type IN (${query.type.map(() => '?').join(',')})`;
        params.push(...query.type);
      } else {
        sql += ' AND type = ?';
        params.push(query.type);
      }
    }

    if (query.min_confidence !== undefined) {
      sql += ' AND confidence >= ?';
      params.push(query.min_confidence);
    }

    if (query.max_confidence !== undefined) {
      sql += ' AND confidence <= ?';
      params.push(query.max_confidence);
    }

    if (query.agent_type) {
      sql += ' AND applies_to_agent_type = ?';
      params.push(query.agent_type);
    }

    if (query.task_type) {
      sql += ' AND applies_to_task_type = ?';
      params.push(query.task_type);
    }

    if (query.skill_name) {
      sql += ' AND applies_to_skill = ?';
      params.push(query.skill_name);
    }

    if (query.is_active !== undefined) {
      sql += ' AND is_active = ?';
      params.push(query.is_active ? 1 : 0);
    }

    if (query.observed_after) {
      sql += ' AND last_observed >= ?';
      params.push(query.observed_after.toISOString());
    }

    if (query.observed_before) {
      sql += ' AND first_observed <= ?';
      params.push(query.observed_before.toISOString());
    }

    // Sorting
    if (query.sort_by) {
      sql += ` ORDER BY ${query.sort_by}`;
      if (query.sort_order) {
        sql += ` ${query.sort_order.toUpperCase()}`;
      }
    }

    // Pagination
    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as PatternRow[];

    // Optimized: Pre-allocate array with known length
    const patterns: Pattern[] = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      patterns[i] = this.rowToPattern(rows[i]);
    }
    return patterns;
  }

  /**
   * Update a pattern
   */
  async updatePattern(
    patternId: string,
    updates: Partial<Pattern>
  ): Promise<void> {
    const fields: string[] = [];
    const values: SQLParam[] = [];

    if (updates.confidence !== undefined) {
      fields.push('confidence = ?');
      values.push(updates.confidence);
    }

    if (updates.occurrences !== undefined) {
      fields.push('occurrences = ?');
      values.push(updates.occurrences);
    }

    if (updates.last_observed) {
      fields.push('last_observed = ?');
      values.push(updates.last_observed.toISOString());
    }

    if (fields.length > 0) {
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(patternId);

      const stmt = this.db.prepare(`
        UPDATE patterns SET ${fields.join(', ')} WHERE id = ?
      `);

      stmt.run(...values);
    }
  }

  /**
   * Convert database row to Pattern model
   */
  private rowToPattern(row: PatternRow): Pattern {
    return {
      id: row.id,
      type: row.type as Pattern['type'],
      confidence: row.confidence,
      occurrences: row.occurrences,
      pattern_data: safeJsonParse<PatternData>(row.pattern_data, {
        conditions: {},
        recommendations: {},
        expected_improvement: {},
        evidence: { sample_size: 0 },
      }),
      source_span_ids: safeJsonParse(row.source_span_ids, []),
      applies_to_agent_type: row.applies_to_agent_type ?? undefined,
      applies_to_task_type: row.applies_to_task_type ?? undefined,
      applies_to_skill: row.applies_to_skill ?? undefined,
      first_observed: new Date(row.first_observed),
      last_observed: new Date(row.last_observed),
      is_active: row.is_active === 1,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}
