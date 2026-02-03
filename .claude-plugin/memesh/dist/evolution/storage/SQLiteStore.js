import { v4 as uuid } from 'uuid';
import { logger } from '../../utils/logger.js';
import { SimpleDatabaseFactory } from '../../config/simple-config.js';
import { MigrationManager } from './migrations/MigrationManager';
import { safeJsonParse } from '../../utils/json.js';
import { TaskRepository } from './repositories/TaskRepository';
import { ExecutionRepository } from './repositories/ExecutionRepository';
import { SpanRepository } from './repositories/SpanRepository';
import { PatternRepository } from './repositories/PatternRepository';
import { AdaptationRepository } from './repositories/AdaptationRepository';
import { RewardRepository } from './repositories/RewardRepository';
import { StatsRepository } from './repositories/StatsRepository';
import { validateDatabasePath } from '../../utils/pathValidation.js';
export class SQLiteStore {
    db;
    migrationManager;
    taskRepository;
    executionRepository;
    spanRepository;
    patternRepository;
    adaptationRepository;
    rewardRepository;
    statsRepository;
    options;
    constructor(options = {}) {
        const rawDbPath = options.dbPath || ':memory:';
        const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true';
        const validatedDbPath = (isTestEnv || rawDbPath === ':memory:')
            ? rawDbPath
            : validateDatabasePath(rawDbPath, 'data/evolution');
        this.options = {
            dbPath: validatedDbPath,
            verbose: options.verbose || false,
            enableWAL: options.enableWAL !== false,
        };
        this.db = this.options.dbPath === ':memory:'
            ? SimpleDatabaseFactory.createTestDatabase()
            : SimpleDatabaseFactory.getInstance(this.options.dbPath);
        this.migrationManager = new MigrationManager(this.db);
        this.taskRepository = new TaskRepository(this.db);
        this.executionRepository = new ExecutionRepository(this.db);
        this.spanRepository = new SpanRepository(this.db);
        this.patternRepository = new PatternRepository(this.db);
        this.adaptationRepository = new AdaptationRepository(this.db);
        this.rewardRepository = new RewardRepository(this.db);
        this.statsRepository = new StatsRepository(this.db);
    }
    escapeLikePattern(pattern) {
        return pattern
            .replace(/\\/g, '\\\\')
            .replace(/%/g, '\\%')
            .replace(/_/g, '\\_')
            .replace(/'/g, "''")
            .replace(/"/g, '""');
    }
    async initialize() {
        await this.migrationManager.initialize();
        this.createTables();
        this.createIndexes();
        await this.migrationManager.migrate();
    }
    async close() {
        this.db.close();
    }
    createTables() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        input TEXT NOT NULL,
        task_type TEXT,
        origin TEXT,
        status TEXT NOT NULL CHECK(status IN ('pending', 'running', 'completed', 'failed')),
        created_at DATETIME NOT NULL,
        started_at DATETIME,
        completed_at DATETIME,
        metadata TEXT
      );
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS executions (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL,
        attempt_number INTEGER NOT NULL,
        agent_id TEXT,
        agent_type TEXT,
        status TEXT NOT NULL CHECK(status IN ('running', 'completed', 'failed')),
        started_at DATETIME NOT NULL,
        completed_at DATETIME,
        result TEXT,
        error TEXT,
        metadata TEXT,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS spans (
        span_id TEXT PRIMARY KEY,
        trace_id TEXT NOT NULL,
        parent_span_id TEXT,
        task_id TEXT NOT NULL,
        execution_id TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration_ms INTEGER,
        status_code TEXT NOT NULL,
        status_message TEXT,
        attributes TEXT NOT NULL,
        resource TEXT NOT NULL,
        links TEXT,
        tags TEXT,
        events TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (execution_id) REFERENCES executions(id) ON DELETE CASCADE
      );
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS patterns (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('success', 'anti_pattern', 'optimization')),
        confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
        occurrences INTEGER NOT NULL DEFAULT 1,
        pattern_data TEXT NOT NULL,
        source_span_ids TEXT,
        applies_to_agent_type TEXT,
        applies_to_task_type TEXT,
        applies_to_skill TEXT,
        first_observed DATETIME NOT NULL,
        last_observed DATETIME NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS adaptations (
        id TEXT PRIMARY KEY,
        pattern_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('config', 'prompt', 'strategy', 'resource', 'skill')),
        before_config TEXT NOT NULL,
        after_config TEXT NOT NULL,
        applied_to_agent_id TEXT,
        applied_to_task_type TEXT,
        applied_to_skill TEXT,
        applied_at DATETIME NOT NULL,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        avg_improvement REAL NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        deactivated_at DATETIME,
        deactivation_reason TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
      );
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS rewards (
        id TEXT PRIMARY KEY,
        operation_span_id TEXT NOT NULL,
        value REAL NOT NULL,
        dimensions TEXT,
        feedback TEXT,
        feedback_type TEXT,
        provided_by TEXT,
        provided_at DATETIME NOT NULL,
        metadata TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (operation_span_id) REFERENCES spans(span_id) ON DELETE CASCADE
      );
    `);
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS evolution_stats (
        id TEXT PRIMARY KEY,
        agent_id TEXT,
        skill_name TEXT,
        period_start DATETIME NOT NULL,
        period_end DATETIME NOT NULL,
        period_type TEXT NOT NULL CHECK(period_type IN ('hourly', 'daily', 'weekly', 'monthly')),
        total_executions INTEGER NOT NULL,
        successful_executions INTEGER NOT NULL,
        failed_executions INTEGER NOT NULL,
        success_rate REAL NOT NULL,
        avg_duration_ms REAL NOT NULL,
        avg_cost REAL NOT NULL,
        avg_quality_score REAL NOT NULL,
        patterns_discovered INTEGER NOT NULL DEFAULT 0,
        adaptations_applied INTEGER NOT NULL DEFAULT 0,
        improvement_rate REAL NOT NULL DEFAULT 0,
        skills_used TEXT,
        most_successful_skill TEXT,
        avg_skill_satisfaction REAL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    }
    createIndexes() {
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    `);
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_executions_task_id ON executions(task_id);
      CREATE INDEX IF NOT EXISTS idx_executions_agent_id ON executions(agent_id);
      CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
    `);
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON spans(trace_id);
      CREATE INDEX IF NOT EXISTS idx_spans_task_id ON spans(task_id);
      CREATE INDEX IF NOT EXISTS idx_spans_execution_id ON spans(execution_id);
      CREATE INDEX IF NOT EXISTS idx_spans_parent_span_id ON spans(parent_span_id);
      CREATE INDEX IF NOT EXISTS idx_spans_start_time ON spans(start_time);
      CREATE INDEX IF NOT EXISTS idx_spans_status_code ON spans(status_code);
    `);
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(type);
      CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns(confidence);
      CREATE INDEX IF NOT EXISTS idx_patterns_agent_type ON patterns(applies_to_agent_type);
      CREATE INDEX IF NOT EXISTS idx_patterns_task_type ON patterns(applies_to_task_type);
      CREATE INDEX IF NOT EXISTS idx_patterns_skill ON patterns(applies_to_skill);
      CREATE INDEX IF NOT EXISTS idx_patterns_is_active ON patterns(is_active);
    `);
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_adaptations_pattern_id ON adaptations(pattern_id);
      CREATE INDEX IF NOT EXISTS idx_adaptations_agent_id ON adaptations(applied_to_agent_id);
      CREATE INDEX IF NOT EXISTS idx_adaptations_skill ON adaptations(applied_to_skill);
      CREATE INDEX IF NOT EXISTS idx_adaptations_is_active ON adaptations(is_active);
    `);
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_rewards_operation_span_id ON rewards(operation_span_id);
      CREATE INDEX IF NOT EXISTS idx_rewards_provided_at ON rewards(provided_at);
    `);
        this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_stats_agent_id ON evolution_stats(agent_id);
      CREATE INDEX IF NOT EXISTS idx_stats_skill_name ON evolution_stats(skill_name);
      CREATE INDEX IF NOT EXISTS idx_stats_period ON evolution_stats(period_start, period_end);
      CREATE INDEX IF NOT EXISTS idx_stats_period_type ON evolution_stats(period_type);
    `);
    }
    async createTask(input, metadata) {
        return this.taskRepository.createTask(input, metadata);
    }
    async getTask(taskId) {
        return this.taskRepository.getTask(taskId);
    }
    async updateTask(taskId, updates) {
        return this.taskRepository.updateTask(taskId, updates);
    }
    async listTasks(filters) {
        return this.taskRepository.listTasks(filters);
    }
    async createExecution(taskId, metadata) {
        return this.executionRepository.createExecution(taskId, metadata);
    }
    async getExecution(executionId) {
        return this.executionRepository.getExecution(executionId);
    }
    async updateExecution(executionId, updates) {
        return this.executionRepository.updateExecution(executionId, updates);
    }
    async listExecutions(taskId) {
        return this.executionRepository.listExecutions(taskId);
    }
    async recordSpan(span) {
        return this.spanRepository.recordSpan(span);
    }
    async recordSpanBatch(spans) {
        return this.spanRepository.recordSpanBatch(spans);
    }
    async querySpans(query) {
        return this.spanRepository.querySpans(query);
    }
    async getSpan(spanId) {
        return this.spanRepository.getSpan(spanId);
    }
    async getSpansByTrace(traceId) {
        return this.spanRepository.getSpansByTrace(traceId);
    }
    async getChildSpans(parentSpanId) {
        return this.spanRepository.getChildSpans(parentSpanId);
    }
    async queryLinkedSpans(spanId) {
        const stmt = this.db.prepare(`
      SELECT * FROM spans
      WHERE links IS NOT NULL
        AND json_valid(links)
        AND EXISTS (
          SELECT 1 FROM json_each(links)
          WHERE json_extract(value, '$.span_id') = ?
        )
    `);
        const rows = stmt.all(spanId);
        const spans = new Array(rows.length);
        for (let i = 0; i < rows.length; i++) {
            spans[i] = this.rowToSpan(rows[i]);
        }
        return spans;
    }
    async queryByTags(tags, mode = 'any') {
        if (mode === 'any') {
            const conditions = tags.map(() => 'tags LIKE ? ESCAPE \'\\\'').join(' OR ');
            const params = tags.map((tag) => '%"' + this.escapeLikePattern(tag) + '"%');
            const stmt = this.db.prepare(`
        SELECT * FROM spans WHERE tags IS NOT NULL AND (${conditions})
      `);
            const rows = stmt.all(...params);
            const spans = new Array(rows.length);
            for (let i = 0; i < rows.length; i++) {
                spans[i] = this.rowToSpan(rows[i]);
            }
            return spans;
        }
        else {
            const conditions = tags.map(() => 'tags LIKE ? ESCAPE \'\\\'').join(' AND ');
            const params = tags.map((tag) => '%"' + this.escapeLikePattern(tag) + '"%');
            const stmt = this.db.prepare(`
        SELECT * FROM spans WHERE tags IS NOT NULL AND ${conditions}
      `);
            const rows = stmt.all(...params);
            const spans = new Array(rows.length);
            for (let i = 0; i < rows.length; i++) {
                spans[i] = this.rowToSpan(rows[i]);
            }
            return spans;
        }
    }
    async recordReward(reward) {
        return this.rewardRepository.recordReward(reward);
    }
    async getRewardsForSpan(spanId) {
        return this.rewardRepository.getRewardsForSpan(spanId);
    }
    async queryRewardsByOperationSpan(operationSpanId) {
        return this.rewardRepository.queryRewardsByOperationSpan(operationSpanId);
    }
    async queryRewards(filters) {
        return this.rewardRepository.queryRewards(filters);
    }
    async storePattern(pattern) {
        return this.patternRepository.recordPattern(pattern);
    }
    async getPattern(patternId) {
        return this.patternRepository.getPattern(patternId);
    }
    async queryPatterns(query) {
        return this.patternRepository.queryPatterns(query);
    }
    async storeContextualPattern(pattern) {
        const stmt = this.db.prepare(`
      INSERT INTO patterns (
        id, type, confidence, occurrences, pattern_data, source_span_ids,
        applies_to_agent_type, applies_to_task_type, applies_to_skill,
        first_observed, last_observed, is_active,
        complexity, config_keys, context_metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(pattern.id, pattern.type, pattern.confidence, pattern.observations, JSON.stringify({ description: pattern.description }), null, pattern.context.agent_type || null, pattern.context.task_type || null, null, pattern.last_seen, pattern.last_seen, 1, pattern.context.complexity || null, pattern.context.config_keys ? JSON.stringify(pattern.context.config_keys) : null, pattern.context.metadata ? JSON.stringify(pattern.context.metadata) : null);
    }
    async queryPatternsByContext(context) {
        let sql = 'SELECT * FROM patterns WHERE 1=1';
        const params = [];
        if (context.agent_type) {
            sql += ' AND applies_to_agent_type = ?';
            params.push(context.agent_type);
        }
        if (context.task_type) {
            sql += ' AND applies_to_task_type = ?';
            params.push(context.task_type);
        }
        if (context.complexity) {
            sql += ' AND complexity = ?';
            params.push(context.complexity);
        }
        if (context.config_keys && context.config_keys.length > 0) {
            sql += ' AND config_keys IS NOT NULL';
        }
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        return rows.map((row) => this.rowToContextualPattern(row));
    }
    rowToContextualPattern(row) {
        const pattern_data = safeJsonParse(row.pattern_data, {});
        const config_keys = safeJsonParse(row.config_keys, undefined);
        const metadata = safeJsonParse(row.context_metadata, undefined);
        let success_rate = 0;
        try {
            const adaptationStats = this.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN outcome_status = 'success' THEN 1 ELSE 0 END) as successes
        FROM adaptations
        WHERE pattern_id = ?
      `).get(row.id);
            if (adaptationStats && adaptationStats.total > 0) {
                success_rate = adaptationStats.successes / adaptationStats.total;
            }
        }
        catch (error) {
            logger.warn('Failed to calculate success_rate for pattern', {
                patternId: row.id,
                error: error instanceof Error ? error.message : String(error),
            });
            success_rate = 0;
        }
        let avg_execution_time = 0;
        try {
            const spanStats = this.db.prepare(`
        SELECT AVG(duration_ms) as avg_duration
        FROM spans
        WHERE json_extract(attributes, '$.pattern.id') = ?
      `).get(row.id);
            if (spanStats && spanStats.avg_duration !== null) {
                avg_execution_time = spanStats.avg_duration;
            }
        }
        catch (error) {
            logger.warn('Failed to calculate avg_execution_time for pattern', {
                patternId: row.id,
                error: error instanceof Error ? error.message : String(error),
            });
            avg_execution_time = 0;
        }
        return {
            id: row.id,
            type: row.type,
            description: pattern_data.description || '',
            confidence: row.confidence,
            observations: row.occurrences,
            success_rate,
            avg_execution_time,
            last_seen: row.last_observed,
            context: {
                agent_type: row.applies_to_agent_type ?? undefined,
                task_type: row.applies_to_task_type ?? undefined,
                complexity: row.complexity ? (row.complexity === 1 ? 'low' : row.complexity === 2 ? 'medium' : 'high') : undefined,
                config_keys: config_keys,
                metadata: metadata,
            },
        };
    }
    async updatePattern(patternId, updates) {
        return this.patternRepository.updatePattern(patternId, updates);
    }
    async deactivatePattern(patternId, _reason) {
        const stmt = this.db.prepare(`
      UPDATE patterns SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);
        stmt.run(patternId);
    }
    async getActivePatternsFor(filters) {
        let sql = 'SELECT * FROM patterns WHERE is_active = 1';
        const params = [];
        if (filters.agentType) {
            sql += ' AND (applies_to_agent_type = ? OR applies_to_agent_type IS NULL)';
            params.push(filters.agentType);
        }
        if (filters.taskType) {
            sql += ' AND (applies_to_task_type = ? OR applies_to_task_type IS NULL)';
            params.push(filters.taskType);
        }
        if (filters.skillName) {
            sql += ' AND (applies_to_skill = ? OR applies_to_skill IS NULL)';
            params.push(filters.skillName);
        }
        sql += ' ORDER BY confidence DESC';
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        const patterns = new Array(rows.length);
        for (let i = 0; i < rows.length; i++) {
            patterns[i] = this.rowToPattern(rows[i]);
        }
        return patterns;
    }
    async storeAdaptation(adaptation) {
        return this.adaptationRepository.recordAdaptation(adaptation);
    }
    async getAdaptation(adaptationId) {
        return this.adaptationRepository.getAdaptation(adaptationId);
    }
    async queryAdaptations(filters) {
        return this.adaptationRepository.queryAdaptations(filters);
    }
    async updateAdaptationOutcome(adaptationId, outcome) {
        const adaptation = await this.getAdaptation(adaptationId);
        if (!adaptation)
            return;
        const newSuccessCount = outcome.success
            ? adaptation.success_count + 1
            : adaptation.success_count;
        const newFailureCount = !outcome.success
            ? adaptation.failure_count + 1
            : adaptation.failure_count;
        let newAvgImprovement = adaptation.avg_improvement;
        if (outcome.improvement !== undefined) {
            const totalCount = newSuccessCount + newFailureCount;
            newAvgImprovement =
                (adaptation.avg_improvement * (totalCount - 1) + outcome.improvement) /
                    totalCount;
        }
        const stmt = this.db.prepare(`
      UPDATE adaptations
      SET success_count = ?, failure_count = ?, avg_improvement = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
        stmt.run(newSuccessCount, newFailureCount, newAvgImprovement, adaptationId);
    }
    async deactivateAdaptation(adaptationId, reason) {
        const stmt = this.db.prepare(`
      UPDATE adaptations
      SET is_active = 0, deactivated_at = CURRENT_TIMESTAMP, deactivation_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
        stmt.run(reason || null, adaptationId);
    }
    async getStats(agentId, timeRange) {
        return this.statsRepository.getStats(agentId, timeRange);
    }
    async getAllStats(timeRange) {
        const stmt = this.db.prepare(`
      SELECT * FROM evolution_stats
      WHERE period_start >= ? AND period_end <= ?
      ORDER BY period_start DESC
    `);
        const rows = stmt.all(timeRange.start.toISOString(), timeRange.end.toISOString());
        const stats = new Array(rows.length);
        for (let i = 0; i < rows.length; i++) {
            stats[i] = this.rowToEvolutionStats(rows[i]);
        }
        return stats;
    }
    async computePeriodStats(periodType, periodStart, periodEnd) {
        const startTime = periodStart.getTime();
        const endTime = periodEnd.getTime();
        const stmt = this.db.prepare(`
      SELECT
        json_extract(resource, '$.agent.id') as agent_id,
        COUNT(*) as total_executions,
        SUM(CASE WHEN status_code = 'OK' THEN 1 ELSE 0 END) as successful_executions,
        SUM(CASE WHEN status_code = 'ERROR' THEN 1 ELSE 0 END) as failed_executions,
        AVG(duration_ms) as avg_duration_ms,
        AVG(COALESCE(json_extract(attributes, '$.cost'), 0)) as avg_cost,
        AVG(COALESCE(json_extract(attributes, '$.quality_score'), 0)) as avg_quality_score
      FROM spans
      WHERE start_time >= ? AND start_time <= ?
      GROUP BY agent_id
    `);
        const rows = stmt.all(startTime, endTime);
        const patternCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM patterns
      WHERE first_observed >= ? AND first_observed <= ?
    `).get(periodStart.toISOString(), periodEnd.toISOString());
        const adaptationCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM adaptations
      WHERE applied_at >= ? AND applied_at <= ?
    `).get(periodStart.toISOString(), periodEnd.toISOString());
        const skillUsageStmt = this.db.prepare(`
      SELECT
        json_extract(attributes, '$.skill.name') as skill_name,
        COUNT(*) as uses,
        SUM(CASE WHEN status_code = 'OK' THEN 1 ELSE 0 END) as successes
      FROM spans
      WHERE start_time >= ? AND start_time <= ?
        AND json_extract(attributes, '$.skill.name') IS NOT NULL
      GROUP BY skill_name
      ORDER BY uses DESC
    `);
        const skillRows = skillUsageStmt.all(startTime, endTime);
        const skillsUsed = {};
        let mostSuccessfulSkill;
        let maxSuccessRate = 0;
        for (const skill of skillRows) {
            skillsUsed[skill.skill_name] = skill.uses;
            const rate = skill.uses > 0 ? skill.successes / skill.uses : 0;
            if (rate > maxSuccessRate) {
                maxSuccessRate = rate;
                mostSuccessfulSkill = skill.skill_name;
            }
        }
        const stats = [];
        const now = new Date();
        for (const row of rows) {
            const total = row.total_executions || 0;
            const successful = row.successful_executions || 0;
            const successRate = total > 0 ? successful / total : 0;
            stats.push({
                id: uuid(),
                agent_id: row.agent_id ?? undefined,
                period_start: periodStart,
                period_end: periodEnd,
                period_type: periodType,
                total_executions: total,
                successful_executions: successful,
                failed_executions: row.failed_executions || 0,
                success_rate: successRate,
                avg_duration_ms: row.avg_duration_ms || 0,
                avg_cost: row.avg_cost || 0,
                avg_quality_score: row.avg_quality_score || 0,
                patterns_discovered: patternCount.count,
                adaptations_applied: adaptationCount.count,
                improvement_rate: 0,
                skills_used: Object.keys(skillsUsed).length > 0 ? Object.keys(skillsUsed) : undefined,
                most_successful_skill: mostSuccessfulSkill,
                avg_skill_satisfaction: undefined,
                created_at: now,
                updated_at: now,
            });
        }
        if (stats.length === 0) {
            stats.push({
                id: uuid(),
                period_start: periodStart,
                period_end: periodEnd,
                period_type: periodType,
                total_executions: 0,
                successful_executions: 0,
                failed_executions: 0,
                success_rate: 0,
                avg_duration_ms: 0,
                avg_cost: 0,
                avg_quality_score: 0,
                patterns_discovered: patternCount.count,
                adaptations_applied: adaptationCount.count,
                improvement_rate: 0,
                skills_used: Object.keys(skillsUsed).length > 0 ? Object.keys(skillsUsed) : undefined,
                most_successful_skill: mostSuccessfulSkill,
                created_at: now,
                updated_at: now,
            });
        }
        return stats;
    }
    async getSkillPerformance(skillName, timeRange) {
        return this.statsRepository.getSkillPerformance(skillName, timeRange);
    }
    async getAllSkillsPerformance(timeRange) {
        const stmt = this.db.prepare(`
      SELECT
        json_extract(attributes, '$.skill.name') as skill_name,
        COUNT(*) as total_uses,
        SUM(CASE WHEN status_code = 'OK' THEN 1 ELSE 0 END) as successful_uses,
        SUM(CASE WHEN status_code = 'ERROR' THEN 1 ELSE 0 END) as failed_uses,
        AVG(duration_ms) as avg_duration_ms
      FROM spans
      WHERE json_valid(attributes)
        AND json_extract(attributes, '$.skill.name') IS NOT NULL
        AND start_time >= ? AND start_time <= ?
      GROUP BY skill_name
      ORDER BY total_uses DESC
    `);
        const rows = stmt.all(timeRange.start.getTime(), timeRange.end.getTime());
        const skills = new Array(rows.length);
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const total = row.total_uses || 0;
            const successful = row.successful_uses || 0;
            skills[i] = {
                skill_name: row.skill_name,
                total_uses: total,
                successful_uses: successful,
                failed_uses: row.failed_uses || 0,
                success_rate: total > 0 ? successful / total : 0,
                avg_duration_ms: row.avg_duration_ms || 0,
                avg_user_satisfaction: 0,
                trend_7d: 'stable',
                trend_30d: 'stable',
                period_start: timeRange.start,
                period_end: timeRange.end,
            };
        }
        return skills;
    }
    async getSkillRecommendations(filters) {
        return this.statsRepository.getSkillRecommendations(filters);
    }
    async recordSkillFeedback(spanId, feedback) {
        const reward = {
            id: uuid(),
            operation_span_id: spanId,
            value: feedback.satisfaction / 5,
            dimensions: {
                user_satisfaction: feedback.satisfaction,
            },
            feedback: feedback.comment,
            feedback_type: 'user',
            provided_at: new Date(),
        };
        await this.recordReward(reward);
    }
    async getDatabaseStats() {
        const tasksCount = this.db
            .prepare('SELECT COUNT(*) as count FROM tasks')
            .get();
        const executionsCount = this.db
            .prepare('SELECT COUNT(*) as count FROM executions')
            .get();
        const spansCount = this.db
            .prepare('SELECT COUNT(*) as count FROM spans')
            .get();
        const patternsCount = this.db
            .prepare('SELECT COUNT(*) as count FROM patterns')
            .get();
        const adaptationsCount = this.db
            .prepare('SELECT COUNT(*) as count FROM adaptations')
            .get();
        return {
            total_tasks: tasksCount.count,
            total_executions: executionsCount.count,
            total_spans: spansCount.count,
            total_patterns: patternsCount.count,
            total_adaptations: adaptationsCount.count,
        };
    }
    async optimize() {
        this.db.pragma('optimize');
        this.db.exec('VACUUM');
    }
    async exportData(filters) {
        const { startDate, endDate, format } = filters;
        const dateConditions = [];
        const dateParams = [];
        if (startDate) {
            dateConditions.push('start_time >= ?');
            dateParams.push(startDate.getTime());
        }
        if (endDate) {
            dateConditions.push('start_time <= ?');
            dateParams.push(endDate.getTime());
        }
        const whereClause = dateConditions.length > 0
            ? `WHERE ${dateConditions.join(' AND ')}`
            : '';
        const spansStmt = this.db.prepare(`SELECT * FROM spans ${whereClause} ORDER BY start_time DESC`);
        const spanRows = spansStmt.all(...dateParams);
        const spans = spanRows.map(row => this.rowToSpan(row));
        const patternDateParams = [];
        const patternConditions = [];
        if (startDate) {
            patternConditions.push('first_observed >= ?');
            patternDateParams.push(startDate.toISOString());
        }
        if (endDate) {
            patternConditions.push('first_observed <= ?');
            patternDateParams.push(endDate.toISOString());
        }
        const patternWhere = patternConditions.length > 0
            ? `WHERE ${patternConditions.join(' AND ')}`
            : '';
        const patternsStmt = this.db.prepare(`SELECT * FROM patterns ${patternWhere} ORDER BY last_observed DESC`);
        const patternRows = patternsStmt.all(...patternDateParams);
        const patterns = patternRows.map(row => this.rowToPattern(row));
        const adaptationDateParams = [];
        const adaptationConditions = [];
        if (startDate) {
            adaptationConditions.push('applied_at >= ?');
            adaptationDateParams.push(startDate.toISOString());
        }
        if (endDate) {
            adaptationConditions.push('applied_at <= ?');
            adaptationDateParams.push(endDate.toISOString());
        }
        const adaptationWhere = adaptationConditions.length > 0
            ? `WHERE ${adaptationConditions.join(' AND ')}`
            : '';
        const adaptationsStmt = this.db.prepare(`SELECT * FROM adaptations ${adaptationWhere} ORDER BY applied_at DESC`);
        const adaptationRows = adaptationsStmt.all(...adaptationDateParams);
        const exportData = {
            exportedAt: new Date().toISOString(),
            filters: {
                startDate: startDate?.toISOString(),
                endDate: endDate?.toISOString(),
            },
            summary: {
                totalSpans: spans.length,
                totalPatterns: patterns.length,
                totalAdaptations: adaptationRows.length,
            },
            spans,
            patterns,
            adaptations: adaptationRows.map(row => ({
                id: row.id,
                pattern_id: row.pattern_id,
                type: row.type,
                before_config: safeJsonParse(row.before_config, {}),
                after_config: safeJsonParse(row.after_config, {}),
                applied_to_agent_id: row.applied_to_agent_id,
                applied_to_task_type: row.applied_to_task_type,
                applied_to_skill: row.applied_to_skill,
                applied_at: row.applied_at,
                success_count: row.success_count,
                failure_count: row.failure_count,
                avg_improvement: row.avg_improvement,
                is_active: row.is_active === 1,
            })),
        };
        if (format === 'json') {
            return JSON.stringify(exportData, null, 2);
        }
        const csvLines = [];
        csvLines.push('# SPANS');
        csvLines.push('span_id,trace_id,name,status_code,duration_ms,start_time');
        for (const span of spans) {
            csvLines.push([
                span.span_id,
                span.trace_id,
                `"${span.name.replace(/"/g, '""')}"`,
                span.status.code,
                span.duration_ms ?? '',
                new Date(span.start_time).toISOString(),
            ].join(','));
        }
        csvLines.push('');
        csvLines.push('# PATTERNS');
        csvLines.push('id,type,confidence,occurrences,is_active,first_observed,last_observed');
        for (const pattern of patterns) {
            csvLines.push([
                pattern.id,
                pattern.type,
                pattern.confidence,
                pattern.occurrences,
                pattern.is_active ? 1 : 0,
                pattern.first_observed.toISOString(),
                pattern.last_observed.toISOString(),
            ].join(','));
        }
        csvLines.push('');
        csvLines.push('# ADAPTATIONS');
        csvLines.push('id,pattern_id,type,success_count,failure_count,avg_improvement,is_active,applied_at');
        for (const row of adaptationRows) {
            csvLines.push([
                row.id,
                row.pattern_id,
                row.type,
                row.success_count,
                row.failure_count,
                row.avg_improvement,
                row.is_active,
                row.applied_at,
            ].join(','));
        }
        return csvLines.join('\n');
    }
    rowToSpan(row) {
        return {
            trace_id: row.trace_id,
            span_id: row.span_id,
            parent_span_id: row.parent_span_id ?? undefined,
            task_id: row.task_id,
            execution_id: row.execution_id,
            name: row.name,
            kind: row.kind,
            start_time: row.start_time,
            end_time: row.end_time ?? undefined,
            duration_ms: row.duration_ms ?? undefined,
            status: {
                code: row.status_code,
                message: row.status_message ?? undefined,
            },
            attributes: safeJsonParse(row.attributes, {}),
            resource: safeJsonParse(row.resource, { 'task.id': '', 'execution.id': '', 'execution.attempt': 0 }),
            links: safeJsonParse(row.links, undefined),
            tags: safeJsonParse(row.tags, undefined),
            events: safeJsonParse(row.events, undefined),
        };
    }
    rowToPattern(row) {
        return {
            id: row.id,
            type: row.type,
            confidence: row.confidence,
            occurrences: row.occurrences,
            pattern_data: safeJsonParse(row.pattern_data, {
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
//# sourceMappingURL=SQLiteStore.js.map