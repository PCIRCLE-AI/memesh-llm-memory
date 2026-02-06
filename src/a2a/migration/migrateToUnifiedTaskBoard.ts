/**
 * @fileoverview Migration script from per-agent TaskQueue databases to unified TaskBoard
 *
 * This script detects old a2a-tasks-{agentId}.db files and migrates their tasks
 * to the unified task-board.db with proper state-to-status mapping.
 *
 * Features:
 * - Auto-detection of old databases in ~/.claude-code-buddy/
 * - State-to-status mapping (TaskQueue states -> TaskBoard statuses)
 * - Dry-run mode for preview
 * - Automatic backup before migration
 * - Duplicate handling (skip existing task IDs)
 * - Progress reporting
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { TaskBoard, type TaskStatus, type CreateTaskInput } from '../storage/TaskBoard.js';

/**
 * Old TaskQueue state type
 */
type TaskQueueState =
  | 'SUBMITTED'
  | 'WORKING'
  | 'INPUT_REQUIRED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELED'
  | 'REJECTED'
  | 'TIMEOUT';

/**
 * Old TaskQueue task row structure
 */
interface OldTaskRow {
  id: string;
  state: TaskQueueState;
  name: string | null;
  description: string | null;
  priority: string;
  session_id: string | null;
  created_at: string;
  updated_at: string;
  metadata: string | null;
}

/**
 * Migration options
 */
export interface MigrationOptions {
  /** If true, only report what would be migrated without making changes. Default: false */
  dryRun?: boolean;
  /** If true, create .backup copy of old database before migration. Default: true */
  backup?: boolean;
  /** Data directory to scan for old databases. Default: ~/.claude-code-buddy */
  dataDir?: string;
  /** Path to the unified task board database. Default: {dataDir}/task-board.db */
  taskBoardPath?: string;
}

/**
 * Per-database migration result
 */
export interface DatabaseMigrationResult {
  path: string;
  taskCount: number;
  migratedCount: number;
}

/**
 * Overall migration result
 */
export interface MigrationResult {
  migratedCount: number;
  skippedCount: number;
  errorCount: number;
  errors: Array<{ taskId: string; error: string }>;
  databases: DatabaseMigrationResult[];
}

/**
 * State to status mapping
 *
 * Maps old TaskQueue states to new TaskBoard statuses:
 * - SUBMITTED -> pending (waiting to be worked on)
 * - WORKING -> in_progress (currently being worked on)
 * - INPUT_REQUIRED -> in_progress (still in progress, needs input)
 * - COMPLETED -> completed (successfully finished)
 * - FAILED -> completed (terminal state, treat as done)
 * - CANCELED -> deleted (user canceled)
 * - REJECTED -> deleted (system rejected)
 * - TIMEOUT -> completed (terminal state, treat as done)
 */
const STATE_TO_STATUS_MAP: Record<TaskQueueState, TaskStatus> = {
  SUBMITTED: 'pending',
  WORKING: 'in_progress',
  INPUT_REQUIRED: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'completed',
  CANCELED: 'deleted',
  REJECTED: 'deleted',
  TIMEOUT: 'completed',
};

/**
 * Map a TaskQueue state to a TaskBoard status
 *
 * @param state - The old TaskQueue state
 * @returns The corresponding TaskBoard status
 * @throws Error if state is unknown
 */
export function mapStateToStatus(state: TaskQueueState): TaskStatus {
  const status = STATE_TO_STATUS_MAP[state];
  if (!status) {
    throw new Error(`Unknown state: ${state}`);
  }
  return status;
}

/**
 * Extract platform from agent ID
 *
 * Agent IDs typically follow the format: hostname-username-platform
 * This function extracts the platform portion (last segment after dash).
 *
 * @param agentId - The agent ID from the database filename
 * @returns The extracted platform, or 'unknown' if extraction fails
 */
