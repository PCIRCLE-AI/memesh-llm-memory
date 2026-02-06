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
import { A2AEventEmitter } from '../events/A2AEventEmitter.js';
import { A2AEvent, TaskEventData, EventType } from '../events/types.js';

/**
 * Safely parse JSON string, returning undefined if invalid (defense-in-depth)
 */
function safeParseJson(json: string | null): string | undefined {
  if (!json) return undefined;
  try {
    JSON.parse(json);
    return json;
  } catch {
    return undefined;
  }
}

/**
 * Task status type
 */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'deleted';

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
  cancelled_by?: string;
  cancel_reason?: string;
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
 * Input for registering an agent
 */
export interface RegisterAgentInput {
  agent_id: string;
  platform: string;
  hostname: string;
  username: string;
  base_url?: string;
  port?: number;
  process_pid?: number;
  skills?: string[];
}

/**
 * Agent representation
 */
export interface Agent {
  agent_id: string;
  platform: string;
  hostname: string;
  username: string;
  base_url: string | null;
  port: number | null;
  process_pid: number | null;
  skills: string | null; // JSON array string
  last_heartbeat: number;
  status: 'active' | 'inactive';
  created_at: number;
}

/**
 * Filter options for listing agents
 */
export interface AgentFilter {
  status?: 'active' | 'inactive';
  platform?: string;
}

/**
 * Task history entry for audit trail
 */
export interface TaskHistoryEntry {
  id: number;
  task_id: string;
  agent_id: string;
  action: string;
  old_status: string | null;
  new_status: string | null;
  timestamp: number;
}

/**
 * TaskBoard - Unified task storage with platform tracking
 *
 * Features:
 * - Single SQLite database for all platforms
 * - Platform-aware task tracking (creator_platform)
 * - Task dependencies with CASCADE delete
 * - Task history audit trail
 * - Agent registry with skills
 *
 * **Concurrency Model**: Designed for single-process access.
 * Multiple TaskBoard instances in the same process share the same
 * database file (WAL mode allows concurrent reads). Cross-process
 * coordination requires external locking mechanism.
 *
 * @example
 * const board = new TaskBoard();
 * const taskId = board.createTask({
 *   subject: 'Implement feature X',
 *   status: 'pending',
 *   creator_platform: 'claude-code'
 * });
 */
export class TaskBoard {
  private db!: Database.Database;
  private eventEmitter?: A2AEventEmitter;

  // Maximum length constraints for input validation
  private static readonly MAX_SUBJECT_LENGTH = 500;
  private static readonly MAX_DESCRIPTION_LENGTH = 10000;
  private static readonly MAX_ACTIVE_FORM_LENGTH = 500;
  private static readonly MAX_AGENT_ID_LENGTH = 500;
  private static readonly MAX_PLATFORM_LENGTH = 100;
  private static readonly MAX_HOSTNAME_LENGTH = 255;
  private static readonly MAX_USERNAME_LENGTH = 255;

