/**
 * @deprecated This file has been moved to deprecated/ folder.
 *
 * Use `../SQLiteStore.ts` instead - it's refactored with repository pattern.
 *
 * This basic version is NOT refactored and kept only for reference.
 * All new code should use the main SQLiteStore which delegates to specialized repositories.
 *
 * SQLiteStore - SQLite implementation of EvolutionStore
 *
 * Used for:
 * - Development and testing
 * - Local single-user deployments
 * - Embedded usage
 *
 * Features:
 * - Zero configuration (file-based or in-memory)
 * - Fast batch operations
 * - WAL mode for better concurrency
 * - Full-text search support
 */

import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import { SimpleDatabaseFactory } from '../../../config/simple-config.js';
import type { EvolutionStore } from '../EvolutionStore';
import { ValidationError } from '../../../errors/index.js';
import {
  validateSpan,
  validatePattern,
  validateAdaptation,
  validateReward,
} from '../validation';
import { safeJsonParse } from '../../../utils/json.js';
import type {
  Task,
  Execution,
  Span,
  Pattern,
  PatternData,
  Adaptation,
  EvolutionStats,
  Reward,
  SpanQuery,
  PatternQuery,
  TimeRange,
  SkillPerformance,
  SkillRecommendation,
  TaskRow,
  ExecutionRow,
  SpanRow,
  PatternRow,
  AdaptationRow,
  RewardRow,
  EvolutionStatsRow,
  SQLParam,
  SQLParams,
} from '../types';

export interface SQLiteStoreOptions {
  /**
   * Path to SQLite database file
   * Use ':memory:' for in-memory database (testing)
   */
  dbPath?: string;

  /**
   * Enable verbose logging
   */
  verbose?: boolean;

  /**
   * Enable WAL mode (better concurrency)
   */
  enableWAL?: boolean;
}

export class SQLiteStore implements EvolutionStore {
  private db: Database.Database;
  private options: Required<SQLiteStoreOptions>;

  // SQL injection protection - whitelist for sort columns
  private static readonly ALLOWED_SORT_COLUMNS = [
    'start_time', 'duration_ms', 'status_code', 'name', 'kind',
    'end_time', 'span_id', 'trace_id', 'task_id', 'execution_id'
  ];
  private static readonly ALLOWED_PATTERN_SORT_COLUMNS = [
    'confidence', 'occurrences', 'last_observed', 'created_at',
    'updated_at', 'first_observed', 'type', 'id'
  ];
  private static readonly ALLOWED_SORT_ORDERS = ['ASC', 'DESC'];

  constructor(options: SQLiteStoreOptions = {}) {
    this.options = {
      dbPath: options.dbPath || ':memory:',
      verbose: options.verbose || false,
      enableWAL: options.enableWAL !== false,
    };

    // Initialize SQLite database with standard configuration
    this.db = this.options.dbPath === ':memory:'
      ? SimpleDatabaseFactory.createTestDatabase()
      : SimpleDatabaseFactory.getInstance(this.options.dbPath);
  }

  // ========================================================================
  // Lifecycle
  // ========================================================================

  async initialize(): Promise<void> {
    this.createTables();
    this.createIndexes();
  }

  async close(): Promise<void> {
    this.db.close();
  }

  // ========================================================================
  // Security Utilities
  // ========================================================================

