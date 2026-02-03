export const SCHEMA_SQL = {
    sqlite: {
        execution_metrics: `
      CREATE TABLE IF NOT EXISTS execution_metrics (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        task_type TEXT NOT NULL,

        success INTEGER NOT NULL,
        duration_ms REAL NOT NULL,
        timestamp DATETIME NOT NULL,

        cost REAL,
        quality_score REAL,
        error_message TEXT,

        config_snapshot TEXT NOT NULL,
        metadata TEXT,

        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_execution_metrics_agent_id ON execution_metrics(agent_id);
      CREATE INDEX IF NOT EXISTS idx_execution_metrics_task_type ON execution_metrics(task_type);
      CREATE INDEX IF NOT EXISTS idx_execution_metrics_timestamp ON execution_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_execution_metrics_success ON execution_metrics(success);
    `,
        patterns: `
      CREATE TABLE IF NOT EXISTS patterns (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('success', 'anti_pattern', 'optimization')),

        confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
        occurrences INTEGER NOT NULL DEFAULT 1,

        pattern_data TEXT NOT NULL,
        source_metric_ids TEXT,

        agent_id TEXT,
        task_type TEXT,

        first_observed DATETIME NOT NULL,
        last_observed DATETIME NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,

        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(type);
      CREATE INDEX IF NOT EXISTS idx_patterns_agent_id ON patterns(agent_id);
      CREATE INDEX IF NOT EXISTS idx_patterns_task_type ON patterns(task_type);
      CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns(confidence);
      CREATE INDEX IF NOT EXISTS idx_patterns_is_active ON patterns(is_active);
    `,
        adaptations: `
      CREATE TABLE IF NOT EXISTS adaptations (
        id TEXT PRIMARY KEY,
        pattern_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('config', 'prompt', 'strategy', 'resource')),

        before_config TEXT NOT NULL,
        after_config TEXT NOT NULL,

        applied_to_agent_id TEXT,
        applied_to_task_type TEXT,
        applied_at DATETIME NOT NULL,

        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        avg_improvement REAL NOT NULL DEFAULT 0,

        is_active INTEGER NOT NULL DEFAULT 1,
        deactivated_at DATETIME,
        deactivation_reason TEXT,

        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (pattern_id) REFERENCES patterns(id)
      );

      CREATE INDEX IF NOT EXISTS idx_adaptations_pattern_id ON adaptations(pattern_id);
      CREATE INDEX IF NOT EXISTS idx_adaptations_agent_id ON adaptations(applied_to_agent_id);
      CREATE INDEX IF NOT EXISTS idx_adaptations_is_active ON adaptations(is_active);
    `,
        evolution_stats: `
      CREATE TABLE IF NOT EXISTS evolution_stats (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,

        period_start DATETIME NOT NULL,
        period_end DATETIME NOT NULL,
        period_type TEXT NOT NULL CHECK(period_type IN ('hourly', 'daily', 'weekly', 'monthly')),

        total_executions INTEGER NOT NULL,
        successful_executions INTEGER NOT NULL,
        failed_executions INTEGER NOT NULL,

        avg_duration_ms REAL NOT NULL,
        avg_cost REAL NOT NULL,
        avg_quality_score REAL NOT NULL,

        patterns_discovered INTEGER NOT NULL DEFAULT 0,
        adaptations_applied INTEGER NOT NULL DEFAULT 0,
        improvement_rate REAL NOT NULL DEFAULT 0,

        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_evolution_stats_agent_id ON evolution_stats(agent_id);
      CREATE INDEX IF NOT EXISTS idx_evolution_stats_period ON evolution_stats(period_start, period_end);
      CREATE INDEX IF NOT EXISTS idx_evolution_stats_period_type ON evolution_stats(period_type);
    `,
    },
    postgresql: {
        execution_metrics: `
      CREATE TABLE IF NOT EXISTS execution_metrics (
        id VARCHAR(255) PRIMARY KEY,
        agent_id VARCHAR(255) NOT NULL,
        task_type VARCHAR(255) NOT NULL,

        success BOOLEAN NOT NULL,
        duration_ms REAL NOT NULL,
        timestamp TIMESTAMP NOT NULL,

        cost REAL,
        quality_score REAL,
        error_message TEXT,

        config_snapshot TEXT NOT NULL,
        metadata TEXT,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_execution_metrics_agent_id ON execution_metrics(agent_id);
      CREATE INDEX IF NOT EXISTS idx_execution_metrics_task_type ON execution_metrics(task_type);
      CREATE INDEX IF NOT EXISTS idx_execution_metrics_timestamp ON execution_metrics(timestamp);
      CREATE INDEX IF NOT EXISTS idx_execution_metrics_success ON execution_metrics(success);
    `,
        patterns: `
      CREATE TYPE pattern_type AS ENUM ('success', 'anti_pattern', 'optimization');

      CREATE TABLE IF NOT EXISTS patterns (
        id VARCHAR(255) PRIMARY KEY,
        type pattern_type NOT NULL,

        confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
        occurrences INTEGER NOT NULL DEFAULT 1,

        pattern_data TEXT NOT NULL,
        source_metric_ids TEXT,

        agent_id VARCHAR(255),
        task_type VARCHAR(255),

        first_observed TIMESTAMP NOT NULL,
        last_observed TIMESTAMP NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(type);
      CREATE INDEX IF NOT EXISTS idx_patterns_agent_id ON patterns(agent_id);
      CREATE INDEX IF NOT EXISTS idx_patterns_task_type ON patterns(task_type);
      CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns(confidence);
      CREATE INDEX IF NOT EXISTS idx_patterns_is_active ON patterns(is_active);
    `,
        adaptations: `
      CREATE TYPE adaptation_type AS ENUM ('config', 'prompt', 'strategy', 'resource');

      CREATE TABLE IF NOT EXISTS adaptations (
        id VARCHAR(255) PRIMARY KEY,
        pattern_id VARCHAR(255) NOT NULL,
        type adaptation_type NOT NULL,

        before_config TEXT NOT NULL,
        after_config TEXT NOT NULL,

        applied_to_agent_id VARCHAR(255),
        applied_to_task_type VARCHAR(255),
        applied_at TIMESTAMP NOT NULL,

        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        avg_improvement REAL NOT NULL DEFAULT 0,

        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        deactivated_at TIMESTAMP,
        deactivation_reason TEXT,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

        FOREIGN KEY (pattern_id) REFERENCES patterns(id)
      );

      CREATE INDEX IF NOT EXISTS idx_adaptations_pattern_id ON adaptations(pattern_id);
      CREATE INDEX IF NOT EXISTS idx_adaptations_agent_id ON adaptations(applied_to_agent_id);
      CREATE INDEX IF NOT EXISTS idx_adaptations_is_active ON adaptations(is_active);
    `,
        evolution_stats: `
      CREATE TYPE period_type AS ENUM ('hourly', 'daily', 'weekly', 'monthly');

      CREATE TABLE IF NOT EXISTS evolution_stats (
        id VARCHAR(255) PRIMARY KEY,
        agent_id VARCHAR(255) NOT NULL,

        period_start TIMESTAMP NOT NULL,
        period_end TIMESTAMP NOT NULL,
        period_type period_type NOT NULL,

        total_executions INTEGER NOT NULL,
        successful_executions INTEGER NOT NULL,
        failed_executions INTEGER NOT NULL,

        avg_duration_ms REAL NOT NULL,
        avg_cost REAL NOT NULL,
        avg_quality_score REAL NOT NULL,

        patterns_discovered INTEGER NOT NULL DEFAULT 0,
        adaptations_applied INTEGER NOT NULL DEFAULT 0,
        improvement_rate REAL NOT NULL DEFAULT 0,

        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_evolution_stats_agent_id ON evolution_stats(agent_id);
      CREATE INDEX IF NOT EXISTS idx_evolution_stats_period ON evolution_stats(period_start, period_end);
      CREATE INDEX IF NOT EXISTS idx_evolution_stats_period_type ON evolution_stats(period_type);
    `,
    },
};
//# sourceMappingURL=schema.js.map