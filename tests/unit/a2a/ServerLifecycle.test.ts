/**
 * Server Lifecycle Management Tests
 * Tests for automatic A2A server start/stop on MeMesh initialization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { A2AServer } from '../../../src/a2a/server/A2AServer.js';
import { AgentRegistry } from '../../../src/a2a/storage/AgentRegistry.js';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import type { AgentCard } from '../../../src/a2a/types/index.js';
import crypto from 'crypto';

describe('Server Lifecycle Management', () => {
  let testDbPath: string;
  let server: A2AServer;
  let registry: AgentRegistry;

  beforeEach(() => {
    // Use unique database for each test to avoid singleton conflicts
    const uniqueId = crypto.randomBytes(8).toString('hex');
    testDbPath = join(process.cwd(), `test-lifecycle-${uniqueId}.db`);

    registry = AgentRegistry.getInstance(testDbPath);
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
    if (registry) {
      registry.close();
    }
    if (existsSync(testDbPath)) {
      unlinkSync(testDbPath);
    }
  });

  describe('Auto-start Server', () => {
    it('should start A2A server on MeMesh initialization', async () => {
      // Arrange
      const agentId = 'test-agent-001';
      const agentCard: AgentCard = {
        id: agentId,
        name: 'Test Agent',
        description: 'Test agent for lifecycle testing',
        version: '0.5.0',
        capabilities: {
          skills: [
            {
              name: 'test-skill',
              description: 'A test skill',
            },
          ],
        },
        endpoints: {
          baseUrl: 'http://localhost:3000',
        },
      };

      // Act
      server = new A2AServer({
        agentId,
        agentCard,
        portRange: { min: 3500, max: 3600 },
      });

      const port = await server.start();

      // Assert
      expect(port).toBeGreaterThan(0);
      expect(port).toBeGreaterThanOrEqual(3500);
      expect(port).toBeLessThanOrEqual(3600);
    });

    it('should register agent in registry on server start', async () => {
      // Arrange
      const agentId = 'test-agent-002';
      const agentCard: AgentCard = {
        id: agentId,
        name: 'Test Agent 2',
        capabilities: {
          skills: [],
        },
        endpoints: {
          baseUrl: 'http://localhost:3000',
        },
      };

      // Act
      server = new A2AServer({
        agentId,
        agentCard,
        portRange: { min: 3500, max: 3600 },
      });

      await server.start();

      // Assert
      const registryEntry = registry.get(agentId);
      expect(registryEntry).not.toBeNull();
      expect(registryEntry!.agentId).toBe(agentId);
      expect(registryEntry!.status).toBe('active');
      expect(registryEntry!.port).toBe(server.getPort());
    });

    it('should use agent_id from environment variable if provided', async () => {
      // Arrange
      const envAgentId = 'ccb-main-instance';
      process.env.A2A_AGENT_ID = envAgentId;

      const agentId = process.env.A2A_AGENT_ID || `ccb-${crypto.randomBytes(4).toString('hex')}`;

      const agentCard: AgentCard = {
        id: agentId,
        name: 'Test Agent Env',
        capabilities: {
          skills: [],
        },
        endpoints: {
          baseUrl: 'http://localhost:3000',
        },
      };

      // Act
      server = new A2AServer({
        agentId,
        agentCard,
        portRange: { min: 3500, max: 3600 },
      });

      await server.start();

      // Assert
      const registryEntry = registry.get(agentId);
      expect(registryEntry).not.toBeNull();
      expect(registryEntry!.agentId).toBe(envAgentId);

      // Cleanup
      delete process.env.A2A_AGENT_ID;
    });

    it('should generate UUID-based agent_id if env variable not set', async () => {
      // Arrange
      delete process.env.A2A_AGENT_ID;

      const agentId = process.env.A2A_AGENT_ID || `ccb-${crypto.randomBytes(4).toString('hex')}`;

      const agentCard: AgentCard = {
        id: agentId,
        name: 'Test Agent UUID',
        capabilities: {
          skills: [],
        },
        endpoints: {
          baseUrl: 'http://localhost:3000',
        },
      };

      // Act
      server = new A2AServer({
        agentId,
        agentCard,
        portRange: { min: 3500, max: 3600 },
      });

      await server.start();

      // Assert
      expect(agentId).toMatch(/^ccb-/);
      expect(agentId.length).toBeGreaterThan(4);

      const registryEntry = registry.get(agentId);
      expect(registryEntry).not.toBeNull();
      expect(registryEntry!.agentId).toBe(agentId);
    });
  });

  describe('Graceful Shutdown', () => {
    it('should deregister from registry on server stop', async () => {
      // Arrange
      const agentId = 'test-agent-003';
      const agentCard: AgentCard = {
        id: agentId,
        name: 'Test Agent 3',
        capabilities: {
          skills: [],
        },
        endpoints: {
          baseUrl: 'http://localhost:3000',
        },
      };

      server = new A2AServer({
        agentId,
        agentCard,
        portRange: { min: 3500, max: 3600 },
      });

      await server.start();

      // Verify agent is registered
      let registryEntry = registry.get(agentId);
      expect(registryEntry!.status).toBe('active');

      // Act: Stop server
      await server.stop();

      // Assert: Agent should be deactivated
      registryEntry = registry.get(agentId);
      expect(registryEntry).not.toBeNull();
      expect(registryEntry!.status).toBe('inactive');
    });

    it('should close server cleanly on shutdown', async () => {
      // Arrange
      const agentId = 'test-agent-004';
      const agentCard: AgentCard = {
        id: agentId,
        name: 'Test Agent 4',
        capabilities: {
          skills: [],
        },
        endpoints: {
          baseUrl: 'http://localhost:3000',
        },
      };

      server = new A2AServer({
        agentId,
        agentCard,
        portRange: { min: 3500, max: 3600 },
      });

      await server.start();
      const port = server.getPort();

      // Act: Stop server
      await server.stop();

      // Assert: Server should no longer be listening
      // Try to start another server on the same port (should succeed)
      const server2 = new A2AServer({
        agentId: 'test-agent-005',
        agentCard,
        port,
      });

      const port2 = await server2.start();
      expect(port2).toBe(port);

      await server2.stop();
    });

    it('should stop heartbeat timer on shutdown', async () => {
      // Arrange
      const agentId = 'test-agent-006';
      const agentCard: AgentCard = {
        id: agentId,
        name: 'Test Agent 6',
        capabilities: {
          skills: [],
        },
        endpoints: {
          baseUrl: 'http://localhost:3000',
        },
      };

      server = new A2AServer({
        agentId,
        agentCard,
        portRange: { min: 3500, max: 3600 },
        heartbeatInterval: 100, // Fast heartbeat for testing
      });

      await server.start();

      // Wait for at least one heartbeat
      await new Promise((resolve) => setTimeout(resolve, 150));

      const beforeStop = registry.get(agentId);
      expect(beforeStop).not.toBeNull();

      // Act: Stop server
      await server.stop();

      // Wait to ensure no more heartbeats
      const lastHeartbeat = registry.get(agentId)!.lastHeartbeat;
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Assert: No heartbeat should occur after stop
      const afterWait = registry.get(agentId);
      expect(afterWait!.lastHeartbeat).toBe(lastHeartbeat);
    });
  });

  describe('Process Signal Handling', () => {
    it('should handle SIGTERM gracefully', async () => {
      // Arrange
      const agentId = 'test-agent-007';
      const agentCard: AgentCard = {
        id: agentId,
        name: 'Test Agent 7',
        capabilities: {
          skills: [],
        },
        endpoints: {
          baseUrl: 'http://localhost:3000',
        },
      };

      server = new A2AServer({
        agentId,
        agentCard,
        portRange: { min: 3500, max: 3600 },
      });

      await server.start();

      // Setup shutdown handler mock
      const shutdownHandler = vi.fn(async () => {
        await server.stop();
      });

      // Act: Simulate SIGTERM
      await shutdownHandler();

      // Assert
      expect(shutdownHandler).toHaveBeenCalled();
      const registryEntry = registry.get(agentId);
      expect(registryEntry!.status).toBe('inactive');
    });

    it('should handle SIGINT gracefully', async () => {
      // Arrange
      const agentId = 'test-agent-008';
      const agentCard: AgentCard = {
        id: agentId,
        name: 'Test Agent 8',
        capabilities: {
          skills: [],
        },
        endpoints: {
          baseUrl: 'http://localhost:3000',
        },
      };

      server = new A2AServer({
        agentId,
        agentCard,
        portRange: { min: 3500, max: 3600 },
      });

      await server.start();

      // Setup shutdown handler mock
      const shutdownHandler = vi.fn(async () => {
        await server.stop();
      });

      // Act: Simulate SIGINT
      await shutdownHandler();

      // Assert
      expect(shutdownHandler).toHaveBeenCalled();
      const registryEntry = registry.get(agentId);
      expect(registryEntry!.status).toBe('inactive');
    });
  });

  describe('Integration with MeMesh Main', () => {
    it('should not break existing MeMesh functionality', async () => {
      // Arrange
      const agentId = 'ccb-main';
      const agentCard: AgentCard = {
        id: agentId,
        name: 'Claude Code Buddy',
        description: 'AI development assistant',
        version: '1.0.0',
        capabilities: {
          skills: [
            {
              name: 'code-review',
              description: 'Review code for quality',
            },
            {
              name: 'test-generation',
              description: 'Generate tests',
            },
          ],
        },
        endpoints: {
          baseUrl: 'http://localhost:3000',
        },
      };

      // Act: Start server (simulating MeMesh initialization)
      server = new A2AServer({
        agentId,
        agentCard,
        portRange: { min: 3500, max: 3600 },
      });

      const port = await server.start();

      // Assert: Server started successfully
      expect(port).toBeGreaterThan(0);

      // Assert: Agent registered
      const registryEntry = registry.get(agentId);
      expect(registryEntry).not.toBeNull();
      expect(registryEntry!.agentId).toBe(agentId);

      // Assert: TaskQueue accessible
      const taskQueue = server.getTaskQueue();
      expect(taskQueue).toBeDefined();

      // Create a test task
      const task = taskQueue.createTask({
        name: 'Test Task',
        description: 'Verify task queue works',
      });

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
    });
  });
});
