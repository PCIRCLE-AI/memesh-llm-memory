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
import crypto from 'crypto';

/**
 * Task status type
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deleted';

/**
 * Input for creating a new task
 */
export interface CreateTaskInput {
  subject: string;
  description?: string;
  activeForm?: string;
  status: TaskStatus;
  owner?: string;
  creator_platform: string;
  metadata?: Record<string, unknown>;
}

/**
 * Task representation
 */
export interface Task {
  id: string;
  subject: string;
  description?: string;
  activeForm?: string;
  status: TaskStatus;
  owner?: string;
  creator_platform: string;
  created_at: number;
  updated_at: number;
  metadata?: string; // JSON string
}

/**
 * Filter options for listing tasks
 */
export interface TaskFilter {
  status?: TaskStatus;
  owner?: string;
  creator_platform?: string;
}

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
   * @throws Error if initialization fails or path is invalid
   */
  constructor(dbPath?: string) {
    try {
      // Validate dbPath if provided
      if (dbPath !== undefined) {
        if (typeof dbPath !== 'string' || dbPath.trim() === '') {
          throw new Error('dbPath must be a non-empty string');
        }
        const normalized = path.normalize(dbPath);
        if (normalized.includes('..')) {
          throw new Error('Path traversal not allowed in dbPath');
        }
      }

      // Default path: ~/.claude-code-buddy/task-board.db
      const defaultPath = path.join(os.homedir(), '.claude-code-buddy', 'task-board.db');
      const finalPath = dbPath || defaultPath;

      // Ensure directory exists (fix TOCTOU race)
      const dir = path.dirname(finalPath);
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch (err: any) {
        if (err.code !== 'EEXIST') {
          throw new Error(`Failed to create directory ${dir}: ${err.message}`);
        }
      }

      // Open database
      this.db = new Database(finalPath);

      // Enable WAL mode for concurrent access
      this.db.pragma('journal_mode = WAL');

      // Enable foreign keys
      this.db.pragma('foreign_keys = ON');

      // Initialize schema
      this.initSchema();
    } catch (error) {
      // Clean up if initialization fails
      if (this.db) {
        try {
          this.db.close();
        } catch {
          // Ignore close errors during cleanup
        }
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to initialize TaskBoard: ${errorMessage}`);
    }
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
   * @throws Error if table name is invalid (SQL injection protection)
   */
  getTableSchema(tableName: string): Array<{ name: string; type: string }> {
    // Whitelist validation to prevent SQL injection
    const validTables = ['tasks', 'task_dependencies', 'agents', 'task_history'];
    if (!validTables.includes(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

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
   * Create a new task
   *
   * @param input - Task creation input
   * @returns Task ID (UUID)
   * @throws Error if validation fails or database operation fails
   */
  createTask(input: CreateTaskInput): string {
    // Input validation
    if (!input.subject || typeof input.subject !== 'string' || input.subject.trim() === '') {
      throw new Error('Task subject is required');
    }
    if (!input.status) {
      throw new Error('Task status is required');
    }
    if (!input.creator_platform || typeof input.creator_platform !== 'string') {
      throw new Error('Creator platform is required');
    }

    // Generate ID and timestamps
    const id = crypto.randomUUID();
    const now = Date.now();

    // Serialize metadata if provided
    const metadata = input.metadata ? JSON.stringify(input.metadata) : null;

    // Insert with prepared statement (SQL injection safe)
    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, subject, description, activeForm, status, owner, creator_platform, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.subject,
      input.description || null,
      input.activeForm || null,
      input.status,
      input.owner || null,
      input.creator_platform,
      now,
      now,
      metadata
    );

    return id;
  }

  /**
   * Get a task by ID
   *
   * @param taskId - Task ID
   * @returns Task object or null if not found
   */
  getTask(taskId: string): Task | null {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(taskId) as any;

    if (!row) {
      return null;
    }

    // Return task with proper typing
    return {
      id: row.id,
      subject: row.subject,
      description: row.description || undefined,
      activeForm: row.activeForm || undefined,
      status: row.status,
      owner: row.owner || undefined,
      creator_platform: row.creator_platform,
      created_at: row.created_at,
      updated_at: row.updated_at,
      metadata: row.metadata || undefined,
    };
  }

  /**
   * List tasks with optional filters
   *
   * @param filter - Optional filter criteria
   * @returns Array of tasks matching filter
   */
  listTasks(filter?: TaskFilter): Task[] {
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params: any[] = [];

    // Apply filters using parameterized queries
    if (filter?.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter?.owner) {
      query += ' AND owner = ?';
      params.push(filter.owner);
    }
    if (filter?.creator_platform) {
      query += ' AND creator_platform = ?';
      params.push(filter.creator_platform);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    // Map rows to Task objects
    return rows.map((row) => ({
      id: row.id,
      subject: row.subject,
      description: row.description || undefined,
      activeForm: row.activeForm || undefined,
      status: row.status,
      owner: row.owner || undefined,
      creator_platform: row.creator_platform,
      created_at: row.created_at,
      updated_at: row.updated_at,
      metadata: row.metadata || undefined,
    }));
  }

  /**
   * Update task status
   *
   * @param taskId - Task ID
   * @param status - New status
   * @throws Error if task not found or database operation fails
   */
  updateTaskStatus(taskId: string, status: TaskStatus): void {
    // Check if task exists
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const now = Date.now();

    const stmt = this.db.prepare('UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?');
    stmt.run(status, now, taskId);
  }

  /**
   * Delete a task
   *
   * @param taskId - Task ID
   * @throws Error if task not found
   */
  deleteTask(taskId: string): void {
    // Check if task exists
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    stmt.run(taskId);
  }

  /**
   * Close database connection (idempotent)
   */
  close(): void {
    if (this.db && this.db.open) {
      this.db.close();
    }
  }
}