  /**
   * Escape special characters in LIKE patterns to prevent SQL injection
   */
  private escapeLikePattern(pattern: string): string {
    return pattern
      .replace(/\\/g, '\\\\')  // Backslash must be first
      .replace(/%/g, '\\%')
      .replace(/_/g, '\\_')
      .replace(/'/g, "''")      // SQL escape for single quote
      .replace(/"/g, '""');     // SQL escape for double quote
  }

  // ========================================================================
  // Schema Creation
  // ========================================================================

  private createTables(): void {
    // Tasks table
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

    // Executions table
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

    // Spans table (OpenTelemetry-style)
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

    // Patterns table
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

    // Adaptations table
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

    // Rewards table (for delayed feedback)
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

    // Evolution stats table
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

  private createIndexes(): void {
    // Task indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_tasks_task_type ON tasks(task_type);
      CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
    `);

    // Execution indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_executions_task_id ON executions(task_id);
      CREATE INDEX IF NOT EXISTS idx_executions_agent_id ON executions(agent_id);
      CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
    `);

    // Span indexes (critical for query performance)
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON spans(trace_id);
      CREATE INDEX IF NOT EXISTS idx_spans_task_id ON spans(task_id);
      CREATE INDEX IF NOT EXISTS idx_spans_execution_id ON spans(execution_id);
      CREATE INDEX IF NOT EXISTS idx_spans_parent_span_id ON spans(parent_span_id);
      CREATE INDEX IF NOT EXISTS idx_spans_start_time ON spans(start_time);
      CREATE INDEX IF NOT EXISTS idx_spans_status_code ON spans(status_code);
    `);

    // Pattern indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(type);
      CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns(confidence);
      CREATE INDEX IF NOT EXISTS idx_patterns_agent_type ON patterns(applies_to_agent_type);
      CREATE INDEX IF NOT EXISTS idx_patterns_task_type ON patterns(applies_to_task_type);
      CREATE INDEX IF NOT EXISTS idx_patterns_skill ON patterns(applies_to_skill);
      CREATE INDEX IF NOT EXISTS idx_patterns_is_active ON patterns(is_active);
    `);

    // Adaptation indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_adaptations_pattern_id ON adaptations(pattern_id);
      CREATE INDEX IF NOT EXISTS idx_adaptations_agent_id ON adaptations(applied_to_agent_id);
      CREATE INDEX IF NOT EXISTS idx_adaptations_skill ON adaptations(applied_to_skill);
      CREATE INDEX IF NOT EXISTS idx_adaptations_is_active ON adaptations(is_active);
    `);

    // Reward indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_rewards_operation_span_id ON rewards(operation_span_id);
      CREATE INDEX IF NOT EXISTS idx_rewards_provided_at ON rewards(provided_at);
    `);

    // Stats indexes
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_stats_agent_id ON evolution_stats(agent_id);
      CREATE INDEX IF NOT EXISTS idx_stats_skill_name ON evolution_stats(skill_name);
      CREATE INDEX IF NOT EXISTS idx_stats_period ON evolution_stats(period_start, period_end);
      CREATE INDEX IF NOT EXISTS idx_stats_period_type ON evolution_stats(period_type);
    `);
  }

  // ========================================================================
  // Task Management
  // ========================================================================

  async createTask(
    input: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<Task> {
    const task: Task = {
      id: uuid(),
      input,
      status: 'pending',
      created_at: new Date(),
      metadata,
    };

    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, input, status, created_at, metadata)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      task.id,
      JSON.stringify(task.input),
      task.status,
      task.created_at.toISOString(),
      task.metadata ? JSON.stringify(task.metadata) : null
    );

    return task;
  }

  async getTask(taskId: string): Promise<Task | null> {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks WHERE id = ?
    `);

    const row = stmt.get(taskId) as TaskRow | undefined;
    if (!row) return null;

    return this.rowToTask(row);
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    const fields: string[] = [];
    const values: SQLParam[] = [];

    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (updates.started_at) {
      fields.push('started_at = ?');
      values.push(updates.started_at.toISOString());
    }

    if (updates.completed_at) {
      fields.push('completed_at = ?');
      values.push(updates.completed_at.toISOString());
    }

    if (fields.length === 0) return;

    values.push(taskId);

    const stmt = this.db.prepare(`
      UPDATE tasks SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
  }

  async listTasks(filters?: {
    status?: Task['status'];
    limit?: number;
    offset?: number;
  }): Promise<Task[]> {
    let query = 'SELECT * FROM tasks';
    const params: SQLParams = [];

    if (filters?.status) {
      query += ' WHERE status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY created_at DESC';

    if (filters?.limit) {
      query += ' LIMIT ?';
      params.push(filters.limit);
    }

    if (filters?.offset) {
      query += ' OFFSET ?';
      params.push(filters.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as TaskRow[];

    return rows.map((row) => this.rowToTask(row));
  }

  // ========================================================================
  // Execution Management
  // ========================================================================

  async createExecution(
    taskId: string,
    metadata?: Record<string, any>
  ): Promise<Execution> {
    // Get current attempt count
    const countStmt = this.db.prepare(
      'SELECT COUNT(*) as count FROM executions WHERE task_id = ?'
    );
    const { count } = countStmt.get(taskId) as { count: number };

    const execution: Execution = {
      id: uuid(),
      task_id: taskId,
      attempt_number: count + 1,
      status: 'running',
      started_at: new Date(),
      metadata,
    };

    const stmt = this.db.prepare(`
      INSERT INTO executions (id, task_id, attempt_number, status, started_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      execution.id,
      execution.task_id,
      execution.attempt_number,
      execution.status,
      execution.started_at.toISOString(),
      execution.metadata ? JSON.stringify(execution.metadata) : null
    );

    return execution;
  }

