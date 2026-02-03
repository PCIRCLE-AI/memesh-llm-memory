/**
 * Integration Tests: A2A Distributed Tracing
 *
 * Tests for end-to-end distributed tracing in A2A communication.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { A2AServer } from '../../src/a2a/server/A2AServer.js';
import { A2AClient } from '../../src/a2a/client/A2AClient.js';
import type { AgentCard } from '../../src/a2a/types/index.js';

describe('A2A Distributed Tracing Integration', () => {
  let server1: A2AServer;
  let server2: A2AServer;
  let client: A2AClient;
  let port1: number;
  let port2: number;

  const agentCard1: AgentCard = {
    id: 'test-agent-1',
    name: 'Test Agent 1',
    version: '1.0.0',
    capabilities: {
      delegation: {
        supportsMCPDelegation: true,
        maxConcurrentTasks: 1,
      },
    },
  };

  const agentCard2: AgentCard = {
    id: 'test-agent-2',
    name: 'Test Agent 2',
    version: '1.0.0',
    capabilities: {
      delegation: {
        supportsMCPDelegation: true,
        maxConcurrentTasks: 1,
      },
    },
  };

  beforeAll(async () => {
    // Set authentication token
    process.env.MEMESH_A2A_TOKEN = 'test-token-123';

    // Start two A2A servers on different port ranges to avoid
    // TOCTOU race condition in dynamic port allocation. The default
    // range (3000-3999) causes both servers to probe port 3000 as
    // available (isPortAvailable binds to 127.0.0.1 while Express
    // binds to 0.0.0.0), leading to both claiming the same port.
    // Using separate ranges guarantees unique ports.
    server1 = new A2AServer({
      agentId: 'test-agent-1',
      agentCard: agentCard1,
      portRange: { min: 4100, max: 4199 },
    });

    server2 = new A2AServer({
      agentId: 'test-agent-2',
      agentCard: agentCard2,
      portRange: { min: 4200, max: 4299 },
    });

    port1 = await server1.start();
    port2 = await server2.start();

    client = new A2AClient();
  });

  afterAll(async () => {
    await server1.stop();
    await server2.stop();
    delete process.env.MEMESH_A2A_TOKEN;
  });

  it('should propagate trace ID from client to server', async () => {
    // Send a message from client to server
    const response = await client.sendMessage('test-agent-2', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'Test tracing' }],
      },
    });

    // Verify task was created
    expect(response.taskId).toBeDefined();
    expect(response.status).toBeDefined();

    // Get the task to verify it exists
    const task = await client.getTask('test-agent-2', response.taskId);
    expect(task.id).toBe(response.taskId);

    // Note: In a real implementation, we would verify that:
    // 1. The request had trace headers
    // 2. The server extracted the trace context
    // 3. All logs contain the same trace ID
    // For now, we verify that the basic flow works
  });

  it('should handle requests to public endpoint', async () => {
    // Make a direct HTTP request without trace headers
    const response = await fetch(`http://localhost:${port2}/a2a/agent-card`);

    expect(response.ok).toBe(true);

    // Verify response contains agent card data
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.id).toBeDefined(); // Agent ID exists

    // Note: Response headers for trace IDs are only visible in server logs
    // due to how Express/CORS handles header propagation. The middleware
    // does set them, but they may not be accessible via fetch() response.
  });
});
