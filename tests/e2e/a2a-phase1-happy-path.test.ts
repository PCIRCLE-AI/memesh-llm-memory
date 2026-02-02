/**
 * A2A Protocol Phase 1.0 - E2E Happy Path Test
 *
 * Tests complete MCP Client Delegation workflow:
 * 1. Agent sends task
 * 2. Task enters pending queue
 * 3. MCP Client polls and retrieves task
 * 4. MCP Client executes (mocked)
 * 5. MCP Client reports result
 * 6. Agent retrieves completed task
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { withE2EResource, getDynamicPort } from '../utils/e2e-helpers.js';
import { A2AServer } from '../../src/a2a/server/A2AServer.js';
import { TaskQueue } from '../../src/a2a/storage/TaskQueue.js';
import { MCPTaskDelegator } from '../../src/a2a/delegator/MCPTaskDelegator.js';
import { AgentRegistry } from '../../src/a2a/storage/AgentRegistry.js';
import { logger } from '../../src/utils/logger.js';

describe('A2A Phase 1.0 - E2E Happy Path', () => {
  let server: A2AServer;
  let taskQueue: TaskQueue;
  let delegator: MCPTaskDelegator;
  let registry: AgentRegistry;
  let actualPort: number;
  let baseUrl: string;
  const testToken = 'test-e2e-token-12345';
  const agentId = 'test-agent-e2e';

  beforeAll(async () => {
    // Set test token
    process.env.MEMESH_A2A_TOKEN = testToken;

    // Create test agent card
    const testAgentCard = {
      id: agentId,
      name: 'Test E2E Agent',
      version: '1.0.0',
      capabilities: {
        delegation: {
          supportsMCPDelegation: true,
          maxConcurrentTasks: 1
        }
      },
      description: 'E2E test agent for Phase 1.0'
    };

    // Start server with dynamic port allocation
    server = new A2AServer({
      agentId: agentId,
      agentCard: testAgentCard,
      ...getDynamicPort()
    });
    actualPort = await server.start();
    baseUrl = `http://localhost:${actualPort}`;

    logger.info(`[Test] Server started on dynamic port: ${actualPort}`);

    // Get components from server
    taskQueue = (server as any).taskQueue;
    delegator = (server as any).delegator;
    registry = AgentRegistry.getInstance();
  });

  afterAll(async () => {
    await server.stop();
    delete process.env.MEMESH_A2A_TOKEN;
  });

  it(
    'should complete full MCP Client Delegation workflow',
    withE2EResource(async () => {
      // Step 1: Agent A sends task via a2a-send-message (A2A Protocol format)
      const sendResponse = await fetch(`${baseUrl}/a2a/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${testToken}`
        },
        body: JSON.stringify({
          message: {
            role: 'user',
            parts: [
              {
                type: 'text',
                text: 'Calculate 2+2'
              }
            ]
          }
        })
      });

      expect(sendResponse.status).toBe(200);
      const sendResult = await sendResponse.json();
      expect(sendResult.success).toBe(true);
      const taskId = sendResult.data.taskId;
      expect(taskId).toBeDefined();
      expect(sendResult.data.status).toBe('SUBMITTED');

      // Step 2: Verify task is in TaskQueue (SUBMITTED state)
      const task = taskQueue.getTask(taskId);
      expect(task).not.toBeNull();
      expect(task?.state).toBe('SUBMITTED'); // Initial state in TaskQueue

      // Step 3: MCP Client polls via a2a-list-tasks tool
      // (Simulating MCP tool behavior - tool queries TaskQueue and adds to delegator)
      const taskMessage = task?.messages[0];
      const taskText = taskMessage?.parts.find(p => p.type === 'text')?.text || '';
      await delegator.addTask(taskId, taskText, 'high', agentId);

      // Step 4: Verify task is now in MCPTaskDelegator pending queue
      const pendingTasks = await delegator.getPendingTasks(agentId);
      expect(pendingTasks).toHaveLength(1);
      expect(pendingTasks[0].taskId).toBe(taskId);
      expect(pendingTasks[0].status).toBe('PENDING');
      expect(pendingTasks[0].task).toBe('Calculate 2+2');

      // Step 5: MCP Client marks task as in-progress (when starting execution)
      await delegator.markTaskInProgress(taskId);
      const pendingAfterStart = await delegator.getPendingTasks(agentId);
      expect(pendingAfterStart).toHaveLength(0); // IN_PROGRESS tasks not in pending

      // Step 6: MCP Client executes task (mock buddy-do execution)
      const executionResult = { answer: 4, calculation: '2+2=4' };

      // Step 7: MCP Client reports result via a2a-report-result
      // (Simulating MCP tool call - would happen via MCP protocol)
      const reportSuccess = await delegator.removeTask(taskId);
      const updateSuccess = taskQueue.updateTaskStatus(taskId, {
        state: 'COMPLETED',
        metadata: { result: executionResult }
      });
      expect(updateSuccess).toBe(true);

      // Step 8: Verify task removed from MCPTaskDelegator pending queue
      const finalPending = await delegator.getPendingTasks(agentId);
      expect(finalPending).toHaveLength(0);

      // Step 9: Agent A retrieves result via GET /a2a/tasks/:taskId
      const getResponse = await fetch(`${baseUrl}/a2a/tasks/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${testToken}`
        }
      });

      expect(getResponse.status).toBe(200);
      const completedTaskResponse = await getResponse.json();
      expect(completedTaskResponse.success).toBe(true);

      // Step 10: Verify task status is COMPLETED with result
      const completedTask = completedTaskResponse.data;
      expect(completedTask.state).toBe('COMPLETED');
      expect(completedTask.metadata).toBeDefined();
      expect(completedTask.metadata.result).toEqual(executionResult);
    })
  );
});