  async getExecution(executionId: string): Promise<Execution | null> {
    const stmt = this.db.prepare('SELECT * FROM executions WHERE id = ?');
    const row = stmt.get(executionId) as ExecutionRow | undefined;
    if (!row) return null;

    return this.rowToExecution(row);
  }

  async updateExecution(
    executionId: string,
    updates: Partial<Execution>
  ): Promise<void> {
    const fields: string[] = [];
    const values: SQLParam[] = [];

    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (updates.completed_at) {
      fields.push('completed_at = ?');
      values.push(updates.completed_at.toISOString());
    }

    if (updates.result) {
      fields.push('result = ?');
      values.push(JSON.stringify(updates.result));
    }

    if (updates.error) {
      fields.push('error = ?');
      values.push(updates.error);
    }

    if (fields.length === 0) return;

    values.push(executionId);

    const stmt = this.db.prepare(`
      UPDATE executions SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
  }

  async listExecutions(taskId: string): Promise<Execution[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM executions WHERE task_id = ? ORDER BY attempt_number ASC
    `);

    const rows = stmt.all(taskId) as ExecutionRow[];
    return rows.map((row) => this.rowToExecution(row));
  }

  // ========================================================================
  // Span Tracking (Core of Evolution System)
  // ========================================================================

  async recordSpan(span: Span): Promise<void> {
    // Validate span before inserting
    validateSpan(span);

    const stmt = this.db.prepare(`
      INSERT INTO spans (
        span_id, trace_id, parent_span_id, task_id, execution_id,
        name, kind, start_time, end_time, duration_ms,
        status_code, status_message,
        attributes, resource, links, tags, events
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      span.span_id,
      span.trace_id,
      span.parent_span_id || null,
      span.task_id,
      span.execution_id,
      span.name,
      span.kind,
      span.start_time,
      span.end_time || null,
      span.duration_ms || null,
      span.status.code,
      span.status.message || null,
      JSON.stringify(span.attributes),
      JSON.stringify(span.resource),
      span.links ? JSON.stringify(span.links) : null,
      span.tags ? JSON.stringify(span.tags) : null,
      span.events ? JSON.stringify(span.events) : null
    );
  }

  async recordSpanBatch(spans: Span[]): Promise<void> {
    const insertMany = this.db.transaction((spans: Span[]) => {
      for (const span of spans) {
        this.recordSpan(span);
      }
    });

    insertMany(spans);
  }

  async querySpans(query: SpanQuery): Promise<Span[]> {
    let sql = 'SELECT * FROM spans WHERE 1=1';
    const params: SQLParams = [];

    // Identity filters
    if (query.task_id) {
      sql += ' AND task_id = ?';
      params.push(query.task_id);
    }

    if (query.execution_id) {
      sql += ' AND execution_id = ?';
      params.push(query.execution_id);
    }

    if (query.trace_id) {
      sql += ' AND trace_id = ?';
      params.push(query.trace_id);
    }

    if (query.span_id) {
      sql += ' AND span_id = ?';
      params.push(query.span_id);
    }

    // Status filters
    if (query.status_code) {
      sql += ' AND status_code = ?';
      params.push(query.status_code);
    }

    // Time filters
    if (query.start_time_gte) {
      sql += ' AND start_time >= ?';
      params.push(query.start_time_gte);
    }

    if (query.start_time_lte) {
      sql += ' AND start_time <= ?';
      params.push(query.start_time_lte);
    }

    if (query.end_time_gte) {
      sql += ' AND end_time >= ?';
      params.push(query.end_time_gte);
    }

    if (query.end_time_lte) {
      sql += ' AND end_time <= ?';
      params.push(query.end_time_lte);
    }

    // Sorting - SQL injection protection
    if (query.sort_by) {
      if (!SQLiteStore.ALLOWED_SORT_COLUMNS.includes(query.sort_by)) {
        throw new ValidationError(
          `Invalid sort column: ${query.sort_by}. Allowed: ${SQLiteStore.ALLOWED_SORT_COLUMNS.join(', ')}`,
          {
            component: 'SQLiteStore',
            method: 'querySpans',
            providedValue: query.sort_by,
            allowedValues: SQLiteStore.ALLOWED_SORT_COLUMNS,
            constraint: 'sort_by must be one of allowed columns',
          }
        );
      }
      sql += ` ORDER BY ${query.sort_by}`;

      if (query.sort_order) {
        const upperOrder = query.sort_order.toUpperCase();
        if (!SQLiteStore.ALLOWED_SORT_ORDERS.includes(upperOrder)) {
          throw new ValidationError(
            `Invalid sort order: ${query.sort_order}. Allowed: ASC, DESC`,
            {
              component: 'SQLiteStore',
              method: 'querySpans',
              providedValue: query.sort_order,
              allowedValues: SQLiteStore.ALLOWED_SORT_ORDERS,
              constraint: 'sort_order must be ASC or DESC',
            }
          );
        }
        sql += ` ${upperOrder}`;
      }
    } else {
      sql += ' ORDER BY start_time DESC';
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
    const rows = stmt.all(...params) as SpanRow[];

    return rows.map((row) => this.rowToSpan(row));
  }

  async getSpan(spanId: string): Promise<Span | null> {
    const stmt = this.db.prepare('SELECT * FROM spans WHERE span_id = ?');
    const row = stmt.get(spanId) as SpanRow | undefined;
    if (!row) return null;

    return this.rowToSpan(row);
  }

  async getSpansByTrace(traceId: string): Promise<Span[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM spans WHERE trace_id = ? ORDER BY start_time ASC'
    );
    const rows = stmt.all(traceId) as SpanRow[];
    return rows.map((row) => this.rowToSpan(row));
  }

  async getChildSpans(parentSpanId: string): Promise<Span[]> {
    const stmt = this.db.prepare(
      'SELECT * FROM spans WHERE parent_span_id = ? ORDER BY start_time ASC'
    );
    const rows = stmt.all(parentSpanId) as SpanRow[];
    return rows.map((row) => this.rowToSpan(row));
  }

  // ========================================================================
  // Link Management
  // ========================================================================

  async queryLinkedSpans(spanId: string): Promise<Span[]> {
    // Find all spans that link to this span
    const stmt = this.db.prepare(`
      SELECT * FROM spans WHERE links IS NOT NULL AND links LIKE ?
    `);

    const escapedSpanId = this.escapeLikePattern(spanId);
    const rows = stmt.all(`%"span_id":"${escapedSpanId}"%`) as SpanRow[];
    return rows.map((row) => this.rowToSpan(row));
  }

  async queryByTags(tags: string[], mode: 'any' | 'all' = 'any'): Promise<Span[]> {
    if (mode === 'any') {
      // Match any tag
      const conditions = tags.map(() => 'tags LIKE ?').join(' OR ');
      const params = tags.map((tag) => `%"${this.escapeLikePattern(tag)}"%`);

      const stmt = this.db.prepare(`
        SELECT * FROM spans WHERE tags IS NOT NULL AND (${conditions})
      `);

      const rows = stmt.all(...params) as SpanRow[];
      return rows.map((row) => this.rowToSpan(row));
    } else {
      // Match all tags
      const conditions = tags.map(() => 'tags LIKE ?').join(' AND ');
      const params = tags.map((tag) => `%"${this.escapeLikePattern(tag)}"%`);

      const stmt = this.db.prepare(`
        SELECT * FROM spans WHERE tags IS NOT NULL AND ${conditions}
      `);

      const rows = stmt.all(...params) as SpanRow[];
      return rows.map((row) => this.rowToSpan(row));
    }
  }

  // ========================================================================
  // Reward Management
  // ========================================================================

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

  async getRewardsForSpan(spanId: string): Promise<Reward[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM rewards WHERE operation_span_id = ? ORDER BY provided_at ASC
    `);

    const rows = stmt.all(spanId) as RewardRow[];
    return rows.map((row) => this.rowToReward(row));
  }

