import { logger } from '../../utils/logger.js';
import * as fs from 'fs-extra';
import { SimpleDatabaseFactory } from '../../config/simple-config.js';
import { SQLiteStore } from './SQLiteStore.js';
import { OperationError } from '../../errors/index.js';
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}
class NotFoundError extends Error {
    constructor(resource, id) {
        super(`${resource} not found: ${id}`);
        this.name = 'NotFoundError';
    }
}
function validateSpan(span) {
    if (!span.span_id || !span.trace_id) {
        throw new ValidationError('Span must have span_id and trace_id');
    }
    if (!span.task_id || !span.execution_id) {
        throw new ValidationError('Span must have task_id and execution_id');
    }
    if (span.start_time <= 0) {
        throw new ValidationError('Span start_time must be positive');
    }
    if (span.end_time && span.end_time < span.start_time) {
        throw new ValidationError('Span end_time must be >= start_time');
    }
}
function validatePattern(pattern) {
    if (pattern.confidence < 0 || pattern.confidence > 1) {
        throw new ValidationError('Pattern confidence must be between 0 and 1');
    }
    if (pattern.occurrences < 1) {
        throw new ValidationError('Pattern occurrences must be >= 1');
    }
}
const migrations = [
    {
        version: 1,
        name: 'initial_schema',
        up: (db) => {
            db.exec(`
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
            db.exec(`
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
            db.exec(`
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
        },
        down: (db) => {
            db.exec('DROP TABLE IF EXISTS spans');
            db.exec('DROP TABLE IF EXISTS executions');
            db.exec('DROP TABLE IF EXISTS tasks');
        },
    },
    {
        version: 2,
        name: 'add_full_text_search',
        up: (db) => {
            db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS spans_fts USING fts5(
          span_id UNINDEXED,
          name,
          attributes,
          content='spans',
          content_rowid='rowid'
        );
      `);
            db.exec(`
        CREATE TRIGGER IF NOT EXISTS spans_ai AFTER INSERT ON spans BEGIN
          INSERT INTO spans_fts(span_id, name, attributes)
          VALUES (new.span_id, new.name, new.attributes);
        END;
      `);
        },
        down: (db) => {
            db.exec('DROP TRIGGER IF EXISTS spans_ai');
            db.exec('DROP TABLE IF EXISTS spans_fts');
        },
    },
    {
        version: 3,
        name: 'add_skills_materialized_view',
        up: (db) => {
            db.exec(`
        CREATE TABLE IF NOT EXISTS skills_performance_cache (
          skill_name TEXT PRIMARY KEY,
          total_uses INTEGER NOT NULL DEFAULT 0,
          successful_uses INTEGER NOT NULL DEFAULT 0,
          failed_uses INTEGER NOT NULL DEFAULT 0,
          success_rate REAL NOT NULL DEFAULT 0,
          avg_duration_ms REAL NOT NULL DEFAULT 0,
          avg_user_satisfaction REAL,
          last_updated DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
            db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_skills_cache AFTER INSERT ON spans
        WHEN json_extract(new.attributes, '$.skill.name') IS NOT NULL
        BEGIN
          INSERT INTO skills_performance_cache (skill_name, total_uses, successful_uses, failed_uses, success_rate, avg_duration_ms)
          VALUES (
            json_extract(new.attributes, '$.skill.name'),
            1,
            CASE WHEN new.status_code = 'OK' THEN 1 ELSE 0 END,
            CASE WHEN new.status_code = 'ERROR' THEN 1 ELSE 0 END,
            CASE WHEN new.status_code = 'OK' THEN 1.0 ELSE 0.0 END,
            COALESCE(new.duration_ms, 0)
          )
          ON CONFLICT(skill_name) DO UPDATE SET
            total_uses = total_uses + 1,
            successful_uses = successful_uses + CASE WHEN new.status_code = 'OK' THEN 1 ELSE 0 END,
            failed_uses = failed_uses + CASE WHEN new.status_code = 'ERROR' THEN 1 ELSE 0 END,
            success_rate = CAST(successful_uses AS REAL) / total_uses,
            avg_duration_ms = (avg_duration_ms * (total_uses - 1) + COALESCE(new.duration_ms, 0)) / total_uses,
            last_updated = CURRENT_TIMESTAMP;
        END;
      `);
        },
        down: (db) => {
            db.exec('DROP TRIGGER IF EXISTS update_skills_cache');
            db.exec('DROP TABLE IF EXISTS skills_performance_cache');
        },
    },
];
class MigrationManager {
    db;
    constructor(db) {
        this.db = db;
    }
    async initialize() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    }
    getCurrentVersion() {
        const row = this.db
            .prepare('SELECT MAX(version) as version FROM migrations')
            .get();
        return row.version || 0;
    }
    async migrate(targetVersion) {
        const current = this.getCurrentVersion();
        const target = targetVersion || migrations.length;
        logger.info(`📦 Current schema version: ${current}`);
        logger.info(`📦 Target schema version: ${target}`);
        if (current === target) {
            logger.info('✅ Database is up to date');
            return;
        }
        for (let i = current + 1; i <= target; i++) {
            const migration = migrations[i - 1];
            if (!migration)
                break;
            logger.info(`⬆️  Applying migration ${i}: ${migration.name}`);
            try {
                this.db.transaction(() => {
                    migration.up(this.db);
                    this.db
                        .prepare('INSERT INTO migrations (version, name) VALUES (?, ?)')
                        .run(migration.version, migration.name);
                })();
                logger.info(`✅ Migration ${i} applied successfully`);
            }
            catch (error) {
                logger.error(`❌ Migration ${i} failed:`, error);
                throw error;
            }
        }
    }
    async rollback(steps = 1) {
        const current = this.getCurrentVersion();
        for (let i = 0; i < steps; i++) {
            const version = current - i;
            if (version < 1)
                break;
            const migration = migrations[version - 1];
            logger.info(`⬇️  Rolling back migration ${version}: ${migration.name}`);
            this.db.transaction(() => {
                migration.down(this.db);
                this.db.prepare('DELETE FROM migrations WHERE version = ?').run(version);
            })();
            logger.info(`✅ Migration ${version} rolled back`);
        }
    }
}
export class EnhancedSQLiteStore extends SQLiteStore {
    enhancedOptions;
    performanceMetrics;
    backupTimer;
    constructor(options = {}) {
        super({
            dbPath: options.dbPath,
            verbose: options.verbose,
            enableWAL: options.enableWAL,
        });
        this.enhancedOptions = {
            dbPath: options.dbPath || ':memory:',
            verbose: options.verbose || false,
            enableWAL: options.enableWAL !== false,
            enableBackup: options.enableBackup || false,
            backupInterval: options.backupInterval || 60,
            performanceMonitoring: options.performanceMonitoring || false,
        };
        this.performanceMetrics = new Map();
    }
    async initialize() {
        await super.initialize();
        if (this.enhancedOptions.enableBackup && this.enhancedOptions.dbPath !== ':memory:') {
            this.startBackupTimer();
        }
    }
    async close() {
        if (this.backupTimer) {
            clearInterval(this.backupTimer);
        }
        if (this.enhancedOptions.enableBackup) {
            await this.backup();
        }
        if (this.enhancedOptions.performanceMonitoring) {
            this.printPerformanceMetrics();
        }
        this.db.close();
    }
    trackPerformance(operation, fn) {
        if (!this.enhancedOptions.performanceMonitoring) {
            return fn();
        }
        const start = performance.now();
        try {
            return fn();
        }
        finally {
            const duration = performance.now() - start;
            const metric = this.performanceMetrics.get(operation) || { count: 0, totalMs: 0 };
            metric.count++;
            metric.totalMs += duration;
            this.performanceMetrics.set(operation, metric);
        }
    }
    printPerformanceMetrics() {
        logger.info('\n📊 Performance Metrics:');
        logger.info('═'.repeat(80));
        const sorted = Array.from(this.performanceMetrics.entries())
            .sort((a, b) => b[1].totalMs - a[1].totalMs);
        for (const [operation, { count, totalMs }] of sorted) {
            const avg = totalMs / count;
            logger.info(`${operation.padEnd(40)} ${count.toString().padStart(6)} calls  ${avg.toFixed(2).padStart(8)}ms avg  ${totalMs.toFixed(0).padStart(10)}ms total`);
        }
        logger.info('═'.repeat(80));
    }
    startBackupTimer() {
        this.backupTimer = setInterval(() => {
            this.backup().catch((error) => logger.error('Backup failed:', error));
        }, this.enhancedOptions.backupInterval * 60 * 1000);
    }
    async backup() {
        if (this.enhancedOptions.dbPath === ':memory:') {
            throw new OperationError('Cannot backup in-memory database', {
                operation: 'backup',
                component: 'SQLiteStore',
                method: 'backup',
                reason: 'in-memory databases cannot be backed up',
                dbPath: this.enhancedOptions.dbPath,
            });
        }
        const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
        const backupPath = this.enhancedOptions.dbPath + `.backup.${timestamp}.db`;
        return this.trackPerformance('backup', () => {
            this.db.backup(backupPath);
            logger.info(`✅ Backup created: ${backupPath}`);
            return backupPath;
        });
    }
    async restore(backupPath) {
        if (!fs.existsSync(backupPath)) {
            throw new NotFoundError('Backup', backupPath);
        }
        this.db.close();
        fs.copyFileSync(backupPath, this.enhancedOptions.dbPath);
        this.db = SimpleDatabaseFactory.getInstance(this.enhancedOptions.dbPath);
        logger.info(`✅ Database restored from: ${backupPath}`);
    }
    async recordSpan(span) {
        validateSpan(span);
        return this.trackPerformance('recordSpan', () => {
            const stmt = this.db.prepare(`
        INSERT INTO spans (
          span_id, trace_id, parent_span_id, task_id, execution_id,
          name, kind, start_time, end_time, duration_ms,
          status_code, status_message,
          attributes, resource, links, tags, events
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run(span.span_id, span.trace_id, span.parent_span_id || null, span.task_id, span.execution_id, span.name, span.kind, span.start_time, span.end_time || null, span.duration_ms || null, span.status.code, span.status.message || null, JSON.stringify(span.attributes), JSON.stringify(span.resource), span.links ? JSON.stringify(span.links) : null, span.tags ? JSON.stringify(span.tags) : null, span.events ? JSON.stringify(span.events) : null);
        });
    }
    async getSkillPerformance(skillName, timeRange) {
        return this.trackPerformance('getSkillPerformance', () => {
            const cachedRow = this.db
                .prepare('SELECT * FROM skills_performance_cache WHERE skill_name = ?')
                .get(skillName);
            if (cachedRow) {
                const cached = cachedRow;
                const trend7d = this.calculateSkillTrend(skillName, 7);
                const trend30d = this.calculateSkillTrend(skillName, 30);
                return {
                    skill_name: skillName,
                    skill_version: undefined,
                    total_uses: cached.total_uses,
                    successful_uses: cached.successful_uses,
                    failed_uses: cached.failed_uses,
                    success_rate: cached.success_rate,
                    avg_duration_ms: cached.avg_duration_ms,
                    avg_user_satisfaction: cached.avg_user_satisfaction || 0,
                    most_used_with_agent: this.getMostUsedAgent(skillName),
                    most_used_for_task: this.getMostUsedTask(skillName),
                    trend_7d: trend7d,
                    trend_30d: trend30d,
                    period_start: timeRange.start,
                    period_end: timeRange.end,
                };
            }
            const queryRow = this.db.prepare(`
        SELECT
          COUNT(*) as total_uses,
          SUM(CASE WHEN status_code = 'OK' THEN 1 ELSE 0 END) as successful_uses,
          SUM(CASE WHEN status_code = 'ERROR' THEN 1 ELSE 0 END) as failed_uses,
          AVG(duration_ms) as avg_duration_ms
        FROM spans
        WHERE json_extract(attributes, '$.skill.name') = ?
          AND start_time >= ? AND start_time <= ?
      `).get(skillName, timeRange.start.getTime(), timeRange.end.getTime());
            const row = queryRow;
            const total = row.total_uses || 0;
            const successful = row.successful_uses || 0;
            return {
                skill_name: skillName,
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
        });
    }
    calculateSkillTrend(skillName, days) {
        const now = Date.now();
        const periodMs = days * 24 * 60 * 60 * 1000;
        const halfPeriodMs = periodMs / 2;
        const firstHalf = this.db.prepare(`
      SELECT AVG(CASE WHEN status_code = 'OK' THEN 1.0 ELSE 0.0 END) as success_rate
      FROM spans
      WHERE json_extract(attributes, '$.skill.name') = ?
        AND start_time >= ? AND start_time < ?
    `).get(skillName, now - periodMs, now - halfPeriodMs);
        const secondHalf = this.db.prepare(`
      SELECT AVG(CASE WHEN status_code = 'OK' THEN 1.0 ELSE 0.0 END) as success_rate
      FROM spans
      WHERE json_extract(attributes, '$.skill.name') = ?
        AND start_time >= ? AND start_time <= ?
    `).get(skillName, now - halfPeriodMs, now);
        if (!firstHalf.success_rate || !secondHalf.success_rate) {
            return 'stable';
        }
        const diff = secondHalf.success_rate - firstHalf.success_rate;
        if (diff > 0.05)
            return 'improving';
        if (diff < -0.05)
            return 'declining';
        return 'stable';
    }
    getMostUsedAgent(skillName) {
        const row = this.db.prepare(`
      SELECT json_extract(attributes, '$.agent.type') as agent_type, COUNT(*) as count
      FROM spans
      WHERE json_extract(attributes, '$.skill.name') = ?
      GROUP BY agent_type
      ORDER BY count DESC
      LIMIT 1
    `).get(skillName);
        return row?.agent_type;
    }
    getMostUsedTask(skillName) {
        const row = this.db.prepare(`
      SELECT json_extract(attributes, '$.task.type') as task_type, COUNT(*) as count
      FROM spans
      WHERE json_extract(attributes, '$.skill.name') = ?
      GROUP BY task_type
      ORDER BY count DESC
      LIMIT 1
    `).get(skillName);
        return row?.task_type;
    }
    async getSkillRecommendations(filters) {
        return this.trackPerformance('getSkillRecommendations', () => {
            const topN = filters.topN || 5;
            let query = `
        SELECT
          json_extract(attributes, '$.skill.name') as skill_name,
          COUNT(*) as total_uses,
          AVG(CASE WHEN status_code = 'OK' THEN 1.0 ELSE 0.0 END) as success_rate,
          AVG(duration_ms) as avg_duration,
          AVG(json_extract(attributes, '$.execution.quality_score')) as avg_quality
        FROM spans
        WHERE json_extract(attributes, '$.task.type') = ?
          AND json_extract(attributes, '$.skill.name') IS NOT NULL
      `;
            const params = [filters.taskType];
            if (filters.agentType) {
                query += ' AND json_extract(attributes, "$.agent.type") = ?';
                params.push(filters.agentType);
            }
            query += `
        GROUP BY skill_name
        HAVING total_uses >= 3
        ORDER BY success_rate DESC, total_uses DESC
        LIMIT ?
      `;
            params.push(topN);
            const rows = this.db.prepare(query).all(...params);
            return rows.map((rowData) => {
                const row = rowData;
                return {
                    skill_name: row.skill_name,
                    confidence: Math.min(row.success_rate, row.total_uses / 10),
                    reason: `Successfully used ${row.total_uses} times for ${filters.taskType} tasks with ${(row.success_rate * 100).toFixed(1)}% success rate`,
                    evidence: {
                        similar_tasks_count: row.total_uses,
                        avg_success_rate: row.success_rate,
                        avg_user_satisfaction: 0,
                    },
                    expected_outcome: {
                        success_probability: row.success_rate,
                        estimated_duration_ms: row.avg_duration || 0,
                        estimated_quality_score: row.avg_quality || 0,
                    },
                };
            });
        });
    }
    async searchSpansByText(query, limit = 100) {
        return this.trackPerformance('searchSpansByText', () => {
            const stmt = this.db.prepare(`
        SELECT spans.*
        FROM spans
        JOIN spans_fts ON spans.span_id = spans_fts.span_id
        WHERE spans_fts MATCH ?
        LIMIT ?
      `);
            const rows = stmt.all(query, limit);
            return rows.map((row) => this.rowToSpan(row));
        });
    }
}
//# sourceMappingURL=SQLiteStore.enhanced.js.map