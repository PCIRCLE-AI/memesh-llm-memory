import { describe, it, expect, beforeEach } from 'vitest';
import { SimpleDatabaseFactory } from '../../../../config/simple-config';
import { TaskRepository } from '../TaskRepository';

describe('TaskRepository', () => {
  let db: any;
  let repo: TaskRepository;

  beforeEach(() => {
    db = SimpleDatabaseFactory.createTestDatabase();

    // Create tasks table
    db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        input TEXT NOT NULL,
        task_type TEXT,
        origin TEXT,
        status TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        started_at DATETIME,
        completed_at DATETIME,
        metadata TEXT
      )
    `);

    repo = new TaskRepository(db);
  });

  it('should create task', async () => {
    const task = await repo.createTask({ foo: 'bar' }, { test: true });

    expect(task.id).toBeDefined();
    expect(task.input).toEqual({ foo: 'bar' });
    expect(task.status).toBe('pending');
    expect(task.metadata).toEqual({ test: true });
  });

  it('should get task by id', async () => {
    const created = await repo.createTask({ foo: 'bar' });
    const retrieved = await repo.getTask(created.id);

    expect(retrieved).toEqual(created);
  });

  it('should return null for non-existent task', async () => {
    const task = await repo.getTask('non-existent');
    expect(task).toBeNull();
  });

  it('should update task status', async () => {
    const task = await repo.createTask({ foo: 'bar' });

    await repo.updateTask(task.id, { status: 'completed' });

    const updated = await repo.getTask(task.id);
    expect(updated?.status).toBe('completed');
  });

  it('should list tasks with filters', async () => {
    await repo.createTask({ foo: '1' });
    await repo.createTask({ foo: '2' });
    await repo.createTask({ foo: '3' });

    const tasks = await repo.listTasks({ limit: 2 });

    expect(tasks).toHaveLength(2);
  });
});