export function extractPlatformFromAgentId(agentId: string): string {
  if (!agentId || agentId.trim() === '') {
    return 'unknown';
  }

  // Split by dash and take the last part as platform
  const parts = agentId.split('-');
  if (parts.length === 1) {
    // No dashes, return the whole thing as platform
    return agentId;
  }

  // Return the last segment as platform
  return parts[parts.length - 1] || 'unknown';
}

/**
 * Detect old TaskQueue databases in the specified directory
 *
 * Looks for files matching the pattern: a2a-tasks-*.db
 *
 * @param dataDir - Directory to scan. Default: ~/.claude-code-buddy
 * @returns Array of absolute paths to old database files
 */
export function detectOldDatabases(dataDir?: string): string[] {
  const dir = dataDir || path.join(os.homedir(), '.claude-code-buddy');

  if (!fs.existsSync(dir)) {
    return [];
  }

  const files = fs.readdirSync(dir);
  const pattern = /^a2a-tasks-.+\.db$/;

  return files
    .filter(file => pattern.test(file))
    .map(file => path.join(dir, file));
}

/**
 * Extract agent ID from database path
 *
 * @param dbPath - Path to old database (e.g., /path/to/a2a-tasks-myagent.db)
 * @returns The agent ID (e.g., "myagent")
 */
function extractAgentIdFromPath(dbPath: string): string {
  const filename = path.basename(dbPath);
  // Pattern: a2a-tasks-{agentId}.db
  const match = filename.match(/^a2a-tasks-(.+)\.db$/);
  return match ? match[1] : 'unknown';
}

/**
 * Check if a task with the given ID exists in the TaskBoard
 *
 * @param taskBoard - TaskBoard instance
 * @param taskId - Task ID to check
 * @returns true if task exists, false otherwise
 */
function taskExistsInBoard(taskBoard: TaskBoard, taskId: string): boolean {
  try {
    const task = taskBoard.getTask(taskId);
    return task !== null;
  } catch {
    // Invalid task ID format or other error - assume doesn't exist
    return false;
  }
}

/**
 * Create backup of old database
 *
 * @param dbPath - Path to database file
 */
function createBackup(dbPath: string): void {
  const backupPath = dbPath + '.backup';
  fs.copyFileSync(dbPath, backupPath);
}

/**
 * Migrate tasks from a single old database
 *
 * @param oldDbPath - Path to old TaskQueue database
 * @param taskBoard - TaskBoard instance to migrate to
 * @param dryRun - If true, don't actually perform migration
 * @returns Migration result for this database
 */
