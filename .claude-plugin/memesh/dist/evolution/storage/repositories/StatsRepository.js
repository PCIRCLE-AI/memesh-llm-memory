import { v4 as uuid } from 'uuid';
import { safeJsonParse } from '../../../utils/json.js';
export class StatsRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async getStats(agentId, timeRange) {
        const cachedStmt = this.db.prepare(`
      SELECT * FROM evolution_stats
      WHERE agent_id = ?
        AND period_start <= ?
        AND period_end >= ?
      ORDER BY period_start DESC LIMIT 1
    `);
        const cachedRow = cachedStmt.get(agentId, timeRange.end.toISOString(), timeRange.start.toISOString());
        if (cachedRow) {
            return this.rowToEvolutionStats(cachedRow);
        }
        const metricsStmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_executions,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_executions,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed_executions,
        AVG(duration_ms) as avg_duration_ms,
        AVG(COALESCE(cost, 0)) as avg_cost,
        AVG(COALESCE(quality_score, 0)) as avg_quality_score
      FROM execution_metrics
      WHERE agent_id = ?
        AND timestamp >= ?
        AND timestamp <= ?
    `);
        const metricsRow = metricsStmt.get(agentId, timeRange.start.toISOString(), timeRange.end.toISOString());
        const patternsStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM patterns
      WHERE (agent_id = ? OR agent_id IS NULL)
        AND first_observed >= ?
        AND first_observed <= ?
    `);
        const patternsRow = patternsStmt.get(agentId, timeRange.start.toISOString(), timeRange.end.toISOString());
        const adaptationsStmt = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM adaptations
      WHERE (applied_to_agent_id = ? OR applied_to_agent_id IS NULL)
        AND applied_at >= ?
        AND applied_at <= ?
    `);
        const adaptationsRow = adaptationsStmt.get(agentId, timeRange.start.toISOString(), timeRange.end.toISOString());
        const improvementStmt = this.db.prepare(`
      SELECT AVG(avg_improvement) as improvement_rate
      FROM adaptations
      WHERE (applied_to_agent_id = ? OR applied_to_agent_id IS NULL)
        AND applied_at >= ?
        AND applied_at <= ?
        AND is_active = 1
    `);
        const improvementRow = improvementStmt.get(agentId, timeRange.start.toISOString(), timeRange.end.toISOString());
        const totalExecutions = metricsRow?.total_executions || 0;
        const successfulExecutions = metricsRow?.successful_executions || 0;
        return {
            id: uuid(),
            agent_id: agentId,
            period_start: timeRange.start,
            period_end: timeRange.end,
            period_type: this.determinePeriodType(timeRange),
            total_executions: totalExecutions,
            successful_executions: successfulExecutions,
            failed_executions: metricsRow?.failed_executions || 0,
            success_rate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
            avg_duration_ms: metricsRow?.avg_duration_ms || 0,
            avg_cost: metricsRow?.avg_cost || 0,
            avg_quality_score: metricsRow?.avg_quality_score || 0,
            patterns_discovered: patternsRow?.count || 0,
            adaptations_applied: adaptationsRow?.count || 0,
            improvement_rate: improvementRow?.improvement_rate || 0,
            created_at: new Date(),
            updated_at: new Date(),
        };
    }
    determinePeriodType(timeRange) {
        const durationMs = timeRange.end.getTime() - timeRange.start.getTime();
        const hours = durationMs / (1000 * 60 * 60);
        if (hours <= 2)
            return 'hourly';
        if (hours <= 48)
            return 'daily';
        if (hours <= 168)
            return 'weekly';
        return 'monthly';
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
        const { taskType, agentType, topN = 5 } = filters;
        const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
        let query = `
      SELECT
        json_extract(attributes, '$.skill.name') as skill_name,
        COUNT(*) as total_uses,
        SUM(CASE WHEN status_code = 'OK' THEN 1 ELSE 0 END) as successful_uses,
        AVG(duration_ms) as avg_duration_ms,
        AVG(COALESCE(json_extract(attributes, '$.quality_score'), 0)) as avg_quality
      FROM spans
      WHERE json_valid(attributes)
        AND json_extract(attributes, '$.skill.name') IS NOT NULL
        AND start_time >= ?
    `;
        const params = [thirtyDaysAgo];
        if (taskType) {
            query += ` AND (
        json_extract(attributes, '$.task.type') = ?
        OR json_extract(resource, '$.task.type') = ?
      )`;
            params.push(taskType, taskType);
        }
        if (agentType) {
            query += ` AND json_extract(resource, '$.agent.type') = ?`;
            params.push(agentType);
        }
        query += `
      GROUP BY skill_name
      HAVING total_uses >= 2
      ORDER BY
        (CAST(successful_uses AS REAL) / total_uses) DESC,
        avg_quality DESC,
        total_uses DESC
      LIMIT ?
    `;
        params.push(topN);
        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params);
        const patternQuery = this.db.prepare(`
      SELECT
        applies_to_skill as skill_name,
        COUNT(*) as pattern_count,
        AVG(confidence) as avg_confidence
      FROM patterns
      WHERE type = 'success'
        AND is_active = 1
        AND applies_to_skill IS NOT NULL
        AND (applies_to_task_type = ? OR applies_to_task_type IS NULL)
      GROUP BY applies_to_skill
      ORDER BY avg_confidence DESC, pattern_count DESC
      LIMIT ?
    `);
        const patternRows = patternQuery.all(taskType, topN);
        const skillMap = new Map();
        for (const row of rows) {
            const successRate = row.total_uses > 0 ? row.successful_uses / row.total_uses : 0;
            skillMap.set(row.skill_name, {
                successRate,
                avgDuration: row.avg_duration_ms || 0,
                uses: row.total_uses,
                patternConfidence: 0,
                patternCount: 0,
            });
        }
        for (const row of patternRows) {
            const existing = skillMap.get(row.skill_name);
            if (existing) {
                existing.patternConfidence = row.avg_confidence;
                existing.patternCount = row.pattern_count;
            }
            else {
                skillMap.set(row.skill_name, {
                    successRate: row.avg_confidence,
                    avgDuration: 0,
                    uses: 0,
                    patternConfidence: row.avg_confidence,
                    patternCount: row.pattern_count,
                });
            }
        }
        const recommendations = [];
        for (const [skillName, metrics] of skillMap) {
            const compositeScore = metrics.successRate * 0.5 +
                metrics.patternConfidence * 0.3 +
                Math.min(metrics.uses / 10, 1) * 0.2;
            let reason = '';
            if (metrics.successRate > 0.8) {
                reason = `High success rate (${(metrics.successRate * 100).toFixed(0)}%)`;
            }
            else if (metrics.patternConfidence > 0.7) {
                reason = `Strong pattern match (${(metrics.patternConfidence * 100).toFixed(0)}% confidence)`;
            }
            else if (metrics.uses > 5) {
                reason = `Frequently used for similar tasks (${metrics.uses} times)`;
            }
            else {
                reason = `Based on historical performance analysis`;
            }
            if (agentType) {
                reason += ` with ${agentType}`;
            }
            recommendations.push({
                skill_name: skillName,
                confidence: compositeScore,
                reason,
                evidence: {
                    similar_tasks_count: metrics.uses,
                    avg_success_rate: metrics.successRate,
                    avg_user_satisfaction: 0,
                },
                expected_outcome: {
                    success_probability: metrics.successRate,
                    estimated_duration_ms: metrics.avgDuration,
                    estimated_quality_score: metrics.patternConfidence || 0.5,
                },
            });
        }
        return recommendations
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, topN);
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