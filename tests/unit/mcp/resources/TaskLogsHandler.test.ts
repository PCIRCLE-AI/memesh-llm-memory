// tests/unit/mcp/resources/TaskLogsHandler.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { TaskLogsHandler } from '../../../../src/mcp/resources/handlers/TaskLogsHandler';

describe('TaskLogsHandler', () => {
  let handler: TaskLogsHandler;

  beforeEach(() => {
    handler = new TaskLogsHandler();
  });

  it('should return feature limitation disclosure for any task ID', async () => {
    const result = await handler.handle({ taskId: 'task-123' });

    expect(result.uri).toBe('ccb://task/task-123/logs');
    expect(result.mimeType).toBe('text/plain');
    expect(result.text).toContain('Task Logs - Feature Not Yet Available');
    expect(result.text).toContain('Task ID: task-123');
    expect(result.text).toContain('Planned for future release');
  });

  it('should explain missing infrastructure for non-existent task', async () => {
    const result = await handler.handle({ taskId: 'non-existent' });
    expect(result.text).toContain('Task Logs - Feature Not Yet Available');
    expect(result.text).toContain('This feature requires');
    expect(result.text).toContain('Current workaround');
  });
});
