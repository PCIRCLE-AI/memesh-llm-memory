/**
 * @fileoverview Unified TaskBoard storage for cross-agent task management
 *
 * This replaces per-agent task databases with a single unified task-board.db
 * located at ~/.claude-code-buddy/task-board.db for true multi-agent collaboration.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * Unified TaskBoard storage using SQLite with WAL mode for concurrent access
 *
 * Database location: ~/.claude-code-buddy/task-board.db
 *
 * Features:
 * - WAL mode for concurrent reads/writes
 * - Foreign key constraints for data integrity
 * - Comprehensive indexes for performance
 * - Task dependencies tracking (blocks relationships)
 * - Agent registry for multi-agent coordination
 * - Task history for audit trail
 */
export class TaskBoard {
  private db: Database.Database;

  /**
   * Initialize TaskBoard storage
   *
   * @param dbPath - Optional custom database path (for testing). Defaults to ~/.claude-code-buddy/task-board.db
   */
  constructor(dbPath?: string) {
    // Default path: ~/.claude-code-buddy/task-board.db
    const defaultPath = path.join(os.homedir(), '.claude-code-buddy', 'task-board.db');
    const finalPath = dbPath || defaultPath;

    // Ensure directory exists
    const dir = path.dirname(finalPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Open database
    this.db = new Database(finalPath);

    // Enable WAL mode for concurrent access
    this.db.pragma('journal_mode = WAL');

    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');

    // Initialize schema
    this.initSchema();
  }

  /**
   * Initialize database schema with all tables and indexes
   */
  private initSchema(): void {
    // Tasks table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        subject TEXT NOT NULL,
        description TEXT,
        activeForm TEXT,
        status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'deleted')),
        owner TEXT,
        creator_platform TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        metadata TEXT
      );
    `);

    // Task dependencies table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS task_dependencies (
        task_id TEXT NOT NULL,
        blocks TEXT NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
        FOREIGN KEY (blocks) REFERENCES tasks(id) ON DELETE CASCADE,
        PRIMARY KEY (task_id, blocks)
      );
    `);

    // Agents registry table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        agent_id TEXT PRIMARY KEY,
        platform TEXT NOT NULL,
        hostname TEXT NOT NULL,
        username TEXT NOT NULL,
        base_url TEXT,
        port INTEGER,
        process_pid INTEGER,
        skills TEXT,
        last_heartbeat INTEGER NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('active', 'inactive')),
        created_at INTEGER NOT NULL
      );
    `);

    // Task history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS task_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        action TEXT NOT NULL,
        old_status TEXT,
        new_status TEXT,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
      );
    `);

    // Create indexes for performance
    this.createIndexes();
  }

  /**
   * Create all required indexes
   */
  private createIndexes(): void {
    // Tasks indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_owner ON tasks(owner);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_creator_platform ON tasks(creator_platform);`);

    // Task dependencies indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_task_dependencies_blocks ON task_dependencies(blocks);`);

    // Agents indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_agents_platform ON agents(platform);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);`);

    // Task history indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_task_history_task ON task_history(task_id);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_task_history_agent ON task_history(agent_id);`);
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_task_history_timestamp ON task_history(timestamp);`);
  }

  /**
   * Get list of all tables (for testing)
   *
   * @returns Array of table names
   */
  getTables(): string[] {
    const result = this.db
      .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)
      .all() as Array<{ name: string }>;

    return result.map((row) => row.name);
  }

  /**
   * Get table schema information (for testing)
   *
   * @param tableName - Name of the table
   * @returns Array of column information
   */
  getTableSchema(tableName: string): Array<{ name: string; type: string }> {
    const result = this.db.prepare(`PRAGMA table_info(${tableName})`).all() as Array<{
      cid: number;
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }>;

    return result.map((col) => ({
      name: col.name,
      type: col.type,
    }));
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}
