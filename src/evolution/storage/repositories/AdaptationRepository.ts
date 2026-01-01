/**
 * AdaptationRepository
 *
 * Handles adaptation CRUD operations.
 * Single Responsibility: Adaptation data persistence.
 */

import Database from 'better-sqlite3';
import { safeJsonParse } from '../../../utils/json.js';
import { validateAdaptation } from '../validation';
import type { Adaptation, AdaptationRow, SQLParams } from '../types';

export class AdaptationRepository {
  constructor(private db: Database.Database) {}

  /**
   * Store an adaptation (applied pattern change)
   *
   * @param adaptation - Adaptation to store
   */
  async recordAdaptation(adaptation: Adaptation): Promise<void> {
    // Validate adaptation before inserting
    validateAdaptation(adaptation);

    const stmt = this.db.prepare(`
      INSERT INTO adaptations (
        id, pattern_id, type, before_config, after_config,
        applied_to_agent_id, applied_to_task_type, applied_to_skill,
        applied_at, success_count, failure_count, avg_improvement, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      adaptation.id,
      adaptation.pattern_id,
      adaptation.type,
      JSON.stringify(adaptation.before_config),
      JSON.stringify(adaptation.after_config),
      adaptation.applied_to_agent_id || null,
      adaptation.applied_to_task_type || null,
      adaptation.applied_to_skill || null,
      adaptation.applied_at.toISOString(),
      adaptation.success_count,
      adaptation.failure_count,
      adaptation.avg_improvement,
      adaptation.is_active ? 1 : 0
    );
  }

  async getAdaptation(adaptationId: string): Promise<Adaptation | null> {
    const stmt = this.db.prepare('SELECT * FROM adaptations WHERE id = ?');
    const row = stmt.get(adaptationId) as AdaptationRow | undefined;
    if (!row) return null;

    return this.rowToAdaptation(row);
  }

  async queryAdaptations(filters: {
    patternId?: string;
    agentId?: string;
    taskType?: string;
    skillName?: string;
    isActive?: boolean;
  }): Promise<Adaptation[]> {
    let sql = 'SELECT * FROM adaptations WHERE 1=1';
    const params: SQLParams = [];

    if (filters.patternId) {
      sql += ' AND pattern_id = ?';
      params.push(filters.patternId);
    }

    if (filters.agentId) {
      sql += ' AND applied_to_agent_id = ?';
      params.push(filters.agentId);
    }

    if (filters.taskType) {
      sql += ' AND applied_to_task_type = ?';
      params.push(filters.taskType);
    }

    if (filters.skillName) {
      sql += ' AND applied_to_skill = ?';
      params.push(filters.skillName);
    }

    if (filters.isActive !== undefined) {
      sql += ' AND is_active = ?';
      params.push(filters.isActive ? 1 : 0);
    }

    sql += ' ORDER BY applied_at DESC';

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as AdaptationRow[];

    // Optimized: Pre-allocate array with known length
    const adaptations: Adaptation[] = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      adaptations[i] = this.rowToAdaptation(rows[i]);
    }
    return adaptations;
  }

  private rowToAdaptation(row: AdaptationRow): Adaptation {
    return {
      id: row.id,
      pattern_id: row.pattern_id,
      type: row.type as Adaptation['type'],
      before_config: safeJsonParse(row.before_config, {}),
      after_config: safeJsonParse(row.after_config, {}),
      applied_to_agent_id: row.applied_to_agent_id ?? undefined,
      applied_to_task_type: row.applied_to_task_type ?? undefined,
      applied_to_skill: row.applied_to_skill ?? undefined,
      applied_at: new Date(row.applied_at),
      success_count: row.success_count,
      failure_count: row.failure_count,
      avg_improvement: row.avg_improvement,
      is_active: row.is_active === 1,
      deactivated_at: row.deactivated_at
        ? new Date(row.deactivated_at)
        : undefined,
      deactivation_reason: row.deactivation_reason ?? undefined,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    };
  }
}