  /**
   * Initialize TaskBoard storage
   *
   * @param dbPath - Optional custom database path (for testing). Defaults to ~/.claude-code-buddy/task-board.db
   * @param eventEmitter - Optional A2AEventEmitter for real-time event notifications
   * @throws Error if initialization fails or path is invalid
   */
  constructor(dbPath?: string, eventEmitter?: A2AEventEmitter) {
    this.eventEmitter = eventEmitter;
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
    // Tasks table - use temporary table approach to update CHECK constraint
    // First check if the table exists with old schema
    const tableExists = this.db.prepare(`
      SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'
    `).get();

    if (tableExists) {
      // Check if cancelled_by column exists (indicator of new schema)
      const columns = this.db.prepare(`PRAGMA table_info(tasks)`).all() as Array<{ name: string }>;
      const hasCancelledBy = columns.some((col) => col.name === 'cancelled_by');

      if (!hasCancelledBy) {
        // Migrate to new schema with cancelled status support
        this.db.exec(`
          -- Add new columns for cancellation support
          ALTER TABLE tasks ADD COLUMN cancelled_by TEXT;
          ALTER TABLE tasks ADD COLUMN cancel_reason TEXT;
        `);

        // Note: SQLite does not allow modifying CHECK constraints directly.
        // The constraint is only validated on INSERT/UPDATE, so we recreate the table
        // with the new constraint for new databases. For existing databases,
        // we handle validation in application code.
      }
    } else {
      // Create new table with updated schema
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          subject TEXT NOT NULL,
          description TEXT,
          activeForm TEXT,
          status TEXT NOT NULL CHECK(status IN ('pending', 'in_progress', 'completed', 'cancelled', 'deleted')),
          owner TEXT,
          creator_platform TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          metadata TEXT,
          cancelled_by TEXT,
          cancel_reason TEXT
        );
      `);
    }

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
    if (input.subject.length > TaskBoard.MAX_SUBJECT_LENGTH) {
      throw new Error(`Task subject exceeds maximum length of ${TaskBoard.MAX_SUBJECT_LENGTH} characters`);
    }
    if (input.description && input.description.length > TaskBoard.MAX_DESCRIPTION_LENGTH) {
      throw new Error(`Task description exceeds maximum length of ${TaskBoard.MAX_DESCRIPTION_LENGTH} characters`);
    }
    if (input.activeForm && input.activeForm.length > TaskBoard.MAX_ACTIVE_FORM_LENGTH) {
      throw new Error(`Task activeForm exceeds maximum length of ${TaskBoard.MAX_ACTIVE_FORM_LENGTH} characters`);
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

    // Emit task.created event
    const task = this.getTask(id);
    if (task) {
      this.emitTaskEvent('task.created', task);
    }

    return id;
  }

  /**
   * Get a task by ID
   *
   * @param taskId - Task ID
   * @returns Task object or null if not found
   */
  getTask(taskId: string): Task | null {
    this.validateTaskId(taskId);

    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(taskId) as any;

    if (!row) {
      return null;
    }

    return this.rowToTask(row);
  }

  /**
   * Convert database row to Task object
   */
  private rowToTask(row: any): Task {
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
      metadata: safeParseJson(row.metadata),
      cancelled_by: row.cancelled_by || undefined,
      cancel_reason: row.cancel_reason || undefined,
    };
  }

  /**
   * Emit a task lifecycle event
   *
   * @param type - Event type (task.created, task.claimed, etc.)
   * @param task - Task object with current state
   * @param actor - Optional agent ID that performed the action
   */
  private emitTaskEvent(
    type: EventType,
    task: Task,
    actor?: string
  ): void {
    if (!this.eventEmitter) return;

    const event: A2AEvent<TaskEventData> = {
      id: crypto.randomUUID(),
      type,
      timestamp: Date.now(),
      data: {
        taskId: task.id,
        subject: task.subject,
        status: task.status,
        owner: task.owner || null,
        creator_platform: task.creator_platform,
        actor,
      },
    };

    this.eventEmitter.emit(event);
  }

  /**
   * List tasks with optional filtering
   *
   * Filters use AND logic when multiple criteria provided.
   * All matches are exact (case-sensitive, no wildcards).
   * Empty filter {} returns all tasks.
   *
   * @param filter - Optional filter criteria
   *   - status: Exact match on task status ('pending' | 'in_progress' | 'completed' | 'deleted')
   *   - owner: Exact match on owner agent ID
   *   - creator_platform: Exact match on platform that created task
   * @returns Array of tasks matching all provided criteria (empty array if no matches)
   *
   * @example
   * // Get all pending tasks
   * taskBoard.listTasks({ status: 'pending' });
   *
   * // Get tasks for specific agent
   * taskBoard.listTasks({ owner: 'agent-123' });
   *
   * // Combine filters (AND logic)
   * taskBoard.listTasks({ status: 'pending', creator_platform: 'claude-code' });
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

    return rows.map((row) => this.rowToTask(row));
  }

  /**
   * Update task status
   *
   * @param taskId - Task ID
   * @param status - New status
   * @throws Error if task not found or database operation fails
   */
  updateTaskStatus(taskId: string, status: TaskStatus): void {
    this.validateTaskId(taskId);

    // Check if task exists
    if (!this.taskExists(taskId)) {
      throw new Error(`Task not found: ${taskId}`);
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
    this.validateTaskId(taskId);

    // Get task before deletion (for event emission)
    const task = this.getTask(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    stmt.run(taskId);

    // Emit task.deleted event
    this.emitTaskEvent('task.deleted', task);
  }

  /**
   * Claim a pending task for an agent
   *
   * Atomically updates task status to 'in_progress' and assigns ownership.
   * Only pending tasks can be claimed to prevent race conditions.
   *
   * Uses atomic UPDATE with WHERE clause to prevent TOCTOU race conditions.
   * The status check is part of the UPDATE statement itself, ensuring no
   * window exists between checking status and updating it.
   *
   * @param taskId - Task ID to claim
   * @param agentId - Agent ID claiming the task
   * @throws Error if task not found, not pending, or validation fails
   */
  claimTask(taskId: string, agentId: string): void {
    this.validateTaskId(taskId);

    if (!agentId || agentId.trim() === '') {
      throw new Error('Agent ID is required');
    }

    const now = Date.now();

    // Atomic update with transaction - status check is in WHERE clause
    // This prevents TOCTOU race conditions where two agents could both
    // pass a separate status check before either updates the database
    const transaction = this.db.transaction(() => {
      const result = this.db.prepare(`
        UPDATE tasks
        SET owner = ?, status = 'in_progress', updated_at = ?
        WHERE id = ? AND status = 'pending'
      `).run(agentId, now, taskId);

      if (result.changes === 0) {
        // Either task doesn't exist or status wasn't pending
        const task = this.db.prepare('SELECT status FROM tasks WHERE id = ?').get(taskId) as { status: string } | undefined;
        if (!task) {
          throw new Error(`Task not found: ${taskId}`);
        }
        throw new Error(`Task ${taskId} is not in pending status (current: ${task.status})`);
      }

      this.recordHistory(taskId, agentId, 'claimed', 'pending', 'in_progress');
    });

    transaction();

    // Emit task.claimed event
    const updatedTask = this.getTask(taskId);
    if (updatedTask) {
      this.emitTaskEvent('task.claimed', updatedTask, agentId);
    }
  }

  /**
   * Release a task back to pending status
   *
   * Atomically clears task ownership and resets status to pending.
   * Allows other agents to claim the task.
   *
   * Uses atomic UPDATE with WHERE clause to prevent TOCTOU race conditions.
   * Only in_progress tasks can be released.
   *
   * @param taskId - Task ID to release
   * @throws Error if task not found, not in_progress, or validation fails
   */
  releaseTask(taskId: string): void {
    this.validateTaskId(taskId);

    const now = Date.now();
    let previousOwner: string | null = null;

    // Atomic update with transaction - status check is in WHERE clause
    // This prevents TOCTOU race conditions
    const transaction = this.db.transaction(() => {
      // Get current owner before update for history recording
      const task = this.db.prepare('SELECT owner, status FROM tasks WHERE id = ?').get(taskId) as { owner: string | null, status: string } | undefined;

      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      previousOwner = task.owner;
      const previousStatus = task.status;

      // Atomic update - only update if task is in_progress
      const result = this.db.prepare(`
        UPDATE tasks
        SET owner = NULL, status = 'pending', updated_at = ?
        WHERE id = ? AND status = 'in_progress'
      `).run(now, taskId);

      if (result.changes === 0) {
        // Task exists but status wasn't in_progress
        throw new Error(`Task ${taskId} is not in in_progress status (current: ${task.status})`);
      }

      // Record history with previous owner
      this.recordHistory(taskId, previousOwner || 'unknown', 'released', previousStatus, 'pending');
    });

    transaction();

    // Emit task.released event
    const updatedTask = this.getTask(taskId);
    if (updatedTask) {
      this.emitTaskEvent('task.released', updatedTask, previousOwner ?? undefined);
    }
  }

  /**
   * Cancel a task
   *
   * Marks a task as cancelled with optional reason. Clears task ownership.
   * Cannot cancel completed or already cancelled tasks.
   *
   * Uses atomic UPDATE with WHERE clause to prevent TOCTOU race conditions.
   * Only pending or in_progress tasks can be cancelled.
   *
   * @param taskId - Task ID to cancel
   * @param cancelledBy - Agent ID or identifier of who cancelled the task
   * @param reason - Optional reason for cancellation
   * @throws Error if task not found, already completed/cancelled, or validation fails
   */
  cancelTask(taskId: string, cancelledBy: string, reason?: string): void {
    this.validateTaskId(taskId);

    const now = Date.now();
    let previousStatus: string | null = null;

    // Atomic update with transaction - status check is in WHERE clause
    // This prevents TOCTOU race conditions
    const transaction = this.db.transaction(() => {
      // Get current status before update for proper error message and history
      const task = this.db.prepare('SELECT status FROM tasks WHERE id = ?').get(taskId) as { status: string } | undefined;

      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      previousStatus = task.status;

      // Atomic update - only update if task is pending or in_progress
      const result = this.db.prepare(`
        UPDATE tasks
        SET status = 'cancelled',
            owner = NULL,
            cancelled_by = ?,
            cancel_reason = ?,
            updated_at = ?
        WHERE id = ? AND status IN ('pending', 'in_progress')
      `).run(cancelledBy, reason || null, now, taskId);

      if (result.changes === 0) {
        // Task exists but status wasn't cancellable
        if (task.status === 'completed') {
          throw new Error('Cannot cancel completed task');
        }
        if (task.status === 'cancelled') {
          throw new Error('Task already cancelled');
        }
        if (task.status === 'deleted') {
          throw new Error('Task not found');
        }
        throw new Error(`Cannot cancel task with status: ${task.status}`);
      }

      this.recordHistory(taskId, cancelledBy, 'cancelled', previousStatus, 'cancelled');
    });

    transaction();

    // Emit task.cancelled event
    const updatedTask = this.getTask(taskId);
    if (updatedTask) {
      this.emitTaskEvent('task.cancelled', updatedTask, cancelledBy);
    }
  }

  /**
   * Complete a task
   *
   * Marks a task as completed. Only in_progress tasks can be completed.
   *
   * Uses atomic UPDATE with WHERE clause to prevent TOCTOU race conditions.
   *
   * @param taskId - Task ID to complete
   * @param completedBy - Agent ID that completed the task
   * @throws Error if task not found, not in_progress, or validation fails
   */
  completeTask(taskId: string, completedBy: string): void {
    this.validateTaskId(taskId);

    const now = Date.now();

    // Atomic update with transaction - status check is in WHERE clause
    // This prevents TOCTOU race conditions
    const transaction = this.db.transaction(() => {
      // Atomic update - only update if task is in_progress
      const result = this.db.prepare(`
        UPDATE tasks
        SET status = 'completed',
            updated_at = ?
        WHERE id = ? AND status = 'in_progress'
      `).run(now, taskId);

      if (result.changes === 0) {
        // Either task doesn't exist or status wasn't in_progress
        const task = this.db.prepare('SELECT status FROM tasks WHERE id = ?').get(taskId) as { status: string } | undefined;
        if (!task) {
          throw new Error(`Task not found: ${taskId}`);
        }
        throw new Error(`Task ${taskId} is not in in_progress status (current: ${task.status})`);
      }

      this.recordHistory(taskId, completedBy, 'completed', 'in_progress', 'completed');
    });

    transaction();

    // Emit task.completed event
    const updatedTask = this.getTask(taskId);
    if (updatedTask) {
      this.emitTaskEvent('task.completed', updatedTask, completedBy);
    }
  }

  /**
   * Get task history for audit trail
   *
   * Returns all history entries for a task in reverse chronological order (newest first).
   *
   * @param taskId - Task ID to get history for
   * @returns Array of history entries (empty if no history)
   */
  getTaskHistory(taskId: string): TaskHistoryEntry[] {
    this.validateTaskId(taskId);

    const entries = this.db.prepare(`
      SELECT * FROM task_history
      WHERE task_id = ?
      ORDER BY timestamp DESC
    `).all(taskId) as TaskHistoryEntry[];

    return entries;
  }

  /**
   * Register an agent with platform information
   *
   * Uses UPSERT (INSERT OR REPLACE) for idempotency - allows agents to re-register
   * without losing their original created_at timestamp.
   *
   * @param agent - Agent registration input
   * @throws Error if required fields are missing or validation fails
   */
  registerAgent(agent: RegisterAgentInput): void {
    // Validate required fields
    const requiredFields = ['agent_id', 'platform', 'hostname', 'username'] as const;
    for (const field of requiredFields) {
      const value = agent[field];
      if (!value || typeof value !== 'string' || value.trim() === '') {
        throw new Error('agent_id, platform, hostname, and username are required');
      }
    }

    // Validate maximum lengths
    const lengthLimits: Array<[string, string, number]> = [
      ['agent_id', agent.agent_id, TaskBoard.MAX_AGENT_ID_LENGTH],
      ['platform', agent.platform, TaskBoard.MAX_PLATFORM_LENGTH],
      ['hostname', agent.hostname, TaskBoard.MAX_HOSTNAME_LENGTH],
      ['username', agent.username, TaskBoard.MAX_USERNAME_LENGTH],
    ];
    for (const [fieldName, value, maxLength] of lengthLimits) {
      if (value.length > maxLength) {
        throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
      }
    }

    // Serialize skills array to JSON string
    const skills = agent.skills ? JSON.stringify(agent.skills) : null;

    // UPSERT: INSERT OR REPLACE with created_at preservation
    const now = Date.now();
    this.db.prepare(`
      INSERT OR REPLACE INTO agents
      (agent_id, platform, hostname, username, base_url, port, process_pid, skills, last_heartbeat, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active',
              COALESCE((SELECT created_at FROM agents WHERE agent_id = ?), ?))
    `).run(
      agent.agent_id,
      agent.platform,
      agent.hostname,
      agent.username,
      agent.base_url || null,
      agent.port || null,
      agent.process_pid || null,
      skills,
      now,
      agent.agent_id,
      now
    );
  }

  /**
   * Get an agent by ID
   *
   * @param agentId - Agent ID
   * @returns Agent object or null if not found
   */
  getAgent(agentId: string): Agent | null {
    if (!agentId || agentId.trim() === '') {
      return null;
    }

    const stmt = this.db.prepare('SELECT * FROM agents WHERE agent_id = ?');
    const row = stmt.get(agentId) as any;

    if (!row) {
      return null;
    }

    return this.rowToAgent(row);
  }

  /**
   * Convert database row to Agent object
   */
  private rowToAgent(row: any): Agent {
    return {
      agent_id: row.agent_id,
      platform: row.platform,
      hostname: row.hostname,
      username: row.username,
      base_url: row.base_url,
      port: row.port,
      process_pid: row.process_pid,
      skills: safeParseJson(row.skills) ?? null,
      last_heartbeat: row.last_heartbeat,
      status: row.status,
      created_at: row.created_at,
    };
  }

  /**
   * List agents with optional filtering
   *
   * Filters use AND logic when multiple criteria provided.
   * All matches are exact (case-sensitive, no wildcards).
   * Empty filter {} returns all agents.
   *
   * @param filter - Optional filter criteria
   *   - status: Exact match on agent status ('active' | 'inactive')
   *   - platform: Exact match on platform name
   * @returns Array of agents matching all provided criteria (empty array if no matches)
   *
   * @example
   * // Get all active agents
   * taskBoard.listAgents({ status: 'active' });
   *
   * // Get agents for specific platform
   * taskBoard.listAgents({ platform: 'claude-code' });
   *
   * // Combine filters (AND logic)
   * taskBoard.listAgents({ status: 'active', platform: 'claude-code' });
   */
  listAgents(filter?: AgentFilter): Agent[] {
    let query = 'SELECT * FROM agents WHERE 1=1';
    const params: any[] = [];

    // Apply filters using parameterized queries
    if (filter?.status) {
      query += ' AND status = ?';
      params.push(filter.status);
    }
    if (filter?.platform) {
      query += ' AND platform = ?';
      params.push(filter.platform);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => this.rowToAgent(row));
  }

  /**
   * Update agent skills
   *
   * @param agentId - Agent ID
   * @param skills - New skills array
   * @throws Error if agent not found or validation fails
   */
  updateAgentSkills(agentId: string, skills: string[]): void {
    if (!agentId || agentId.trim() === '') {
      throw new Error('Agent ID is required');
    }

    // Check if agent exists
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Serialize skills to JSON
    const skillsJson = JSON.stringify(skills);

    const stmt = this.db.prepare('UPDATE agents SET skills = ? WHERE agent_id = ?');
    stmt.run(skillsJson, agentId);
  }

  /**
   * Update agent heartbeat timestamp
   *
   * @param agentId - Agent ID
   * @throws Error if agent not found or validation fails
   */
  updateAgentHeartbeat(agentId: string): void {
    if (!agentId || agentId.trim() === '') {
      throw new Error('Agent ID is required');
    }

    // Check if agent exists
    const agent = this.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    const now = Date.now();
    const stmt = this.db.prepare('UPDATE agents SET last_heartbeat = ? WHERE agent_id = ?');
    stmt.run(now, agentId);
  }

  /**
   * Close database connection (idempotent)
   */
  close(): void {
    if (this.db && this.db.open) {
      this.db.close();
    }
  }

  /**
   * Record task history entry (private helper)
   *
   * @param taskId - Task ID
   * @param agentId - Agent ID performing the action
   * @param action - Action performed (e.g., 'claimed', 'released')
   * @param oldStatus - Previous status (optional)
   * @param newStatus - New status (optional)
   */
  private recordHistory(
    taskId: string,
    agentId: string,
    action: string,
    oldStatus?: string,
    newStatus?: string
  ): void {
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO task_history (task_id, agent_id, action, old_status, new_status, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(taskId, agentId, action, oldStatus || null, newStatus || null, now);
  }

  /**
   * Validate that a taskId is a valid UUID v4 format
   * @throws Error if taskId is not a valid UUID
   */
  private validateTaskId(taskId: string): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(taskId)) {
      throw new Error(`Invalid task ID format: ${taskId}`);
    }
  }

  /**
   * Check if a task exists in the database
   * @param taskId - Task ID to check
   * @returns true if task exists, false otherwise
   */
  private taskExists(taskId: string): boolean {
    const result = this.db.prepare('SELECT 1 FROM tasks WHERE id = ?').get(taskId);
    return !!result;
  }
}
