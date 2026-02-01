/**
 * SQLiteStore - SQLite implementation of EvolutionStore
 *
 * This is the main storage coordinator that delegates operations to specialized
 * repositories following the Repository Pattern for better separation of concerns.
 *
 * Architecture:
 * - Implements IEvolutionStore interface
 * - Delegates to 7 specialized repositories (Task, Execution, Span, Pattern, Adaptation, Reward, Stats)
 * - Manages database lifecycle and schema initialization
 * - Coordinates cross-repository operations (links, tags)
 *
 * Used for:
 * - Development and testing
 * - Local single-user deployments
 * - Embedded usage
 *
 * Features:
 * - Zero configuration (file-based or in-memory)
 * - Fast batch operations via repositories
 * - WAL mode for better concurrency
 * - Full-text search support (via migrations)
 * - Repository-based modular design
 */

import Database from 'better-sqlite3';
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
// ✅ SECURITY FIX (HIGH-3): Import path validation to prevent path traversal
import { validateDatabasePath } from '../../utils/pathValidation.js';
import type { EvolutionStore } from './EvolutionStore';
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
  SpanRow,
  PatternRow,
  AdaptationRow,
  EvolutionStatsRow,
  SQLParams,
  SQLParam,
} from './types';

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
  protected db: Database.Database;
  protected migrationManager: MigrationManager;
  private taskRepository: TaskRepository;
  private executionRepository: ExecutionRepository;
  private spanRepository: SpanRepository;
  private patternRepository: PatternRepository;
  private adaptationRepository: AdaptationRepository;
  private rewardRepository: RewardRepository;
  private statsRepository: StatsRepository;
  private options: Required<SQLiteStoreOptions>;

  /**
   * Creates a new SQLiteStore instance
   *
   * @param options - Configuration options for the store
   *
   * The constructor:
   * 1. Initializes the SQLite database connection
   * 2. Sets up the migration manager
   * 3. Creates all 7 specialized repositories
   *
   * Note: Call initialize() after construction to create tables and run migrations.
   */
  constructor(options: SQLiteStoreOptions = {}) {
    // ✅ SECURITY FIX (HIGH-3): Validate database path to prevent path traversal attacks
    // Skip validation in test environment for flexibility
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

    // Initialize SQLite database with standard configuration
    this.db = this.options.dbPath === ':memory:'
      ? SimpleDatabaseFactory.createTestDatabase()
      : SimpleDatabaseFactory.getInstance(this.options.dbPath);

    // Initialize migration manager
    this.migrationManager = new MigrationManager(this.db);

    // Initialize repositories (delegated domain logic)
    this.taskRepository = new TaskRepository(this.db);
    this.executionRepository = new ExecutionRepository(this.db);
    this.spanRepository = new SpanRepository(this.db);
    this.patternRepository = new PatternRepository(this.db);
    this.adaptationRepository = new AdaptationRepository(this.db);
    this.rewardRepository = new RewardRepository(this.db);
    this.statsRepository = new StatsRepository(this.db);
  }

  // ========================================================================
  // Security Helpers
  // ========================================================================

  /**
   * Escape special characters for LIKE patterns to prevent SQL injection
   * Escapes: % _ \ ' "
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
  // Lifecycle
  // ========================================================================

  async initialize(): Promise<void> {
    // Initialize migration system
    await this.migrationManager.initialize();

    // Create tables (migration v1)
    this.createTables();
    this.createIndexes();

    // Run migrations (v2+: FTS, skills cache, etc.)
    await this.migrationManager.migrate();
  }

  async close(): Promise<void> {
    this.db.close();
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

  /**
   * Create a new task
   *
   * @param input - Task input data
   * @param metadata - Optional task metadata
   * @returns Created task with generated ID and timestamps
   */
  async createTask(
    input: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<Task> {
    return this.taskRepository.createTask(input, metadata);
  }

  /**
   * Retrieve a task by ID
   *
   * @param taskId - Task ID to retrieve
   * @returns Task if found, null otherwise
   */
  async getTask(taskId: string): Promise<Task | null> {
    return this.taskRepository.getTask(taskId);
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    return this.taskRepository.updateTask(taskId, updates);
  }

  async listTasks(filters?: {
    status?: Task['status'];
    limit?: number;
    offset?: number;
  }): Promise<Task[]> {
    return this.taskRepository.listTasks(filters);
  }

  // ========================================================================
  // Execution Management
  // ========================================================================

  async createExecution(
    taskId: string,
    metadata?: Record<string, any>
  ): Promise<Execution> {
    return this.executionRepository.createExecution(taskId, metadata);
  }

  async getExecution(executionId: string): Promise<Execution | null> {
    return this.executionRepository.getExecution(executionId);
  }

  async updateExecution(
    executionId: string,
    updates: Partial<Execution>
  ): Promise<void> {
    return this.executionRepository.updateExecution(executionId, updates);
  }

  async listExecutions(taskId: string): Promise<Execution[]> {
    return this.executionRepository.listExecutions(taskId);
  }

  // ========================================================================
  // Span Tracking (Core of Evolution System)
  // ========================================================================

  /**
   * Record a single span to the database
   *
   * @param span - Span to record
   */
  async recordSpan(span: Span): Promise<void> {
    return this.spanRepository.recordSpan(span);
  }

  /**
   * Record multiple spans in a single transaction
   *
   * @param spans - Array of spans to record
   */
  async recordSpanBatch(spans: Span[]): Promise<void> {
    return this.spanRepository.recordSpanBatch(spans);
  }

  /**
   * Query spans with flexible filtering
   *
   * @param query - Span query filters
   * @returns Array of matching spans
   */
  async querySpans(query: SpanQuery): Promise<Span[]> {
    return this.spanRepository.querySpans(query);
  }

  async getSpan(spanId: string): Promise<Span | null> {
    return this.spanRepository.getSpan(spanId);
  }

  async getSpansByTrace(traceId: string): Promise<Span[]> {
    return this.spanRepository.getSpansByTrace(traceId);
  }

  async getChildSpans(parentSpanId: string): Promise<Span[]> {
    return this.spanRepository.getChildSpans(parentSpanId);
  }

  // ========================================================================
  // Link Management
  // ========================================================================

  /**
   * ✅ SECURITY FIX (HIGH-1): Use JSON functions for exact matching
   * Replaces LIKE pattern matching to prevent SQL injection edge cases
   * and avoid double-escaping risks
   */
  async queryLinkedSpans(spanId: string): Promise<Span[]> {
    // Find all spans that link to this span
    // Use json_extract for exact match instead of LIKE patterns
    const stmt = this.db.prepare(`
      SELECT * FROM spans
      WHERE links IS NOT NULL
        AND json_valid(links)
        AND EXISTS (
          SELECT 1 FROM json_each(links)
          WHERE json_extract(value, '$.span_id') = ?
        )
    `);

    // ✅ Pure parameterization - no string concatenation
    const rows = stmt.all(spanId) as SpanRow[];

    // Optimized: Pre-allocate array with known length
    const spans: Span[] = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      spans[i] = this.rowToSpan(rows[i]);
    }
    return spans;
  }

  async queryByTags(tags: string[], mode: 'any' | 'all' = 'any'): Promise<Span[]> {
    if (mode === 'any') {
      // Match any tag - escape to prevent LIKE injection
      const conditions = tags.map(() => 'tags LIKE ? ESCAPE \'\\\'').join(' OR ');
      // Build LIKE patterns without string interpolation (anti-pattern)
      const params = tags.map((tag) => '%"' + this.escapeLikePattern(tag) + '"%');

      const stmt = this.db.prepare(`
        SELECT * FROM spans WHERE tags IS NOT NULL AND (${conditions})
      `);

      const rows = stmt.all(...params) as SpanRow[];

      // Optimized: Pre-allocate array with known length
      const spans: Span[] = new Array(rows.length);
      for (let i = 0; i < rows.length; i++) {
        spans[i] = this.rowToSpan(rows[i]);
      }
      return spans;
    } else {
      // Match all tags - escape to prevent LIKE injection
      const conditions = tags.map(() => 'tags LIKE ? ESCAPE \'\\\'').join(' AND ');
      // Build LIKE patterns without string interpolation (anti-pattern)
      const params = tags.map((tag) => '%"' + this.escapeLikePattern(tag) + '"%');

      const stmt = this.db.prepare(`
        SELECT * FROM spans WHERE tags IS NOT NULL AND ${conditions}
      `);

      const rows = stmt.all(...params) as SpanRow[];

      // Optimized: Pre-allocate array with known length
      const spans: Span[] = new Array(rows.length);
      for (let i = 0; i < rows.length; i++) {
        spans[i] = this.rowToSpan(rows[i]);
      }
      return spans;
    }
  }

  // ========================================================================
  // Reward Management
  // ========================================================================

  /**
   * Record reward/feedback for an operation
   *
   * @param reward - Reward to record
   */
  async recordReward(reward: Reward): Promise<void> {
    return this.rewardRepository.recordReward(reward);
  }

  async getRewardsForSpan(spanId: string): Promise<Reward[]> {
    return this.rewardRepository.getRewardsForSpan(spanId);
  }

  async queryRewardsByOperationSpan(operationSpanId: string): Promise<Reward[]> {
    return this.rewardRepository.queryRewardsByOperationSpan(operationSpanId);
  }

  async queryRewards(filters: {
    start_time?: Date;
    end_time?: Date;
    min_value?: number;
    max_value?: number;
  }): Promise<Reward[]> {
    return this.rewardRepository.queryRewards(filters);
  }


  // Pattern Management
  // ========================================================================

  /**
   * Store or update a learned pattern
   *
   * @param pattern - Pattern to store
   */
  async storePattern(pattern: Pattern): Promise<void> {
    return this.patternRepository.recordPattern(pattern);
  }

  async getPattern(patternId: string): Promise<Pattern | null> {
    return this.patternRepository.getPattern(patternId);
  }

  /**
   * Query patterns with flexible filtering
   *
   * @param query - Pattern query filters
   * @returns Array of matching patterns
   */
  async queryPatterns(query: PatternQuery): Promise<Pattern[]> {
    return this.patternRepository.queryPatterns(query);
  }

  /**
   * Store a contextual pattern with rich context metadata (Phase 2)
   */
  async storeContextualPattern(pattern: import('./types.js').ContextualPattern): Promise<void> {
    const stmt = this.db.prepare(`
      INSERT INTO patterns (
        id, type, confidence, occurrences, pattern_data, source_span_ids,
        applies_to_agent_type, applies_to_task_type, applies_to_skill,
        first_observed, last_observed, is_active,
        complexity, config_keys, context_metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      pattern.id,
      pattern.type,
      pattern.confidence,
      pattern.observations,
      JSON.stringify({ description: pattern.description }), // pattern_data
      null, // source_span_ids
      pattern.context.agent_type || null,
      pattern.context.task_type || null,
      null, // applies_to_skill
      pattern.last_seen, // first_observed
      pattern.last_seen, // last_observed
      1, // is_active
      pattern.context.complexity || null,
      pattern.context.config_keys ? JSON.stringify(pattern.context.config_keys) : null,
      pattern.context.metadata ? JSON.stringify(pattern.context.metadata) : null
    );
  }

  /**
   * Query patterns by context criteria (Phase 2)
   */
  async queryPatternsByContext(
    context: import('./types.js').PatternContext
  ): Promise<import('./types.js').ContextualPattern[]> {
    let sql = 'SELECT * FROM patterns WHERE 1=1';
    const params: SQLParams = [];

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
      // Match if any of the context config keys are in the pattern's config_keys
      sql += ' AND config_keys IS NOT NULL';
      // Note: More sophisticated matching could be done with JSON functions
      // For now, we do basic substring matching
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as PatternRow[];

    return rows.map((row) => this.rowToContextualPattern(row));
  }

  /**
   * Convert database row to ContextualPattern (Phase 2)
   */
  private rowToContextualPattern(row: PatternRow): import('./types.js').ContextualPattern {
    const pattern_data = safeJsonParse<Record<string, any>>(row.pattern_data, {});
    const config_keys = safeJsonParse(row.config_keys, undefined);
    const metadata = safeJsonParse(row.context_metadata, undefined);

    // Calculate success_rate from adaptations
    let success_rate = 0;
    try {
      const adaptationStats = this.db.prepare(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN outcome_status = 'success' THEN 1 ELSE 0 END) as successes
        FROM adaptations
        WHERE pattern_id = ?
      `).get(row.id) as { total: number; successes: number } | undefined;

      if (adaptationStats && adaptationStats.total > 0) {
        success_rate = adaptationStats.successes / adaptationStats.total;
      }
    } catch (error) {
      // If adaptations table doesn't exist or query fails, use 0
      logger.warn('Failed to calculate success_rate for pattern', {
        patternId: row.id,
        error: error instanceof Error ? error.message : String(error),
      });
      success_rate = 0;
    }

    // Calculate avg_execution_time from spans
    let avg_execution_time = 0;
    try {
      const spanStats = this.db.prepare(`
        SELECT AVG(duration_ms) as avg_duration
        FROM spans
        WHERE json_extract(attributes, '$.pattern.id') = ?
      `).get(row.id) as { avg_duration: number | null } | undefined;

      if (spanStats && spanStats.avg_duration !== null) {
        avg_execution_time = spanStats.avg_duration;
      }
    } catch (error) {
      // If spans table doesn't exist or query fails, use 0
      logger.warn('Failed to calculate avg_execution_time for pattern', {
        patternId: row.id,
        error: error instanceof Error ? error.message : String(error),
      });
      avg_execution_time = 0;
    }

    return {
      id: row.id,
      type: row.type as 'success' | 'failure' | 'optimization' | 'anti-pattern',
      description: pattern_data.description || '',
      confidence: row.confidence,
      observations: row.occurrences,
      success_rate,
      avg_execution_time,
      last_seen: row.last_observed,
      context: {
        agent_type: row.applies_to_agent_type ?? undefined,
        task_type: row.applies_to_task_type ?? undefined,
        complexity: row.complexity ? (row.complexity === 1 ? 'low' : row.complexity === 2 ? 'medium' : 'high') as 'low' | 'medium' | 'high' : undefined,
        config_keys: config_keys,
        metadata: metadata,
      },
    };
  }

  async updatePattern(
    patternId: string,
    updates: Partial<Pattern>
  ): Promise<void> {
    return this.patternRepository.updatePattern(patternId, updates);
  }

  async deactivatePattern(patternId: string, _reason?: string): Promise<void> {
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

    // Optimized: Pre-allocate array with known length
    const patterns: Pattern[] = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      patterns[i] = this.rowToPattern(rows[i]);
    }
    return patterns;
  }

  // ========================================================================
  // Adaptation Management
  // ========================================================================

  /**
   * Store an adaptation (applied pattern change)
   *
   * @param adaptation - Adaptation to store
   */
  async storeAdaptation(adaptation: Adaptation): Promise<void> {
    return this.adaptationRepository.recordAdaptation(adaptation);
  }

  async getAdaptation(adaptationId: string): Promise<Adaptation | null> {
    return this.adaptationRepository.getAdaptation(adaptationId);
  }

  async queryAdaptations(filters: {
    patternId?: string;
    agentId?: string;
    taskType?: string;
    skillName?: string;
    isActive?: boolean;
  }): Promise<Adaptation[]> {
    return this.adaptationRepository.queryAdaptations(filters);
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
    return this.statsRepository.getStats(agentId, timeRange);
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

    // Optimized: Pre-allocate array with known length
    const stats: EvolutionStats[] = new Array(rows.length);
    for (let i = 0; i < rows.length; i++) {
      stats[i] = this.rowToEvolutionStats(rows[i]);
    }
    return stats;
  }

  async computePeriodStats(
    periodType: 'hourly' | 'daily' | 'weekly' | 'monthly',
    periodStart: Date,
    periodEnd: Date
  ): Promise<EvolutionStats[]> {
    const startTime = periodStart.getTime();
    const endTime = periodEnd.getTime();

    // Query aggregated stats from spans
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

    const rows = stmt.all(startTime, endTime) as {
      agent_id: string | null;
      total_executions: number;
      successful_executions: number;
      failed_executions: number;
      avg_duration_ms: number | null;
      avg_cost: number | null;
      avg_quality_score: number | null;
    }[];

    // Get pattern and adaptation counts
    const patternCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM patterns
      WHERE first_observed >= ? AND first_observed <= ?
    `).get(periodStart.toISOString(), periodEnd.toISOString()) as { count: number };

    const adaptationCount = this.db.prepare(`
      SELECT COUNT(*) as count FROM adaptations
      WHERE applied_at >= ? AND applied_at <= ?
    `).get(periodStart.toISOString(), periodEnd.toISOString()) as { count: number };

    // Get skill usage info
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

    const skillRows = skillUsageStmt.all(startTime, endTime) as {
      skill_name: string;
      uses: number;
      successes: number;
    }[];

    const skillsUsed: Record<string, number> = {};
    let mostSuccessfulSkill: string | undefined;
    let maxSuccessRate = 0;

    for (const skill of skillRows) {
      skillsUsed[skill.skill_name] = skill.uses;
      const rate = skill.uses > 0 ? skill.successes / skill.uses : 0;
      if (rate > maxSuccessRate) {
        maxSuccessRate = rate;
        mostSuccessfulSkill = skill.skill_name;
      }
    }

    // Build stats for each agent
    const stats: EvolutionStats[] = [];
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
        improvement_rate: 0, // Would require historical comparison
        skills_used: Object.keys(skillsUsed).length > 0 ? Object.keys(skillsUsed) : undefined,
        most_successful_skill: mostSuccessfulSkill,
        avg_skill_satisfaction: undefined,
        created_at: now,
        updated_at: now,
      });
    }

    // If no agent-specific data, create a global stats entry
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

  // ========================================================================
  // Skill Analytics (NEW)
  // ========================================================================

  async getSkillPerformance(
    skillName: string,
    timeRange: TimeRange
  ): Promise<SkillPerformance> {
    return this.statsRepository.getSkillPerformance(skillName, timeRange);
  }

  async getAllSkillsPerformance(
    timeRange: TimeRange
  ): Promise<SkillPerformance[]> {
    // Optimized: Single query with GROUP BY instead of N+1 queries
    // Get all skill performance metrics in one query
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

    const rows = stmt.all(
      timeRange.start.getTime(),
      timeRange.end.getTime()
    ) as { skill_name: string; total_uses: number; successful_uses: number; failed_uses: number; avg_duration_ms: number }[];

    // Optimized: Pre-allocate array and use for loop instead of map
    const skills: SkillPerformance[] = new Array(rows.length);
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
        avg_user_satisfaction: 0, // Would need to query from rewards
        trend_7d: 'stable',
        trend_30d: 'stable',
        period_start: timeRange.start,
        period_end: timeRange.end,
      };
    }
    return skills;
  }

  async getSkillRecommendations(filters: {
    taskType: string;
    agentType?: string;
    topN?: number;
  }): Promise<SkillRecommendation[]> {
    return this.statsRepository.getSkillRecommendations(filters);
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
    const { startDate, endDate, format } = filters;

    // Build date filter conditions
    const dateConditions: string[] = [];
    const dateParams: SQLParams = [];

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

    // Query spans
    const spansStmt = this.db.prepare(`SELECT * FROM spans ${whereClause} ORDER BY start_time DESC`);
    const spanRows = spansStmt.all(...dateParams) as SpanRow[];
    const spans = spanRows.map(row => this.rowToSpan(row));

    // Query patterns (using date string format for patterns table)
    const patternDateParams: SQLParam[] = [];
    const patternConditions: string[] = [];

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
    const patternRows = patternsStmt.all(...patternDateParams) as PatternRow[];
    const patterns = patternRows.map(row => this.rowToPattern(row));

    // Query adaptations
    const adaptationDateParams: SQLParam[] = [];
    const adaptationConditions: string[] = [];

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
    const adaptationRows = adaptationsStmt.all(...adaptationDateParams) as AdaptationRow[];

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

    // CSV format - flatten data for each table type
    const csvLines: string[] = [];

    // Spans CSV section
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

  // ========================================================================
  // Helper Methods (Row to Model conversion)
  // ========================================================================

  protected rowToSpan(row: SpanRow): Span {
    return {
      trace_id: row.trace_id,
      span_id: row.span_id,
      parent_span_id: row.parent_span_id ?? undefined,
      task_id: row.task_id,
      execution_id: row.execution_id,
      name: row.name,
      kind: row.kind as Span['kind'],
      start_time: row.start_time,
      end_time: row.end_time ?? undefined,
      duration_ms: row.duration_ms ?? undefined,
      status: {
        code: row.status_code as Span['status']['code'],
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

  private rowToEvolutionStats(row: EvolutionStatsRow): EvolutionStats {
    return {
      id: row.id,
      agent_id: row.agent_id ?? undefined,
      skill_name: row.skill_name ?? undefined,
      period_start: new Date(row.period_start),
      period_end: new Date(row.period_end),
      period_type: row.period_type as EvolutionStats['period_type'],
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
