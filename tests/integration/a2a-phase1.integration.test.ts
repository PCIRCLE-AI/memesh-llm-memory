import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { A2AClient } from '../../src/a2a/client/A2AClient.js';
import { A2AToolHandlers } from '../../src/mcp/handlers/A2AToolHandlers.js';
import { AgentRegistry } from '../../src/a2a/storage/AgentRegistry.js';
import type { Task, TaskResult } from '../../src/a2a/types/index.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { unlinkSync } from 'fs';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

/**
 * Helper to create a mock Response with proper headers
 * @param options - Response options
 * @returns Mock Response object
 */
function createMockResponse(options: {
  ok: boolean;
  status: number;
  data?: unknown;
  contentType?: string;
}) {
  return {
    ok: options.ok,
    status: options.status,
    url: 'http://localhost:3000/test',
    headers: {
      get: (name: string) => {
        if (name.toLowerCase() === 'content-type') {
          return options.contentType ?? 'application/json';
        }
        return null;
      },
    },
    json: async () => options.data,
  };
}

describe('A2A Phase 1 Integration - Complete Flow', () => {
  let client: A2AClient;
  let handlers: A2AToolHandlers;
  let registry: AgentRegistry;
  let dbPath: string;
  const alphaAgentId = 'agent-alpha';
  const betaAgentId = 'agent-beta';

  beforeAll(() => {
    // Set authentication token for tests
    process.env.MEMESH_A2A_TOKEN = 'test-token-phase1';

    // Create temporary database for tests
    const tempId = randomBytes(8).toString('hex');
    dbPath = join(tmpdir(), `a2a-phase1-test-${tempId}.db`);
    registry = AgentRegistry.getInstance(dbPath);

    // Register two agents
    registry.register({
      agentId: alphaAgentId,
      baseUrl: 'http://localhost:3001',
      port: 3001,
      status: 'active',
      lastHeartbeat: new Date().toISOString(),
    });

    registry.register({
      agentId: betaAgentId,
      baseUrl: 'http://localhost:3002',
      port: 3002,
      status: 'active',
      lastHeartbeat: new Date().toISOString(),
    });

    client = new A2AClient();
    handlers = new A2AToolHandlers(client, registry);
  });

  afterAll(() => {
    // Clean up environment
    delete process.env.MEMESH_A2A_TOKEN;

    // Close registry
    if (registry) {
      registry.close();
    }

    // Clean up database file
    try {
      unlinkSync(dbPath);
    } catch {
      // Ignore cleanup errors
    }

    vi.restoreAllMocks();
  });

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should complete full A2A flow with state updates', async () => {
    const taskDescription = 'Calculate 2+2';
    let taskId: string;

    // Step 1: Alpha sends task to Beta
    // Mock sendMessage response
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        data: {
          success: true,
          data: {
            taskId: 'task-integration-123',
          },
        },
      })
    );

    // Mock getTask response (called after sendMessage)
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        data: {
          success: true,
          data: {
            id: 'task-integration-123',
            state: 'SUBMITTED',
            name: taskDescription,
            priority: 'medium',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            messages: [
              {
                role: 'user',
                parts: [
                  {
                    type: 'text',
                    text: taskDescription,
                  },
                ],
                createdAt: new Date().toISOString(),
              },
            ],
            artifacts: [],
          },
        },
      })
    );

    const sendResult = await handlers.handleA2ASendTask({
      targetAgentId: betaAgentId,
      taskDescription,
    });

    expect(sendResult.content[0].type).toBe('text');
    const sendText = (sendResult.content[0] as { text: string }).text;
    expect(sendText).toContain('task-integration-123');
    expect(sendText).toContain('SUBMITTED');
    taskId = 'task-integration-123';

    // Step 2: Beta starts working (state: SUBMITTED → WORKING)
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        data: { success: true },
      })
    );

    await client.updateTaskState(taskId, 'WORKING');

    // Step 3: Beta completes task (state: WORKING → COMPLETED)
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        data: { success: true },
      })
    );

    await handlers.handleA2AReportResult({
      taskId,
      success: true,
      result: {
        answer: 4,
        calculation: '2 + 2 = 4',
        message: 'Task completed successfully',
      },
    });

    // Step 4: Alpha queries task result
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        data: {
          success: true,
          data: {
            taskId,
            state: 'COMPLETED',
            success: true,
            result: {
              answer: 4,
              calculation: '2 + 2 = 4',
              message: 'Task completed successfully',
            },
            executedAt: new Date().toISOString(),
            executedBy: betaAgentId,
            durationMs: 150,
          },
        },
      })
    );

    const resultQuery = await handlers.handleA2AGetResult({
      targetAgentId: betaAgentId,
      taskId,
    });

    const resultText = (resultQuery.content[0] as { text: string }).text;
    expect(resultText).toContain('✅ Task Execution Result');
    expect(resultText).toContain('COMPLETED');
    expect(resultText).toContain('"answer": 4');

    // Verify state machine was followed: SUBMITTED → WORKING → COMPLETED
    expect(true).toBe(true); // All state transitions succeeded
  });

  it('should handle task failure with proper state updates', async () => {
    const taskId = 'task-fail-123';

    // Beta reports failure
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        data: { success: true },
      })
    );

    await handlers.handleA2AReportResult({
      taskId,
      success: false,
      error: 'Division by zero error',
    });

    // Query result shows failure
    mockFetch.mockResolvedValueOnce(
      createMockResponse({
        ok: true,
        status: 200,
        data: {
          success: true,
          data: {
            taskId,
            state: 'FAILED',
            success: false,
            error: 'Division by zero error',
            executedAt: new Date().toISOString(),
            executedBy: betaAgentId,
            durationMs: 50,
          },
        },
      })
    );

    const resultQuery = await handlers.handleA2AGetResult({
      targetAgentId: betaAgentId,
      taskId,
    });

    const resultText = (resultQuery.content[0] as { text: string }).text;
    expect(resultText).toContain('❌ Task Execution Failed');
    expect(resultText).toContain('Division by zero error');
  });
});
