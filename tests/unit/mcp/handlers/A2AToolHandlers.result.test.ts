import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { A2AToolHandlers } from '../../../../src/mcp/handlers/A2AToolHandlers.js';
import { ValidationError } from '../../../../src/errors/index.js';
import { A2AClient } from '../../../../src/a2a/client/A2AClient.js';
import { AgentRegistry } from '../../../../src/a2a/storage/AgentRegistry.js';
import type { TaskResult } from '../../../../src/a2a/types/index.js';

describe('A2AToolHandlers - Get Task Result', () => {
  let handlers: A2AToolHandlers;
  let mockClient: A2AClient;
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = AgentRegistry.getInstance();
    mockClient = new A2AClient();
    handlers = new A2AToolHandlers(mockClient, registry);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should handle a2a-get-result with successful result', async () => {
    const mockResult: TaskResult = {
      taskId: 'task-123',
      state: 'COMPLETED',
      success: true,
      result: { answer: 4, calculation: '2 + 2 = 4' },
      executedAt: '2026-02-05T10:00:00.000Z',
      executedBy: 'agent-456',
      durationMs: 150,
    };

    vi.spyOn(mockClient, 'getTaskResult').mockResolvedValue(mockResult);

    const result = await handlers.handleA2AGetResult({
      targetAgentId: 'agent-456',
      taskId: 'task-123',
    });

    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('✅ Task Execution Result');
    expect(text).toContain('task-123');
    expect(text).toContain('COMPLETED');
    expect(text).toContain('"answer": 4');
    expect(text).toContain('150 ms');
  });

  it('should handle a2a-get-result with failed result', async () => {
    const mockResult: TaskResult = {
      taskId: 'task-123',
      state: 'FAILED',
      success: false,
      error: 'Division by zero',
      executedAt: '2026-02-05T10:00:00.000Z',
      executedBy: 'agent-456',
      durationMs: 50,
    };

    vi.spyOn(mockClient, 'getTaskResult').mockResolvedValue(mockResult);

    const result = await handlers.handleA2AGetResult({
      targetAgentId: 'agent-456',
      taskId: 'task-123',
    });

    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('❌ Task Execution Failed');
    expect(text).toContain('Division by zero');
  });

  it('should throw ValidationError for invalid input', async () => {
    await expect(
      handlers.handleA2AGetResult({
        targetAgentId: '', // Invalid: empty string
        taskId: 'task-123',
      })
    ).rejects.toThrow(ValidationError);
  });
});
