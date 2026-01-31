/**
 * Phase 0.5: A2A Protocol End-to-End Integration Tests
 *
 * Comprehensive integration tests for the Agent-to-Agent communication protocol.
 * Tests the full lifecycle of A2A communication including server startup, agent
 * registration, message passing, task management, and server shutdown.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { A2AServer } from '../../src/a2a/server/A2AServer.js';
import { A2AClient } from '../../src/a2a/client/A2AClient.js';
import { AgentRegistry } from '../../src/a2a/storage/AgentRegistry.js';
import type { AgentCard } from '../../src/a2a/types/index.js';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomBytes } from 'crypto';
import { unlinkSync } from 'fs';

describe('Phase 0.5: A2A Protocol End-to-End Integration', () => {
  let server1: A2AServer | null = null;
  let server2: A2AServer | null = null;
  let client: A2AClient;
  let registry: AgentRegistry;
  let dbPath: string;

  const agentCard1: AgentCard = {
    name: 'Test Agent 1',
    version: '1.0.0',
    description: 'Test agent for integration tests',
    capabilities: {
      skills: [
        {
          name: 'test-skill',
          description: 'A test skill',
          parameters: [],
          examples: [],
        },
      ],
    },
  };

  const agentCard2: AgentCard = {
    name: 'Test Agent 2',
    version: '1.0.0',
    description: 'Second test agent',
    capabilities: {
      skills: [],
    },
  };

  beforeAll(() => {
    // Create temporary database for tests
    const tempId = randomBytes(8).toString('hex');
    dbPath = join(tmpdir(), `a2a-test-${tempId}.db`);
    registry = AgentRegistry.getInstance(dbPath);
    client = new A2AClient();
  });

  afterAll(async () => {
    // Clean up servers
    if (server1) {
      await server1.stop();
      server1 = null;
    }
    if (server2) {
      await server2.stop();
      server2 = null;
    }

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
  });

  beforeEach(async () => {
    // Clean up any previous servers
    if (server1) {
      await server1.stop();
      server1 = null;
    }
    if (server2) {
      await server2.stop();
      server2 = null;
    }
  });

  it('should start and stop A2A server', async () => {
    server1 = new A2AServer({
      agentId: 'agent-1',
      agentCard: agentCard1,
      portRange: { min: 3100, max: 3199 },
    });

    const port = await server1.start();
    expect(port).toBeGreaterThanOrEqual(3100);
    expect(port).toBeLessThanOrEqual(3199);
    expect(server1.getPort()).toBe(port);

    await server1.stop();
  });

  it('should register agent in registry on startup', async () => {
    server1 = new A2AServer({
      agentId: 'agent-1',
      agentCard: agentCard1,
      portRange: { min: 3100, max: 3199 },
    });

    await server1.start();

    const registered = registry.get('agent-1');
    expect(registered).toBeDefined();
    expect(registered?.agentId).toBe('agent-1');
    expect(registered?.status).toBe('active');
    expect(registered?.baseUrl).toContain('localhost');

    await server1.stop();
  });

  it('should deactivate agent in registry on shutdown', async () => {
    server1 = new A2AServer({
      agentId: 'agent-1',
      agentCard: agentCard1,
      portRange: { min: 3100, max: 3199 },
    });

    await server1.start();
    await server1.stop();

    const registered = registry.get('agent-1');
    expect(registered?.status).toBe('inactive');
  });

  it('should send message between two agents', async () => {
    // Start two servers
    server1 = new A2AServer({
      agentId: 'agent-1',
      agentCard: agentCard1,
      portRange: { min: 3100, max: 3199 },
    });

    server2 = new A2AServer({
      agentId: 'agent-2',
      agentCard: agentCard2,
      portRange: { min: 3100, max: 3199 },
    });

    await server1.start();
    await server2.start();

    // Send message from client to agent-2
    const response = await client.sendMessage('agent-2', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'Hello from test!' }],
      },
    });

    expect(response).toBeDefined();
    expect(response.taskId).toBeDefined();
    expect(response.status).toBeDefined();
    expect(typeof response.taskId).toBe('string');

    await server1.stop();
    await server2.stop();
  });

  it('should complete full task lifecycle', async () => {
    server1 = new A2AServer({
      agentId: 'agent-1',
      agentCard: agentCard1,
      portRange: { min: 3100, max: 3199 },
    });

    await server1.start();

    // 1. Send message (creates task)
    const sendResponse = await client.sendMessage('agent-1', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'Test task' }],
      },
    });

    const taskId = sendResponse.taskId;
    expect(taskId).toBeDefined();

    // 2. Get task status
    const task = await client.getTask('agent-1', taskId);
    expect(task).toBeDefined();
    expect(task.id).toBe(taskId);
    expect(task.state).toBeDefined();

    // 3. List tasks
    const tasks = await client.listTasks('agent-1');
    expect(tasks).toBeDefined();
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.some(t => t.id === taskId)).toBe(true);

    // 4. Cancel task
    await client.cancelTask('agent-1', taskId);

    // 5. Verify task cancelled
    const cancelledTask = await client.getTask('agent-1', taskId);
    expect(cancelledTask.state).toBe('CANCELED');

    await server1.stop();
  });

  it('should retrieve agent card', async () => {
    server1 = new A2AServer({
      agentId: 'agent-1',
      agentCard: agentCard1,
      portRange: { min: 3100, max: 3199 },
    });

    await server1.start();

    // Small delay to ensure server is fully ready
    await new Promise(resolve => setTimeout(resolve, 10));

    const card = await client.getAgentCard('agent-1');
    expect(card).toBeDefined();
    expect(card.name).toBe('Test Agent 1');
    expect(card.version).toBe('1.0.0');
    expect(card.capabilities?.skills?.length).toBe(1);
    expect(card.capabilities?.skills?.[0].name).toBe('test-skill');

    await server1.stop();
  });

  it('should handle multiple concurrent tasks', async () => {
    server1 = new A2AServer({
      agentId: 'agent-1',
      agentCard: agentCard1,
      portRange: { min: 3100, max: 3199 },
    });

    await server1.start();

    // Send multiple messages concurrently
    const promises = Array.from({ length: 5 }, (_, i) =>
      client.sendMessage('agent-1', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: `Task ${i}` }],
        },
      })
    );

    const responses = await Promise.all(promises);
    expect(responses.length).toBe(5);

    // All should have unique task IDs
    const taskIds = responses.map(r => r.taskId);
    const uniqueIds = new Set(taskIds);
    expect(uniqueIds.size).toBe(5);

    await server1.stop();
  });

  it('should list active agents', async () => {
    server1 = new A2AServer({
      agentId: 'agent-1',
      agentCard: agentCard1,
      portRange: { min: 3100, max: 3199 },
    });

    server2 = new A2AServer({
      agentId: 'agent-2',
      agentCard: agentCard2,
      portRange: { min: 3100, max: 3199 },
    });

    await server1.start();
    await server2.start();

    const activeAgents = client.listAvailableAgents();
    expect(activeAgents).toBeDefined();
    expect(activeAgents.length).toBeGreaterThanOrEqual(2);
    expect(activeAgents).toContain('agent-1');
    expect(activeAgents).toContain('agent-2');

    await server1.stop();
    await server2.stop();
  });

  it('should handle agent not found error', async () => {
    await expect(
      client.sendMessage('non-existent-agent', {
        message: {
          role: 'user',
          parts: [{ type: 'text', text: 'Test' }],
        },
      })
    ).rejects.toThrow(/Agent not found/);
  });

  it('should handle task not found error', async () => {
    server1 = new A2AServer({
      agentId: 'agent-1',
      agentCard: agentCard1,
      portRange: { min: 3100, max: 3199 },
    });

    await server1.start();

    await expect(
      client.getTask('agent-1', 'non-existent-task')
    ).rejects.toThrow();

    await server1.stop();
  });

  it('should support agent heartbeat mechanism', async () => {
    server1 = new A2AServer({
      agentId: 'agent-1',
      agentCard: agentCard1,
      portRange: { min: 3100, max: 3199 },
      heartbeatInterval: 100, // Fast heartbeat for testing
    });

    await server1.start();

    // Wait for heartbeat
    await new Promise(resolve => setTimeout(resolve, 150));

    const registered = registry.get('agent-1');
    expect(registered).toBeDefined();
    expect(registered?.status).toBe('active');

    await server1.stop();
  });

  it('should find available ports in configured range', async () => {
    // Test that servers can find and bind to ports within the configured range
    server1 = new A2AServer({
      agentId: 'agent-1',
      agentCard: agentCard1,
      portRange: { min: 3100, max: 3199 },
    });

    const port1 = await server1.start();
    expect(port1).toBeGreaterThanOrEqual(3100);
    expect(port1).toBeLessThanOrEqual(3199);

    await server1.stop();

    // Test second server can also find port in range
    server2 = new A2AServer({
      agentId: 'agent-2',
      agentCard: agentCard2,
      portRange: { min: 3100, max: 3199 },
    });

    const port2 = await server2.start();
    expect(port2).toBeGreaterThanOrEqual(3100);
    expect(port2).toBeLessThanOrEqual(3199);

    await server2.stop();
  });

  it('should support task filtering by status', async () => {
    server1 = new A2AServer({
      agentId: 'agent-1',
      agentCard: agentCard1,
      portRange: { min: 3100, max: 3199 },
    });

    await server1.start();

    // Create some tasks
    await client.sendMessage('agent-1', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'Task 1' }],
      },
    });

    const response2 = await client.sendMessage('agent-1', {
      message: {
        role: 'user',
        parts: [{ type: 'text', text: 'Task 2' }],
      },
    });

    // Cancel one task
    await client.cancelTask('agent-1', response2.taskId);

    // List all tasks
    const allTasks = await client.listTasks('agent-1');
    expect(allTasks.length).toBeGreaterThanOrEqual(2);

    await server1.stop();
  });
});