function migrateDatabase(
  oldDbPath: string,
  taskBoard: TaskBoard,
  dryRun: boolean
): { result: DatabaseMigrationResult; errors: Array<{ taskId: string; error: string }>; skipped: number } {
  const agentId = extractAgentIdFromPath(oldDbPath);
  const platform = extractPlatformFromAgentId(agentId);

  const result: DatabaseMigrationResult = {
    path: oldDbPath,
    taskCount: 0,
    migratedCount: 0,
  };
  const errors: Array<{ taskId: string; error: string }> = [];
  let skipped = 0;

  let oldDb: Database.Database | null = null;

  try {
    oldDb = new Database(oldDbPath, { readonly: true });

    // Check if tasks table exists
    const tableExists = oldDb.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'"
    ).get();

    if (!tableExists) {
      throw new Error('tasks table does not exist');
    }

    // Read all tasks from old database
    const tasks = oldDb.prepare('SELECT * FROM tasks').all() as OldTaskRow[];
    result.taskCount = tasks.length;

    if (dryRun) {
      // In dry-run mode, just count - don't migrate
      oldDb.close();
      return { result, errors, skipped };
    }

    // Migrate each task
    for (const task of tasks) {
      try {
        // Skip if task already exists
        if (taskExistsInBoard(taskBoard, task.id)) {
          skipped++;
          continue;
        }

        // Map state to status
        const status = mapStateToStatus(task.state);

        // Parse timestamps (old format is ISO string, new format is milliseconds)
        const createdAt = new Date(task.created_at).getTime();
        const updatedAt = new Date(task.updated_at).getTime();

        // Prepare metadata - merge old metadata with migration info
        let metadata: Record<string, unknown> = {};
        if (task.metadata) {
          try {
            metadata = JSON.parse(task.metadata);
          } catch {
            // Invalid JSON in metadata, skip it
          }
        }

        // Add migration metadata
        metadata._migrated = {
          from: oldDbPath,
          agentId,
          originalState: task.state,
          originalPriority: task.priority,
          sessionId: task.session_id,
          migratedAt: new Date().toISOString(),
        };

        // Determine subject - use name, fallback to description excerpt, or task ID
        let subject = task.name;
        if (!subject || subject.trim() === '') {
          if (task.description && task.description.trim()) {
            // Use first 50 chars of description
            subject = task.description.substring(0, 50) + (task.description.length > 50 ? '...' : '');
          } else {
            subject = `Migrated task ${task.id}`;
          }
        }

        // Insert task directly using db access to preserve ID
        const db = (taskBoard as any).db;
        db.prepare(`
          INSERT INTO tasks (id, subject, description, activeForm, status, owner, creator_platform, created_at, updated_at, metadata)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          task.id,
          subject,
          task.description || null,
          null, // activeForm - not present in old schema
          status,
          null, // owner - not set on migration
          platform,
          createdAt,
          updatedAt,
          JSON.stringify(metadata)
        );

        result.migratedCount++;
      } catch (taskError) {
        errors.push({
          taskId: task.id,
          error: taskError instanceof Error ? taskError.message : String(taskError),
        });
      }
    }

    oldDb.close();
  } catch (dbError) {
    if (oldDb) {
      try {
        oldDb.close();
      } catch {
        // Ignore close errors
      }
    }
    errors.push({
      taskId: '*',
      error: `Database error: ${dbError instanceof Error ? dbError.message : String(dbError)}`,
    });
  }

  return { result, errors, skipped };
}

/**
 * Migrate tasks from all old per-agent databases to the unified TaskBoard
 *
 * @param options - Migration options
 * @returns Migration result summary
 */
export function migrateToUnifiedTaskBoard(options?: MigrationOptions): MigrationResult {
  const dryRun = options?.dryRun ?? false;
  const backup = options?.backup ?? true;
  const dataDir = options?.dataDir || path.join(os.homedir(), '.claude-code-buddy');
  const taskBoardPath = options?.taskBoardPath || path.join(dataDir, 'task-board.db');

  const result: MigrationResult = {
    migratedCount: 0,
    skippedCount: 0,
    errorCount: 0,
    errors: [],
    databases: [],
  };

  // Detect old databases
  const oldDatabases = detectOldDatabases(dataDir);

  if (oldDatabases.length === 0) {
    return result;
  }

  // Initialize TaskBoard (only if not dry-run)
  let taskBoard: TaskBoard | null = null;
  if (!dryRun) {
    taskBoard = new TaskBoard(taskBoardPath);
  }

  try {
    // Process each old database
    for (const oldDbPath of oldDatabases) {
      // Create backup if requested (and not dry-run)
      if (backup && !dryRun) {
        try {
          createBackup(oldDbPath);
        } catch (backupError) {
          // Log but continue - backup failure shouldn't stop migration
          result.errors.push({
            taskId: '*',
            error: `Backup failed for ${oldDbPath}: ${backupError instanceof Error ? backupError.message : String(backupError)}`,
          });
        }
      }

      // Migrate database
      if (dryRun) {
        // For dry-run, just count tasks without TaskBoard
        const dryRunResult = migrateDatabase(oldDbPath, null as any, true);
        result.databases.push(dryRunResult.result);
      } else {
        const dbResult = migrateDatabase(oldDbPath, taskBoard!, dryRun);
        result.databases.push(dbResult.result);
        result.migratedCount += dbResult.result.migratedCount;
        result.skippedCount += dbResult.skipped;
        result.errorCount += dbResult.errors.length;
        result.errors.push(...dbResult.errors);
      }
    }
  } finally {
    // Close TaskBoard
    if (taskBoard) {
      taskBoard.close();
    }
  }

  return result;
}

export default migrateToUnifiedTaskBoard;
