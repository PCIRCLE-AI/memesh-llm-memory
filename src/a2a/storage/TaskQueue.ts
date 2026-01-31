/**
 * Task Queue Storage
 * SQLite-based task storage per agent
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger.js';
import type {
  Task,
  TaskState,
  TaskPriority,
  TaskFilter,
  TaskStatus,
  CreateTaskParams,
  UpdateTaskParams,
  Message,
  AddMessageParams,
  MessageCreated,
  Artifact,
  MessagePart,
} from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database row interfaces
interface TaskRow {
  id: string;
  state: string;
  name: string | null;
  description: string | null;
  priority: string;
  session_id: string | null;
  created_at: string;
  updated_at: string;
  metadata: string | null;
}

interface MessageRow {
  id: string;
  task_id: string;
  role: string;
  parts: string;
  created_at: string;
  metadata: string | null;
}

interface ArtifactRow {
  id: string;
  task_id: string;
  type: string;
  name: string | null;
  content: string;
  encoding: string;
  size: number;
  created_at: string;
  metadata: string | null;
}

interface CountRow {
  count: number;
}

/**
 * Safely parse JSON string, returning null if invalid
 */
function safeJsonParse<T>(jsonString: string | null | undefined): T | null {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    logger.error('[TaskQueue] Invalid JSON data', {
      error: error instanceof Error ? error.message : String(error),
      jsonString: jsonString?.substring(0, 100),
    });
    return null;
  }
}

export class TaskQueue {
  private db: Database.Database;

  constructor(agentId: string, dbPath?: string) {
    const path =
      dbPath ||
      join(
        process.env.HOME || process.env.USERPROFILE || '~',
        '.claude-code-buddy',
        `a2a-tasks-${agentId}.db`
      );

    this.db = new Database(path);
    this.initializeSchema();
  }

  private initializeSchema(): void {
    const schemaPath = join(__dirname, 'schemas.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);
  }

  createTask(params: CreateTaskParams): Task {
    const now = new Date().toISOString();
    const taskId = uuidv4();

    const task: Task = {
      id: taskId,
      state: 'SUBMITTED',
      createdAt: now,
      updatedAt: now,
      name: params.name,
      description: params.description,
      priority: params.priority || 'normal',
      sessionId: params.sessionId,
      messages: [],
      artifacts: [],
      metadata: params.metadata,
    };

    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, state, name, description, priority, session_id, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      task.id,
      task.state,
      task.name || null,
      task.description || null,
      task.priority,
      task.sessionId || null,
      task.createdAt,
      task.updatedAt,
      task.metadata ? JSON.stringify(task.metadata) : null
    );

    if (params.initialMessage) {
      this.addMessage({
        taskId: task.id,
        role: params.initialMessage.role,
        parts: params.initialMessage.parts,
      });
      task.messages = this.getMessages(task.id);
    }

    return task;
  }

  getTask(taskId: string): Task | null {
    const stmt = this.db.prepare(`
      SELECT * FROM tasks WHERE id = ?
    `);

    const row = stmt.get(taskId) as TaskRow | undefined;
    if (!row) return null;

    return this.rowToTask(row);
  }

