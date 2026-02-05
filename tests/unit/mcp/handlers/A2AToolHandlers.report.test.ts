import { describe, it, expect, beforeEach, vi } from 'vitest';
import { A2AToolHandlers } from '../../../../src/mcp/handlers/A2AToolHandlers.js';
import type { A2AClient } from '../../../../src/a2a/client/A2AClient.js';
import type { AgentRegistry } from '../../../../src/core/AgentRegistry.js';
import {
  createMockA2AClient,
  createMockAgentRegistry,
} from '../../../utils/mock-factories.js';

describe('A2AToolHandlers - Report Result with State Update', () => {
  let handlers: A2AToolHandlers;
  let mockClient: A2AClient;
  let mockRegistry: AgentRegistry;

  beforeEach(() => {
    mockClient = createMockA2AClient({
      updateTaskState: vi.fn().mockResolvedValue(undefined),
    });
    mockRegistry = createMockAgentRegistry();
    handlers = new A2AToolHandlers(mockClient, mockRegistry);
  });

  it('should update task state to COMPLETED on successful result', async () => {
    const updateTaskStateSpy = vi.spyOn(mockClient, 'updateTaskState').mockResolvedValue(undefined);

    await handlers.handleA2AReportResult({
      taskId: 'task-123',
      success: true,
      result: { answer: 4 },
    });

    expect(updateTaskStateSpy).toHaveBeenCalledWith('task-123', 'COMPLETED', {
      result: { answer: 4 },
    });
  });

  it('should update task state to FAILED on failed result', async () => {
    const updateTaskStateSpy = vi.spyOn(mockClient, 'updateTaskState').mockResolvedValue(undefined);

    await handlers.handleA2AReportResult({
      taskId: 'task-123',
      success: false,
      error: 'Division by zero',
    });

    expect(updateTaskStateSpy).toHaveBeenCalledWith('task-123', 'FAILED', {
      error: 'Division by zero',
    });
  });
});
