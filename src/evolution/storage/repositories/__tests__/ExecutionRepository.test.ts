import { describe, it, expect, beforeEach } from 'vitest';
import { SimpleDatabaseFactory } from '../../../../config/simple-config';
import { ExecutionRepository } from '../ExecutionRepository';
import { v4 as uuid } from 'uuid';

describe('ExecutionRepository', () => {
  let db: any;
  let repo: ExecutionRepository;
  let taskId: string;

  beforeEach(() => {
    db = SimpleDatabaseFactory.createTestDatabase();

    // Create tasks table (required for foreign key)
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        input TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at DATETIME NOT NULL
      )
    `);

    // Create executions table
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
      )
    `);

    // Insert a test task
    taskId = uuid();
    db.prepare(`
      INSERT INTO tasks (id, input, status, created_at)
      VALUES (?, ?, ?, ?)
    `).run(taskId, JSON.stringify({ test: true }), 'pending', new Date().toISOString());

    repo = new ExecutionRepository(db);
  });

  it('should create execution with auto-incremented attempt number', async () => {
    const execution = await repo.createExecution(taskId, { test: true });

    expect(execution.id).toBeDefined();
    expect(execution.task_id).toBe(taskId);
    expect(execution.attempt_number).toBe(1);
    expect(execution.status).toBe('running');
    expect(execution.metadata).toEqual({ test: true });
  });

  it('should get execution by id', async () => {
    const created = await repo.createExecution(taskId);
    const retrieved = await repo.getExecution(created.id);

    expect(retrieved).toEqual(created);
  });

  it('should return null for non-existent execution', async () => {
    const execution = await repo.getExecution('non-existent');
    expect(execution).toBeNull();
  });

  it('should update execution status', async () => {
    const execution = await repo.createExecution(taskId);

    await repo.updateExecution(execution.id, {
      status: 'completed',
      result: { success: true },
    });

    const updated = await repo.getExecution(execution.id);
    expect(updated?.status).toBe('completed');
    expect(updated?.result).toEqual({ success: true });
  });

  it('should list executions for a task', async () => {
    await repo.createExecution(taskId);
    await repo.createExecution(taskId);
    await repo.createExecution(taskId);

    const executions = await repo.listExecutions(taskId);

    expect(executions).toHaveLength(3);
    expect(executions[0].attempt_number).toBe(1);
    expect(executions[1].attempt_number).toBe(2);
    expect(executions[2].attempt_number).toBe(3);
  });
});
