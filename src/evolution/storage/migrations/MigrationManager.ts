/**
 * Migration Manager - Handles database schema versioning
 */

import type Database from 'better-sqlite3';

export interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
  down: (db: Database.Database) => void;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: (db) => {
      // Tables created by SQLiteStore.createTables()
      // This migration is a no-op since tables are already created
    },
    down: (db) => {
      db.exec('DROP TABLE IF EXISTS evolution_stats');
      db.exec('DROP TABLE IF EXISTS rewards');
      db.exec('DROP TABLE IF EXISTS adaptations');
      db.exec('DROP TABLE IF EXISTS patterns');
      db.exec('DROP TABLE IF EXISTS spans');
      db.exec('DROP TABLE IF EXISTS executions');
      db.exec('DROP TABLE IF EXISTS tasks');
    },
  },
  {
    version: 2,
    name: 'add_full_text_search',
    up: (db) => {
      // Add FTS5 virtual table for span attributes
      db.exec(`
        CREATE VIRTUAL TABLE IF NOT EXISTS spans_fts USING fts5(
          span_id UNINDEXED,
          name,
          attributes,
          content='spans',
          content_rowid='rowid'
        );
      `);

      // Triggers to keep FTS in sync
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS spans_fts_insert AFTER INSERT ON spans BEGIN
          INSERT INTO spans_fts(rowid, span_id, name, attributes)
          VALUES (new.rowid, new.span_id, new.name, new.attributes);
        END;
      `);

      db.exec(`
        CREATE TRIGGER IF NOT EXISTS spans_fts_delete AFTER DELETE ON spans BEGIN
          DELETE FROM spans_fts WHERE rowid = old.rowid;
        END;
      `);

      db.exec(`
        CREATE TRIGGER IF NOT EXISTS spans_fts_update AFTER UPDATE ON spans BEGIN
          DELETE FROM spans_fts WHERE rowid = old.rowid;
          INSERT INTO spans_fts(rowid, span_id, name, attributes)
          VALUES (new.rowid, new.span_id, new.name, new.attributes);
        END;
      `);
    },
    down: (db) => {
      db.exec('DROP TRIGGER IF EXISTS spans_fts_update');
      db.exec('DROP TRIGGER IF EXISTS spans_fts_delete');
      db.exec('DROP TRIGGER IF EXISTS spans_fts_insert');
      db.exec('DROP TABLE IF EXISTS spans_fts');
    },
  },
  {
    version: 3,
    name: 'add_skills_performance_cache',
    up: (db) => {
      // Create materialized view for skills performance
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

      // Trigger to update cache when spans are inserted
      db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_skills_cache AFTER INSERT ON spans
        WHEN json_extract(new.attributes, '$.skill.name') IS NOT NULL
        BEGIN
          INSERT INTO skills_performance_cache (
            skill_name, total_uses, successful_uses, failed_uses,
            success_rate, avg_duration_ms, last_updated
          )
          VALUES (
            json_extract(new.attributes, '$.skill.name'),
            1,
            CASE WHEN new.status_code = 'OK' THEN 1 ELSE 0 END,
            CASE WHEN new.status_code = 'ERROR' THEN 1 ELSE 0 END,
            CASE WHEN new.status_code = 'OK' THEN 1.0 ELSE 0.0 END,
            COALESCE(new.duration_ms, 0),
            CURRENT_TIMESTAMP
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

      // Backfill cache from existing spans
      db.exec(`
        INSERT OR REPLACE INTO skills_performance_cache (
          skill_name, total_uses, successful_uses, failed_uses,
          success_rate, avg_duration_ms, last_updated
        )
        SELECT
          json_extract(attributes, '$.skill.name') as skill_name,
          COUNT(*) as total_uses,
          SUM(CASE WHEN status_code = 'OK' THEN 1 ELSE 0 END) as successful_uses,
          SUM(CASE WHEN status_code = 'ERROR' THEN 1 ELSE 0 END) as failed_uses,
          AVG(CASE WHEN status_code = 'OK' THEN 1.0 ELSE 0.0 END) as success_rate,
          AVG(COALESCE(duration_ms, 0)) as avg_duration_ms,
          CURRENT_TIMESTAMP as last_updated
        FROM spans
        WHERE json_extract(attributes, '$.skill.name') IS NOT NULL
        GROUP BY skill_name;
      `);
    },
    down: (db) => {
      db.exec('DROP TRIGGER IF EXISTS update_skills_cache');
      db.exec('DROP TABLE IF EXISTS skills_performance_cache');
    },
  },
  {
    version: 4,
    name: 'add_contextual_patterns',
    up: (db) => {
      // Add context columns to patterns table
      db.exec(`
        ALTER TABLE patterns ADD COLUMN complexity TEXT CHECK(complexity IN ('low', 'medium', 'high'));
      `);

      db.exec(`
        ALTER TABLE patterns ADD COLUMN config_keys TEXT;
      `);

      db.exec(`
        ALTER TABLE patterns ADD COLUMN context_metadata TEXT;
      `);

      // Create index for context-based queries
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_patterns_agent_task ON patterns(applies_to_agent_type, applies_to_task_type);
      `);

      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_patterns_complexity ON patterns(complexity) WHERE complexity IS NOT NULL;
      `);
    },
    down: (db) => {
      // SQLite doesn't support DROP COLUMN, so we need to recreate the table
      db.exec(`
        CREATE TABLE patterns_backup AS SELECT
          id, type, confidence, occurrences, pattern_data, source_span_ids,
          applies_to_agent_type, applies_to_task_type, applies_to_skill,
          first_observed, last_observed, is_active, created_at, updated_at
        FROM patterns;
      `);

      db.exec('DROP TABLE patterns');

      db.exec(`
        CREATE TABLE patterns (
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

      db.exec('INSERT INTO patterns SELECT * FROM patterns_backup');
      db.exec('DROP TABLE patterns_backup');
      db.exec('DROP INDEX IF EXISTS idx_patterns_agent_task');
      db.exec('DROP INDEX IF EXISTS idx_patterns_complexity');
    },
  },
];