  async queryRewardsByOperationSpan(operationSpanId: string): Promise<Reward[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM rewards WHERE operation_span_id = ? ORDER BY provided_at DESC
    `);

    const rows = stmt.all(operationSpanId) as RewardRow[];
    return rows.map((row) => this.rowToReward(row));
  }

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

    return rows.map((row) => this.rowToReward(row));
  }

  // ========================================================================
  // Pattern Management
  // ========================================================================

  async storePattern(pattern: Pattern): Promise<void> {
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

  async getPattern(patternId: string): Promise<Pattern | null> {
    const stmt = this.db.prepare('SELECT * FROM patterns WHERE id = ?');
    const row = stmt.get(patternId) as PatternRow | undefined;
    if (!row) return null;

    return this.rowToPattern(row);
  }

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

    // Sorting - SQL injection protection
    if (query.sort_by) {
      if (!SQLiteStore.ALLOWED_PATTERN_SORT_COLUMNS.includes(query.sort_by)) {
        throw new ValidationError(
          `Invalid sort column: ${query.sort_by}. Allowed: ${SQLiteStore.ALLOWED_PATTERN_SORT_COLUMNS.join(', ')}`,
          {
            component: 'SQLiteStore',
            method: 'searchContextualPatterns',
            providedValue: query.sort_by,
            allowedValues: SQLiteStore.ALLOWED_PATTERN_SORT_COLUMNS,
            constraint: 'sort_by must be one of allowed pattern columns',
          }
        );
      }
      sql += ` ORDER BY ${query.sort_by}`;

      if (query.sort_order) {
        const upperOrder = query.sort_order.toUpperCase();
        if (!SQLiteStore.ALLOWED_SORT_ORDERS.includes(upperOrder)) {
          throw new ValidationError(
            `Invalid sort order: ${query.sort_order}. Allowed: ASC, DESC`,
            {
              component: 'SQLiteStore',
              method: 'searchContextualPatterns',
              providedValue: query.sort_order,
              allowedValues: SQLiteStore.ALLOWED_SORT_ORDERS,
              constraint: 'sort_order must be ASC or DESC',
            }
          );
        }
        sql += ` ${upperOrder}`;
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

    return rows.map((row) => this.rowToPattern(row));
  }

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

  async deactivatePattern(patternId: string, reason?: string): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE patterns SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `);

