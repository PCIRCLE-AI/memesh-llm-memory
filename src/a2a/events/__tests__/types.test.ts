import { describe, it, expect } from 'vitest';
import {
  A2AEvent,
  EventType,
  TaskEventData,
  AgentEventData,
  isTaskEvent,
  isAgentEvent,
  EVENT_TYPES,
} from '../types.js';

describe('A2A Event Types', () => {
  describe('EVENT_TYPES', () => {
    it('should contain all 8 event types', () => {
      expect(EVENT_TYPES).toContain('task.created');
      expect(EVENT_TYPES).toContain('task.claimed');
      expect(EVENT_TYPES).toContain('task.released');
      expect(EVENT_TYPES).toContain('task.completed');
      expect(EVENT_TYPES).toContain('task.cancelled');
      expect(EVENT_TYPES).toContain('task.deleted');
      expect(EVENT_TYPES).toContain('agent.registered');
      expect(EVENT_TYPES).toContain('agent.offline');
      expect(EVENT_TYPES).toHaveLength(8);
    });
  });

  describe('isTaskEvent', () => {
    it('should return true for task events', () => {
      expect(isTaskEvent('task.created')).toBe(true);
      expect(isTaskEvent('task.claimed')).toBe(true);
      expect(isTaskEvent('task.cancelled')).toBe(true);
    });

    it('should return false for agent events', () => {
      expect(isTaskEvent('agent.registered')).toBe(false);
      expect(isTaskEvent('agent.offline')).toBe(false);
    });
  });

  describe('isAgentEvent', () => {
    it('should return true for agent events', () => {
      expect(isAgentEvent('agent.registered')).toBe(true);
      expect(isAgentEvent('agent.offline')).toBe(true);
    });

    it('should return false for task events', () => {
      expect(isAgentEvent('task.created')).toBe(false);
    });
  });

  describe('Type Definitions', () => {
    it('should allow creating valid TaskEventData', () => {
      const taskEvent: TaskEventData = {
        taskId: 'test-task-123',
        subject: 'Test Task',
        status: 'pending',
        owner: null,
        creator_platform: 'claude-code',
      };

      expect(taskEvent.taskId).toBe('test-task-123');
      expect(taskEvent.subject).toBe('Test Task');
      expect(taskEvent.status).toBe('pending');
      expect(taskEvent.owner).toBeNull();
      expect(taskEvent.creator_platform).toBe('claude-code');
    });

    it('should allow TaskEventData with optional actor', () => {
      const taskEvent: TaskEventData = {
        taskId: 'test-task-123',
        subject: 'Test Task',
        status: 'in_progress',
        owner: 'agent-1',
        creator_platform: 'claude-code',
        actor: 'agent-1',
      };

      expect(taskEvent.actor).toBe('agent-1');
    });

    it('should allow TaskEventData with cancelled status', () => {
      const taskEvent: TaskEventData = {
        taskId: 'test-task-123',
        subject: 'Test Task',
        status: 'cancelled',
        owner: null,
        creator_platform: 'claude-code',
      };

      expect(taskEvent.status).toBe('cancelled');
    });

    it('should allow creating valid AgentEventData', () => {
      const agentEvent: AgentEventData = {
        agentId: 'agent-123',
        platform: 'claude-code',
      };

      expect(agentEvent.agentId).toBe('agent-123');
      expect(agentEvent.platform).toBe('claude-code');
    });

    it('should allow AgentEventData with optional skills', () => {
      const agentEvent: AgentEventData = {
        agentId: 'agent-123',
        platform: 'claude-code',
        skills: ['coding', 'testing', 'review'],
      };

      expect(agentEvent.skills).toEqual(['coding', 'testing', 'review']);
    });

    it('should allow creating valid A2AEvent with TaskEventData', () => {
      const event: A2AEvent<TaskEventData> = {
        id: 'event-001',
        type: 'task.created',
        timestamp: Date.now(),
        data: {
          taskId: 'task-123',
          subject: 'Implement feature',
          status: 'pending',
          owner: null,
          creator_platform: 'claude-code',
        },
      };

      expect(event.id).toBe('event-001');
      expect(event.type).toBe('task.created');
      expect(event.data.taskId).toBe('task-123');
    });

    it('should allow creating valid A2AEvent with AgentEventData', () => {
      const event: A2AEvent<AgentEventData> = {
        id: 'event-002',
        type: 'agent.registered',
        timestamp: Date.now(),
        data: {
          agentId: 'agent-123',
          platform: 'claude-code',
          skills: ['coding'],
        },
      };

      expect(event.id).toBe('event-002');
      expect(event.type).toBe('agent.registered');
      expect(event.data.agentId).toBe('agent-123');
    });
  });

  describe('EventType type', () => {
    it('should allow all valid event types', () => {
      const types: EventType[] = [
        'task.created',
        'task.claimed',
        'task.released',
        'task.completed',
        'task.cancelled',
        'task.deleted',
        'agent.registered',
        'agent.offline',
      ];

      expect(types).toHaveLength(8);
    });
  });
});
