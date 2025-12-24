/**
 * CollaborationManager Tests
 *
 * 測試協作管理器的核心功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CollaborationManager } from './CollaborationManager.js';
import {
  CollaborativeAgent,
  AgentMessage,
  AgentCapability,
  CollaborativeTask,
} from './types.js';
import { v4 as uuidv4 } from 'uuid';

// Mock Agent 實作
class MockAgent implements CollaborativeAgent {
  id: string;
  name: string;
  type: 'custom' = 'custom';
  capabilities: AgentCapability[];
  status: 'idle' | 'busy' | 'error' = 'idle';

  constructor(name: string, capabilities: string[]) {
    this.id = uuidv4();
    this.name = name;
    this.capabilities = capabilities.map(cap => ({
      name: cap,
      description: `Mock ${cap} capability`,
      inputSchema: {},
      outputSchema: {},
      estimatedCost: 0.01,
      estimatedTimeMs: 100,
    }));
  }

  async initialize(): Promise<void> {
    this.status = 'idle';
  }

  async shutdown(): Promise<void> {
    this.status = 'idle';
  }

  async handleMessage(message: AgentMessage): Promise<AgentMessage> {
    this.status = 'busy';

    // 模擬處理延遲
    await new Promise(resolve => setTimeout(resolve, 10));

    this.status = 'idle';

    return {
      id: uuidv4(),
      from: this.id,
      to: message.from,
      timestamp: new Date(),
      type: 'response',
      content: {
        result: `Mock result from ${this.name}`,
      },
      metadata: {
        correlationId: message.metadata?.correlationId,
      },
    };
  }

  async execute(capability: string, input: any): Promise<any> {
    return `Executed ${capability} with ${JSON.stringify(input)}`;
  }
}

describe('CollaborationManager', () => {
  let manager: CollaborationManager;
  let agent1: MockAgent;
  let agent2: MockAgent;
  let agent3: MockAgent;

  beforeEach(async () => {
    manager = new CollaborationManager();
    await manager.initialize();

    agent1 = new MockAgent('Agent 1', ['capability_a', 'capability_b']);
    agent2 = new MockAgent('Agent 2', ['capability_b', 'capability_c']);
    agent3 = new MockAgent('Agent 3', ['capability_c', 'capability_d']);
  });

  afterEach(async () => {
    await manager.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const newManager = new CollaborationManager();
      await expect(newManager.initialize()).resolves.not.toThrow();
      await newManager.shutdown();
    });

    it('should warn on double initialization', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await manager.initialize();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('Agent Registration', () => {
    it('should register agent successfully', () => {
      expect(() => manager.registerAgent(agent1)).not.toThrow();

      const agents = manager.getAgents();
      expect(agents).toHaveLength(1);
      expect(agents[0].id).toBe(agent1.id);
    });

    it('should register multiple agents', () => {
      manager.registerAgent(agent1);
      manager.registerAgent(agent2);
      manager.registerAgent(agent3);

      const agents = manager.getAgents();
      expect(agents).toHaveLength(3);
    });

    it('should throw if not initialized', async () => {
      const uninitializedManager = new CollaborationManager();

      expect(() => uninitializedManager.registerAgent(agent1)).toThrow();

      await uninitializedManager.shutdown();
    });
  });

  describe('Team Creation', () => {
    beforeEach(() => {
      manager.registerAgent(agent1);
      manager.registerAgent(agent2);
      manager.registerAgent(agent3);
    });

    it('should create team successfully', () => {
      const team = manager.createTeam({
        name: 'Test Team',
        description: 'A test team',
        members: [agent1.id, agent2.id],
        leader: agent1.id,
        capabilities: ['capability_a', 'capability_b', 'capability_c'],
      });

      expect(team.id).toBeTruthy();
      expect(team.name).toBe('Test Team');
      expect(team.members).toHaveLength(2);
      expect(team.leader).toBe(agent1.id);
    });

    it('should validate all members are registered', () => {
      const fakeId = 'fake-agent-id';

      expect(() =>
        manager.createTeam({
          name: 'Invalid Team',
          description: 'Team with unregistered agent',
          members: [agent1.id, fakeId],
          leader: agent1.id,
          capabilities: ['capability_a'],
        })
      ).toThrow('not registered');
    });

    it('should validate leader is a member', () => {
      expect(() =>
        manager.createTeam({
          name: 'Invalid Team',
          description: 'Leader not in members',
          members: [agent1.id],
          leader: agent2.id, // Not in members
          capabilities: ['capability_a'],
        })
      ).toThrow('must be a team member');
    });

    it('should list all teams', () => {
      manager.createTeam({
        name: 'Team 1',
        description: 'First team',
        members: [agent1.id, agent2.id],
        leader: agent1.id,
        capabilities: ['capability_a'],
      });

      manager.createTeam({
        name: 'Team 2',
        description: 'Second team',
        members: [agent2.id, agent3.id],
        leader: agent2.id,
        capabilities: ['capability_c'],
      });

      const teams = manager.getTeams();
      expect(teams).toHaveLength(2);
    });
  });

  describe('Task Execution', () => {
    beforeEach(() => {
      manager.registerAgent(agent1);
      manager.registerAgent(agent2);
      manager.registerAgent(agent3);
    });

    it('should execute task successfully', async () => {
      const team = manager.createTeam({
        name: 'Execution Team',
        description: 'Team for task execution',
        members: [agent1.id, agent2.id],
        leader: agent1.id,
        capabilities: ['capability_a', 'capability_b'],
      });

      const task: CollaborativeTask = {
        id: uuidv4(),
        description: 'Test collaborative task',
        requiredCapabilities: ['capability_a', 'capability_b'],
        status: 'pending',
      };

      const session = await manager.executeTask(task);

      expect(session.results.success).toBe(true);
      expect(session.results.durationMs).toBeGreaterThan(0);
      expect(session.task.status).toBe('completed');
      expect(session.messages.length).toBeGreaterThan(0);
    });

    it('should handle task failure gracefully', async () => {
      // 創建會失敗的 agent
      const failingAgent = new MockAgent('Failing Agent', ['failing_capability']);
      failingAgent.handleMessage = async () => {
        throw new Error('Intentional failure');
      };

      manager.registerAgent(failingAgent);

      const team = manager.createTeam({
        name: 'Failing Team',
        description: 'Team that will fail',
        members: [failingAgent.id],
        leader: failingAgent.id,
        capabilities: ['failing_capability'],
      });

      const task: CollaborativeTask = {
        id: uuidv4(),
        description: 'Task that will fail',
        requiredCapabilities: ['failing_capability'],
        status: 'pending',
      };

      const session = await manager.executeTask(task);

      expect(session.results.success).toBe(false);
      expect(session.results.error).toBeTruthy();
      expect(session.task.status).toBe('failed');
    });

    it('should distribute work evenly among capable agents (load balancing)', async () => {
      // Create 3 agents with identical capabilities
      const architect1 = new MockAgent('Senior System Architect', ['analyze', 'design', 'review']);
      const architect2 = new MockAgent('Security Architect', ['analyze', 'design', 'review']);
      const architect3 = new MockAgent('Performance Architect', ['analyze', 'design', 'review']);

      manager.registerAgent(architect1);
      manager.registerAgent(architect2);
      manager.registerAgent(architect3);

      const team = manager.createTeam({
        name: 'Architecture Team',
        description: 'Team with 3 architects',
        members: [architect1.id, architect2.id, architect3.id],
        leader: architect1.id,
        capabilities: ['analyze', 'design', 'review'],
      });

      // Execute task requiring all 3 capabilities
      const task: CollaborativeTask = {
        id: uuidv4(),
        description: 'System architecture analysis',
        requiredCapabilities: ['analyze', 'design', 'review'],
        status: 'pending',
      };

      const session = await manager.executeTask(task);

      // Verify task completed successfully
      expect(session.results.success).toBe(true);
      expect(session.task.status).toBe('completed');

      // Verify each agent got exactly 1 subtask (33.3% utilization)
      const metrics = manager.getTeamMetrics(team.id);
      expect(metrics).toBeTruthy();
      expect(metrics!.agentUtilization[architect1.id]).toBeCloseTo(33.3, 1);
      expect(metrics!.agentUtilization[architect2.id]).toBeCloseTo(33.3, 1);
      expect(metrics!.agentUtilization[architect3.id]).toBeCloseTo(33.3, 1);

      // Verify all 3 subtasks were created and assigned to different agents
      expect(session.task.subtasks).toHaveLength(3);
      const assignedAgents = new Set(session.task.subtasks!.map(st => st.assignedAgent));
      expect(assignedAgents.size).toBe(3); // All 3 agents should be assigned tasks
    });

    it('should throw if no suitable team found', async () => {
      const task: CollaborativeTask = {
        id: uuidv4(),
        description: 'Task with unmatchable capabilities',
        requiredCapabilities: ['non_existent_capability'],
        status: 'pending',
      };

      await expect(manager.executeTask(task)).rejects.toThrow('No suitable team');
    });

    it('should retrieve session by ID', async () => {
      const team = manager.createTeam({
        name: 'Session Team',
        description: 'Team for session test',
        members: [agent1.id],
        leader: agent1.id,
        capabilities: ['capability_a'],
      });

      const task: CollaborativeTask = {
        id: uuidv4(),
        description: 'Session test task',
        requiredCapabilities: ['capability_a'],
        status: 'pending',
      };

      const session = await manager.executeTask(task);
      const retrievedSession = manager.getSession(session.id);

      expect(retrievedSession).toBeDefined();
      expect(retrievedSession!.id).toBe(session.id);
    });
  });

  describe('Team Metrics', () => {
    beforeEach(() => {
      manager.registerAgent(agent1);
      manager.registerAgent(agent2);
    });

    it('should calculate team metrics correctly', async () => {
      const team = manager.createTeam({
        name: 'Metrics Team',
        description: 'Team for metrics test',
        members: [agent1.id, agent2.id],
        leader: agent1.id,
        capabilities: ['capability_a', 'capability_b'],
      });

      // 執行幾個任務
      for (let i = 0; i < 3; i++) {
        const task: CollaborativeTask = {
          id: uuidv4(),
          description: `Task ${i + 1}`,
          requiredCapabilities: ['capability_a'],
          status: 'pending',
        };

        await manager.executeTask(task);
      }

      const metrics = manager.getTeamMetrics(team.id);

      expect(metrics).toBeDefined();
      expect(metrics!.tasksCompleted).toBe(3);
      expect(metrics!.successRate).toBe(1); // 100% success
      expect(metrics!.averageDurationMs).toBeGreaterThan(0);
      expect(metrics!.agentUtilization).toBeDefined();
    });

    it('should return null for non-existent team', () => {
      const metrics = manager.getTeamMetrics('fake-team-id');
      expect(metrics).toBeNull();
    });
  });

  describe('Message Statistics', () => {
    beforeEach(() => {
      manager.registerAgent(agent1);
      manager.registerAgent(agent2);
    });

    it('should track message statistics', async () => {
      const team = manager.createTeam({
        name: 'Message Team',
        description: 'Team for message test',
        members: [agent1.id, agent2.id],
        leader: agent1.id,
        capabilities: ['capability_a', 'capability_b'],
      });

      const task: CollaborativeTask = {
        id: uuidv4(),
        description: 'Message tracking task',
        requiredCapabilities: ['capability_a'],
        status: 'pending',
      };

      await manager.executeTask(task);

      const stats = manager.getMessageStats();

      expect(stats.totalMessages).toBeGreaterThan(0);
      expect(stats.activeSubscribers).toBeGreaterThan(0);
    });

    it('should retrieve message history', async () => {
      const team = manager.createTeam({
        name: 'History Team',
        description: 'Team for history test',
        members: [agent1.id],
        leader: agent1.id,
        capabilities: ['capability_a'],
      });

      const task: CollaborativeTask = {
        id: uuidv4(),
        description: 'History test task',
        requiredCapabilities: ['capability_a'],
        status: 'pending',
      };

      await manager.executeTask(task);

      const history = manager.getMessageHistory();

      expect(history.length).toBeGreaterThan(0);
    });

    it('should clear message history', () => {
      manager.clearMessageHistory();

      const history = manager.getMessageHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Shutdown', () => {
    it('should shutdown all agents', async () => {
      manager.registerAgent(agent1);
      manager.registerAgent(agent2);

      await manager.shutdown();

      // 驗證 shutdown 被調用（通過檢查狀態）
      expect(agent1.status).toBe('idle');
      expect(agent2.status).toBe('idle');
    });
  });
});