export class MigrationManager {
  constructor(private db: Database.Database) {}

  async initialize(): Promise<void> {
    // Create migrations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  getCurrentVersion(): number {
    const row = this.db
      .prepare('SELECT MAX(version) as version FROM migrations')
      .get() as { version: number | null };
    return row.version || 0;
  }

  async migrate(targetVersion?: number): Promise<void> {
    const current = this.getCurrentVersion();
    const target = targetVersion || migrations.length;

    if (current === target) {
      return;
    }

    console.log(`📦 Migrating database from v${current} to v${target}...`);

    // Run migrations
    for (let i = current + 1; i <= target; i++) {
      const migration = migrations[i - 1];
      if (!migration) break;

      console.log(`  ⬆️  Applying migration ${i}: ${migration.name}`);

      try {
        this.db.transaction(() => {
          migration.up(this.db);
          this.db
            .prepare('INSERT INTO migrations (version, name) VALUES (?, ?)')
            .run(migration.version, migration.name);
        })();

        console.log(`  ✅ Migration ${i} applied`);
      } catch (error) {
        console.error(`  ❌ Migration ${i} failed:`, error);
        throw error;
      }
    }

    console.log(`✅ Database migrated to v${target}`);
  }

  async rollback(steps: number = 1): Promise<void> {
    const current = this.getCurrentVersion();

    console.log(`📦 Rolling back ${steps} migration(s)...`);

    for (let i = 0; i < steps; i++) {
      const version = current - i;
      if (version < 1) break;

      const migration = migrations[version - 1];
      console.log(`  ⬇️  Rolling back migration ${version}: ${migration.name}`);

      this.db.transaction(() => {
        migration.down(this.db);
        this.db.prepare('DELETE FROM migrations WHERE version = ?').run(version);
      })();

      console.log(`  ✅ Migration ${version} rolled back`);
    }

    console.log(`✅ Rollback complete`);
  }
}