    stmt.run(patternId);
  }

  async getActivePatternsFor(filters: {
    agentType?: string;
    taskType?: string;
    skillName?: string;
  }): Promise<Pattern[]> {
    let sql = 'SELECT * FROM patterns WHERE is_active = 1';
    const params: SQLParams = [];

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
    const rows = stmt.all(...params) as PatternRow[];

    return rows.map((row) => this.rowToPattern(row));
  }

  // ========================================================================
  // Adaptation Management
  // ========================================================================

  async storeAdaptation(adaptation: Adaptation): Promise<void> {
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

    return rows.map((row) => this.rowToAdaptation(row));
  }

  async updateAdaptationOutcome(
    adaptationId: string,
    outcome: { success: boolean; improvement?: number }
  ): Promise<void> {
    // Get current counts
    const adaptation = await this.getAdaptation(adaptationId);
    if (!adaptation) return;

    const newSuccessCount = outcome.success
      ? adaptation.success_count + 1
      : adaptation.success_count;
    const newFailureCount = !outcome.success
      ? adaptation.failure_count + 1
      : adaptation.failure_count;

    // Calculate new average improvement
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

  async deactivateAdaptation(
    adaptationId: string,
    reason?: string
  ): Promise<void> {
    const stmt = this.db.prepare(`
      UPDATE adaptations
      SET is_active = 0, deactivated_at = CURRENT_TIMESTAMP, deactivation_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(reason || null, adaptationId);
  }

  // ========================================================================
  // Statistics & Analytics
  // ========================================================================

  async getStats(agentId: string, timeRange: TimeRange): Promise<EvolutionStats> {
    // This is a placeholder - real implementation would compute from spans
    const stmt = this.db.prepare(`
      SELECT * FROM evolution_stats
      WHERE agent_id = ? AND period_start >= ? AND period_end <= ?
      ORDER BY period_start DESC LIMIT 1
    `);

    const row = stmt.get(
      agentId,
      timeRange.start.toISOString(),
      timeRange.end.toISOString()
    ) as EvolutionStatsRow | undefined;

    if (row) {
      return this.rowToEvolutionStats(row);
    }

    // Return empty stats if no data
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

  async getAllStats(timeRange: TimeRange): Promise<EvolutionStats[]> {
    const stmt = this.db.prepare(`
      SELECT * FROM evolution_stats
      WHERE period_start >= ? AND period_end <= ?
      ORDER BY period_start DESC
    `);

    const rows = stmt.all(
      timeRange.start.toISOString(),
      timeRange.end.toISOString()
    ) as EvolutionStatsRow[];

    return rows.map((row) => this.rowToEvolutionStats(row));
  }

  async computePeriodStats(
    periodType: 'hourly' | 'daily' | 'weekly' | 'monthly',
    periodStart: Date,
    periodEnd: Date
  ): Promise<EvolutionStats[]> {
    // This would involve complex aggregation queries
    // Placeholder for now
    return [];
  }

  // ========================================================================
  // Skill Analytics (NEW)
  // ========================================================================

  async getSkillPerformance(
    skillName: string,
    timeRange: TimeRange
  ): Promise<SkillPerformance> {
    // Query spans with skill.name attribute
    const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total_uses,
        SUM(CASE WHEN status_code = 'OK' THEN 1 ELSE 0 END) as successful_uses,
        SUM(CASE WHEN status_code = 'ERROR' THEN 1 ELSE 0 END) as failed_uses,
        AVG(duration_ms) as avg_duration_ms
      FROM spans
      WHERE json_extract(attributes, '$.skill.name') = ?
        AND start_time >= ? AND start_time <= ?
    `);

    const row = stmt.get(
      skillName,
      timeRange.start.getTime(),
      timeRange.end.getTime()
    ) as { total_uses: number; successful_uses: number; failed_uses: number; avg_duration_ms: number } | undefined;

    const total = row?.total_uses || 0;
    const successful = row?.successful_uses || 0;

    return {
      skill_name: skillName,
      total_uses: total,
      successful_uses: successful,
      failed_uses: row?.failed_uses || 0,
      success_rate: total > 0 ? successful / total : 0,
      avg_duration_ms: row?.avg_duration_ms || 0,
      avg_user_satisfaction: 0, // Would need to query from rewards
      trend_7d: 'stable',
      trend_30d: 'stable',
      period_start: timeRange.start,
      period_end: timeRange.end,
    };
  }

  async getAllSkillsPerformance(
    timeRange: TimeRange
  ): Promise<SkillPerformance[]> {
    // Get distinct skill names
    const skillsStmt = this.db.prepare(`
      SELECT DISTINCT json_extract(attributes, '$.skill.name') as skill_name
      FROM spans
      WHERE json_extract(attributes, '$.skill.name') IS NOT NULL
        AND start_time >= ? AND start_time <= ?
    `);

    const skills = skillsStmt.all(
      timeRange.start.getTime(),
      timeRange.end.getTime()
    ) as { skill_name: string }[];

    // Get performance for each skill
    const performances = await Promise.all(
      skills.map((s) => this.getSkillPerformance(s.skill_name, timeRange))
    );

    return performances.sort((a, b) => b.total_uses - a.total_uses);
  }

  async getSkillRecommendations(filters: {
    taskType: string;
    agentType?: string;
    topN?: number;
  }): Promise<SkillRecommendation[]> {
    // This would analyze historical success patterns
    // Placeholder for now
    return [];
  }

  async recordSkillFeedback(
    spanId: string,
    feedback: { satisfaction: number; comment?: string }
  ): Promise<void> {
    // Store as reward
    const reward: Reward = {
      id: uuid(),
      operation_span_id: spanId,
      value: feedback.satisfaction / 5, // Normalize to 0-1
      dimensions: {
        user_satisfaction: feedback.satisfaction,
      },
      feedback: feedback.comment,
      feedback_type: 'user',
      provided_at: new Date(),
    };

    await this.recordReward(reward);
  }

  // ========================================================================
  // Utility Methods
  // ========================================================================

  async getDatabaseStats(): Promise<{
    total_tasks: number;
    total_executions: number;
    total_spans: number;
    total_patterns: number;
    total_adaptations: number;
    database_size_bytes?: number;
  }> {
    const tasksCount = this.db
      .prepare('SELECT COUNT(*) as count FROM tasks')
      .get() as { count: number };
    const executionsCount = this.db
      .prepare('SELECT COUNT(*) as count FROM executions')
      .get() as { count: number };
    const spansCount = this.db
      .prepare('SELECT COUNT(*) as count FROM spans')
      .get() as { count: number };
    const patternsCount = this.db
      .prepare('SELECT COUNT(*) as count FROM patterns')
      .get() as { count: number };
    const adaptationsCount = this.db
      .prepare('SELECT COUNT(*) as count FROM adaptations')
      .get() as { count: number };

    return {
      total_tasks: tasksCount.count,
      total_executions: executionsCount.count,
      total_spans: spansCount.count,
      total_patterns: patternsCount.count,
      total_adaptations: adaptationsCount.count,
    };
  }

  async optimize(): Promise<void> {
    this.db.pragma('optimize');
    this.db.exec('VACUUM');
  }

  async exportData(filters: {
    startDate?: Date;
    endDate?: Date;
    format: 'json' | 'csv';
  }): Promise<string> {
    // Export functionality - would export spans, patterns, etc.
    // Placeholder for now
    return JSON.stringify({ message: 'Export not yet implemented' });
  }

  // ========================================================================
  // Helper Methods (Row to Model conversion)
  // ========================================================================

  private rowToTask(row: TaskRow): Task {
    return {
      id: row.id,
      input: safeJsonParse(row.input, {}),
      task_type: row.task_type ?? undefined,
      origin: row.origin ?? undefined,
      status: row.status as 'pending' | 'running' | 'completed' | 'failed',
      created_at: new Date(row.created_at),
      started_at: row.started_at ? new Date(row.started_at) : undefined,
      completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
      metadata: safeJsonParse(row.metadata, undefined),
    };
  }

  private rowToExecution(row: ExecutionRow): Execution {
    return {
      id: row.id,
      task_id: row.task_id,
      attempt_number: row.attempt_number,
      agent_id: row.agent_id ?? undefined,
      agent_type: row.agent_type ?? undefined,
      status: row.status as 'running' | 'completed' | 'failed',
      started_at: new Date(row.started_at),
      completed_at: row.completed_at ? new Date(row.completed_at) : undefined,
      result: safeJsonParse(row.result, undefined),
      error: row.error ?? undefined,
      metadata: safeJsonParse(row.metadata, undefined),
    };
  }

  private rowToSpan(row: SpanRow): Span {
    return {
      trace_id: row.trace_id,
      span_id: row.span_id,
      parent_span_id: row.parent_span_id ?? undefined,
      task_id: row.task_id,
      execution_id: row.execution_id,
      name: row.name,
      kind: row.kind as 'internal' | 'client' | 'server' | 'producer' | 'consumer',
      start_time: row.start_time,
      end_time: row.end_time ?? undefined,
      duration_ms: row.duration_ms ?? undefined,
      status: {
        code: row.status_code as 'OK' | 'ERROR' | 'UNSET',
        message: row.status_message ?? undefined,
      },
      attributes: safeJsonParse(row.attributes, {}),
      resource: safeJsonParse(row.resource, { 'task.id': '', 'execution.id': '', 'execution.attempt': 0 }),
      links: safeJsonParse(row.links, undefined),
      tags: safeJsonParse(row.tags, undefined),
      events: safeJsonParse(row.events, undefined),
    };
  }

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

  private rowToAdaptation(row: AdaptationRow): Adaptation {
    return {
      id: row.id,
      pattern_id: row.pattern_id,
      type: row.type as 'config' | 'prompt' | 'strategy' | 'resource' | 'skill',
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

  private rowToReward(row: RewardRow): Reward {
    return {
      id: row.id,
      operation_span_id: row.operation_span_id,
      value: row.value,
      dimensions: safeJsonParse(row.dimensions, undefined),
      feedback: row.feedback ?? undefined,
      feedback_type: row.feedback_type as 'user' | 'automated' | 'expert' | undefined,
      provided_by: row.provided_by ?? undefined,
      provided_at: new Date(row.provided_at),
      metadata: safeJsonParse(row.metadata, undefined),
    };
  }

  private rowToEvolutionStats(row: EvolutionStatsRow): EvolutionStats {
    return {
      id: row.id,
      agent_id: row.agent_id ?? undefined,
      skill_name: row.skill_name ?? undefined,
      period_start: new Date(row.period_start),
      period_end: new Date(row.period_end),
      period_type: row.period_type as 'hourly' | 'daily' | 'weekly' | 'monthly',
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
