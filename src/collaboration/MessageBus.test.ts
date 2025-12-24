/**
 * MessageBus Tests
 *
 * 測試訊息匯流排的核心功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageBus } from './MessageBus.js';
import { AgentMessage } from './types.js';

describe('MessageBus', () => {
  let messageBus: MessageBus;

  beforeEach(() => {
    messageBus = new MessageBus();
  });

  describe('Point-to-Point Messaging', () => {
    it('should deliver message to subscribed agent', async () => {
      const receivedMessages: AgentMessage[] = [];

      // 訂閱 agent-1 的訊息
      messageBus.subscribe('agent-1', async (message) => {
        receivedMessages.push(message);
      });

      // 發送訊息給 agent-1
      const testMessage: AgentMessage = {
        id: 'msg-1',
        from: 'agent-2',
        to: 'agent-1',
        timestamp: new Date(),
        type: 'request',
        content: { task: 'Test task' },
      };

      messageBus.sendMessage(testMessage);

      // 等待訊息處理
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].id).toBe('msg-1');
      expect(receivedMessages[0].content.task).toBe('Test task');
    });

    it('should not deliver message to unsubscribed agent', async () => {
      const receivedMessages: AgentMessage[] = [];

      // 訂閱 agent-1
      messageBus.subscribe('agent-1', async (message) => {
        receivedMessages.push(message);
      });

      // 發送訊息給 agent-2（未訂閱）
      const testMessage: AgentMessage = {
        id: 'msg-1',
        from: 'agent-1',
        to: 'agent-2',
        timestamp: new Date(),
        type: 'request',
        content: { task: 'Test task' },
      };

      messageBus.sendMessage(testMessage);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedMessages).toHaveLength(0);
    });
  });

  describe('Broadcast Messaging', () => {
    it('should deliver broadcast to all subscribed agents', async () => {
      const agent1Messages: AgentMessage[] = [];
      const agent2Messages: AgentMessage[] = [];

      messageBus.subscribe('agent-1', async (message) => {
        agent1Messages.push(message);
      });

      messageBus.subscribe('agent-2', async (message) => {
        agent2Messages.push(message);
      });

      const broadcastMessage: AgentMessage = {
        id: 'broadcast-1',
        from: 'coordinator',
        to: 'all',
        timestamp: new Date(),
        type: 'broadcast',
        content: { data: 'Important announcement' },
      };

      messageBus.broadcast(broadcastMessage);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(agent1Messages).toHaveLength(1);
      expect(agent2Messages).toHaveLength(1);
      expect(agent1Messages[0].id).toBe('broadcast-1');
      expect(agent2Messages[0].id).toBe('broadcast-1');
    });
  });

  describe('Topic-based Messaging', () => {
    it('should deliver message to topic subscribers', async () => {
      const receivedMessages: AgentMessage[] = [];

      messageBus.subscribeTopic('agent-1', 'architecture', async (message) => {
        receivedMessages.push(message);
      });

      const topicMessage: AgentMessage = {
        id: 'topic-msg-1',
        from: 'agent-2',
        to: 'architecture',
        timestamp: new Date(),
        type: 'notification',
        content: { data: 'Architecture update' },
      };

      messageBus.sendToTopic('architecture', topicMessage);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedMessages).toHaveLength(1);
      expect(receivedMessages[0].content.data).toBe('Architecture update');
    });

    it('should support multiple subscribers on same topic', async () => {
      const agent1Messages: AgentMessage[] = [];
      const agent2Messages: AgentMessage[] = [];

      messageBus.subscribeTopic('agent-1', 'performance', async (message) => {
        agent1Messages.push(message);
      });

      messageBus.subscribeTopic('agent-2', 'performance', async (message) => {
        agent2Messages.push(message);
      });

      const topicMessage: AgentMessage = {
        id: 'perf-msg-1',
        from: 'monitor',
        to: 'performance',
        timestamp: new Date(),
        type: 'notification',
        content: { data: 'High CPU usage' },
      };

      messageBus.sendToTopic('performance', topicMessage);

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(agent1Messages).toHaveLength(1);
      expect(agent2Messages).toHaveLength(1);
    });
  });

  describe('Message History', () => {
    it('should store message history', () => {
      const message1: AgentMessage = {
        id: 'msg-1',
        from: 'agent-1',
        to: 'agent-2',
        timestamp: new Date(),
        type: 'request',
        content: { task: 'Task 1' },
      };

      const message2: AgentMessage = {
        id: 'msg-2',
        from: 'agent-2',
        to: 'agent-1',
        timestamp: new Date(),
        type: 'response',
        content: { result: 'Result 1' },
      };

      messageBus.sendMessage(message1);
      messageBus.sendMessage(message2);

      const history = messageBus.getMessageHistory();

      expect(history).toHaveLength(2);
      expect(history[0].id).toBe('msg-1');
      expect(history[1].id).toBe('msg-2');
    });

    it('should limit history to 1000 messages', () => {
      // 發送 1100 個訊息
      for (let i = 0; i < 1100; i++) {
        messageBus.sendMessage({
          id: `msg-${i}`,
          from: 'agent-1',
          to: 'agent-2',
          timestamp: new Date(),
          type: 'request',
          content: { task: `Task ${i}` },
        });
      }

      const history = messageBus.getMessageHistory();

      expect(history).toHaveLength(1000);
      // 應該保留最新的 1000 個訊息
      expect(history[0].id).toBe('msg-100');
      expect(history[999].id).toBe('msg-1099');
    });

    it('should filter history by agent', () => {
      messageBus.sendMessage({
        id: 'msg-1',
        from: 'agent-1',
        to: 'agent-2',
        timestamp: new Date(),
        type: 'request',
        content: {},
      });

      messageBus.sendMessage({
        id: 'msg-2',
        from: 'agent-2',
        to: 'agent-1',
        timestamp: new Date(),
        type: 'response',
        content: {},
      });

      messageBus.sendMessage({
        id: 'msg-3',
        from: 'agent-1',
        to: 'agent-3',
        timestamp: new Date(),
        type: 'request',
        content: {},
      });

      const agent1History = messageBus.getMessageHistory({ from: 'agent-1' });

      expect(agent1History).toHaveLength(2);
      expect(agent1History.every(msg => msg.from === 'agent-1')).toBe(true);
    });

    it('should filter history by type', () => {
      messageBus.sendMessage({
        id: 'msg-1',
        from: 'agent-1',
        to: 'agent-2',
        timestamp: new Date(),
        type: 'request',
        content: {},
      });

      messageBus.sendMessage({
        id: 'msg-2',
        from: 'agent-2',
        to: 'agent-1',
        timestamp: new Date(),
        type: 'response',
        content: {},
      });

      const requestHistory = messageBus.getMessageHistory({ type: 'request' });

      expect(requestHistory).toHaveLength(1);
      expect(requestHistory[0].type).toBe('request');
    });

    it('should clear history', () => {
      messageBus.sendMessage({
        id: 'msg-1',
        from: 'agent-1',
        to: 'agent-2',
        timestamp: new Date(),
        type: 'request',
        content: {},
      });

      messageBus.clearHistory();

      const history = messageBus.getMessageHistory();
      expect(history).toHaveLength(0);
    });
  });

  describe('Statistics', () => {
    it('should track message statistics', () => {
      messageBus.sendMessage({
        id: 'msg-1',
        from: 'agent-1',
        to: 'agent-2',
        timestamp: new Date(),
        type: 'request',
        content: {},
      });

      messageBus.sendMessage({
        id: 'msg-2',
        from: 'agent-2',
        to: 'agent-1',
        timestamp: new Date(),
        type: 'response',
        content: {},
      });

      messageBus.broadcast({
        id: 'broadcast-1',
        from: 'coordinator',
        to: 'all',
        timestamp: new Date(),
        type: 'broadcast',
        content: {},
      });

      const stats = messageBus.getStats();

      expect(stats.totalMessages).toBe(3);
      expect(stats.messagesByType.request).toBe(1);
      expect(stats.messagesByType.response).toBe(1);
      expect(stats.messagesByType.broadcast).toBe(1);
    });

    it('should track subscriber count', () => {
      messageBus.subscribe('agent-1', async () => {});
      messageBus.subscribe('agent-2', async () => {});
      messageBus.subscribe('agent-3', async () => {});

      const stats = messageBus.getStats();

      expect(stats.activeSubscribers).toBe(3);
    });

    it('should track topic count', () => {
      messageBus.subscribeTopic('agent-1', 'topic-1', async () => {});
      messageBus.subscribeTopic('agent-2', 'topic-2', async () => {});
      messageBus.subscribeTopic('agent-3', 'topic-1', async () => {});

      const stats = messageBus.getStats();

      expect(stats.activeTopics).toBe(2); // topic-1 and topic-2
    });
  });

  describe('Unsubscribe', () => {
    it('should remove all listeners when requested', async () => {
      const receivedMessages: AgentMessage[] = [];

      messageBus.subscribe('agent-1', async (message) => {
        receivedMessages.push(message);
      });

      messageBus.removeAllListeners();

      messageBus.sendMessage({
        id: 'msg-1',
        from: 'agent-2',
        to: 'agent-1',
        timestamp: new Date(),
        type: 'request',
        content: {},
      });

      await new Promise(resolve => setTimeout(resolve, 10));

      expect(receivedMessages).toHaveLength(0);

      const stats = messageBus.getStats();
      expect(stats.activeSubscribers).toBe(0);
    });
  });
});
