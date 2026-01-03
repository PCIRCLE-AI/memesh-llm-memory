import { v4 as uuid } from 'uuid';
import { safeJsonParse } from '../../../utils/json.js';
export class StatsRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async getStats(agentId, timeRange) {
        const stmt = this.db.prepare(`
      SELECT * FROM evolution_stats
      WHERE agent_id = ?
        AND period_start <= ?
        AND period_end >= ?
      ORDER BY period_start DESC LIMIT 1
    `);
        const row = stmt.get(agentId, timeRange.end.toISOString(), timeRange.start.toISOString());
        if (row) {
            return this.rowToEvolutionStats(row);
        }
        return {
            id: uuid(),
            agent_id: agentId,
            period_start: timeRange.start,
            period_end: timeRange.end,
            period_type: 'daily',
            total_executions: 0,
            successful_executions: 0,
            failed_executions: 0,
            success_rate: 0,
            avg_duration_ms: 0,
            avg_cost: 0,
            avg_quality_score: 0,
            patterns_discovered: 0,
            adaptations_applied: 0,
            improvement_rate: 0,
            created_at: new Date(),
            updated_at: new Date(),
        };
    }
    async getSkillPerformance(skillName, timeRange) {
        const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_uses,
        SUM(CASE WHEN status_code = 'OK' THEN 1 ELSE 0 END) as successful_uses,
        SUM(CASE WHEN status_code = 'ERROR' THEN 1 ELSE 0 END) as failed_uses,
        AVG(duration_ms) as avg_duration_ms
      FROM spans
      WHERE CASE
          WHEN json_valid(attributes) THEN json_extract(attributes, '$.skill.name') = ?
          ELSE 0
        END
        AND start_time >= ? AND start_time <= ?
    `);
        const row = stmt.get(skillName, timeRange.start.getTime(), timeRange.end.getTime());
        const total = row?.total_uses || 0;
        const successful = row?.successful_uses || 0;
        return {
            skill_name: skillName,
            total_uses: total,
            successful_uses: successful,
            failed_uses: row?.failed_uses || 0,
            success_rate: total > 0 ? successful / total : 0,
            avg_duration_ms: row?.avg_duration_ms || 0,
            avg_user_satisfaction: 0,
            trend_7d: 'stable',
            trend_30d: 'stable',
            period_start: timeRange.start,
            period_end: timeRange.end,
        };
    }
    async getSkillRecommendations(filters) {
        return [];
    }
    rowToEvolutionStats(row) {
        return {
            id: row.id,
            agent_id: row.agent_id ?? undefined,
            skill_name: row.skill_name ?? undefined,
            period_start: new Date(row.period_start),
            period_end: new Date(row.period_end),
            period_type: row.period_type,
            total_executions: row.total_executions,
            successful_executions: row.successful_executions,
            failed_executions: row.failed_executions,
            success_rate: row.success_rate,
            avg_duration_ms: row.avg_duration_ms,
            avg_cost: row.avg_cost,
            avg_quality_score: row.avg_quality_score,
            patterns_discovered: row.patterns_discovered,
            adaptations_applied: row.adaptations_applied,
            improvement_rate: row.improvement_rate,
            skills_used: safeJsonParse(row.skills_used, undefined),
            most_successful_skill: row.most_successful_skill ?? undefined,
            avg_skill_satisfaction: row.avg_skill_satisfaction ?? undefined,
            created_at: new Date(row.created_at),
            updated_at: new Date(row.updated_at),
        };
    }
}
//# sourceMappingURL=StatsRepository.js.map