  listTasks(filter?: TaskFilter): TaskStatus[] {
    // Optimized query with JOINs to avoid N+1 problem
    let query = `
      SELECT
        t.*,
        COALESCE(m.message_count, 0) as message_count,
        COALESCE(a.artifact_count, 0) as artifact_count
      FROM tasks t
      LEFT JOIN (
        SELECT task_id, COUNT(*) as message_count
        FROM messages
        GROUP BY task_id
      ) m ON t.id = m.task_id
      LEFT JOIN (
        SELECT task_id, COUNT(*) as artifact_count
        FROM artifacts
        GROUP BY task_id
      ) a ON t.id = a.task_id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (filter?.state) {
      if (Array.isArray(filter.state)) {
        query += ` AND t.state IN (${filter.state.map(() => '?').join(',')})`;
        params.push(...filter.state);
      } else {
        query += ' AND t.state = ?';
        params.push(filter.state);
      }
    }

    if (filter?.priority) {
      if (Array.isArray(filter.priority)) {
        query += ` AND t.priority IN (${filter.priority.map(() => '?').join(',')})`;
        params.push(...filter.priority);
      } else {
        query += ' AND t.priority = ?';
        params.push(filter.priority);
      }
    }

    if (filter?.createdAfter) {
      query += ' AND t.created_at >= ?';
      params.push(filter.createdAfter);
    }

    if (filter?.createdBefore) {
      query += ' AND t.created_at <= ?';
      params.push(filter.createdBefore);
    }

    if (filter?.sessionId) {
      query += ' AND t.session_id = ?';
      params.push(filter.sessionId);
    }

    query += ' ORDER BY t.created_at DESC';

    if (filter?.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
    }

    if (filter?.offset) {
      query += ' OFFSET ?';
      params.push(filter.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as (TaskRow & { message_count: number; artifact_count: number })[];

    return rows.map((row) => ({
      id: row.id,
      state: row.state as TaskState,
      name: row.name || undefined,
      priority: (row.priority as TaskPriority) || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messageCount: row.message_count,
      artifactCount: row.artifact_count,
    }));
  }

  updateTaskStatus(taskId: string, params: UpdateTaskParams): boolean {
    const updates: string[] = [];
    const values: (string | number | TaskState)[] = [];

    if (params.state) {
      updates.push('state = ?');
      values.push(params.state);
    }

    if (params.name !== undefined) {
      updates.push('name = ?');
      values.push(params.name);
    }

    if (params.description !== undefined) {
      updates.push('description = ?');
      values.push(params.description);
    }

    if (params.priority) {
      updates.push('priority = ?');
      values.push(params.priority);
    }

    if (params.metadata) {
      updates.push('metadata = ?');
      values.push(JSON.stringify(params.metadata));
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());

    values.push(taskId);

    const stmt = this.db.prepare(`
      UPDATE tasks SET ${updates.join(', ')} WHERE id = ?
    `);

    const result = stmt.run(...values);
    return result.changes > 0;
  }

  addMessage(params: AddMessageParams): MessageCreated {
    const messageId = uuidv4();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO messages (id, task_id, role, parts, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      messageId,
      params.taskId,
      params.role,
      JSON.stringify(params.parts),
      now,
      params.metadata ? JSON.stringify(params.metadata) : null
    );

    this.db
      .prepare('UPDATE tasks SET updated_at = ? WHERE id = ?')
      .run(now, params.taskId);

    return {
      id: messageId,
      taskId: params.taskId,
      createdAt: now,
    };
  }

  getMessages(taskId: string): Message[] {
    const stmt = this.db.prepare(`
      SELECT * FROM messages WHERE task_id = ? ORDER BY created_at ASC
    `);

    const rows = stmt.all(taskId) as MessageRow[];

    return rows.map((row) => {
      const parts = safeJsonParse<MessagePart[]>(row.parts);
      const metadata = safeJsonParse<Record<string, unknown>>(row.metadata);

      return {
        id: row.id,
        taskId: row.task_id,
        role: row.role as 'user' | 'assistant',
        parts: parts || [],
        createdAt: row.created_at,
        metadata: metadata || undefined,
      };
    });
  }

  addArtifact(params: {
    taskId: string;
    type: string;
    name?: string;
    content: string | Buffer;
    encoding?: 'utf-8' | 'base64';
    metadata?: Record<string, unknown>;
  }): string {
    const artifactId = uuidv4();
    const now = new Date().toISOString();

    const contentStr =
      typeof params.content === 'string'
        ? params.content
        : params.content.toString('base64');
    const encoding = params.encoding || (typeof params.content === 'string' ? 'utf-8' : 'base64');
    const size =
      typeof params.content === 'string'
        ? Buffer.byteLength(params.content)
        : params.content.length;

    const stmt = this.db.prepare(`
      INSERT INTO artifacts (id, task_id, type, name, content, encoding, size, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      artifactId,
      params.taskId,
      params.type,
      params.name || null,
      contentStr,
      encoding,
      size,
      now,
      params.metadata ? JSON.stringify(params.metadata) : null
    );

    this.db
      .prepare('UPDATE tasks SET updated_at = ? WHERE id = ?')
      .run(now, params.taskId);

    return artifactId;
  }

  getArtifacts(taskId: string): Artifact[] {
    const stmt = this.db.prepare(`
      SELECT * FROM artifacts WHERE task_id = ? ORDER BY created_at ASC
    `);

    const rows = stmt.all(taskId) as ArtifactRow[];

    return rows.map((row) => {
      const metadata = safeJsonParse<Record<string, unknown>>(row.metadata);

      return {
        id: row.id,
        taskId: row.task_id,
        type: row.type,
        name: row.name || undefined,
        content:
          row.encoding === 'base64' ? Buffer.from(row.content, 'base64') : row.content,
        encoding: (row.encoding as 'utf-8' | 'base64') || undefined,
        size: row.size,
        createdAt: row.created_at,
        metadata: metadata || undefined,
      };
    });
  }

  close(): void {
    this.db.close();
  }

  private rowToTask(row: TaskRow): Task {
    const metadata = safeJsonParse<Record<string, unknown>>(row.metadata);

    return {
      id: row.id,
      state: row.state as TaskState,
      name: row.name || undefined,
      description: row.description || undefined,
      priority: (row.priority as TaskPriority) || undefined,
      sessionId: row.session_id || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messages: this.getMessages(row.id),
      artifacts: this.getArtifacts(row.id),
      metadata: metadata || undefined,
    };
  }

}
