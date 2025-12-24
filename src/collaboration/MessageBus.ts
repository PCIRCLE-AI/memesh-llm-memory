/**
 * MessageBus - Agent 間訊息傳遞系統
 *
 * 提供 pub/sub 和點對點訊息傳遞
 */

import { EventEmitter } from 'events';
import { AgentMessage } from './types.js';
import { logger } from '../utils/logger.js';

export class MessageBus extends EventEmitter {
  private messageHistory: AgentMessage[] = [];
  private subscribers: Map<string, Set<string>> = new Map(); // topic -> agent IDs
  private maxHistorySize: number = 1000;

  constructor() {
    super();
    this.setMaxListeners(50); // Support many agents
  }

  /**
   * 發送訊息給特定 agent
   */
  sendMessage(message: AgentMessage): void {
    // 記錄訊息
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory.shift();
    }

    logger.debug(`MessageBus: ${message.from} → ${message.to} (${message.type})`);

    // 如果是廣播，發送給所有訂閱者
    if (message.type === 'broadcast') {
      this.emit('broadcast', message);
      // 發送給所有訂閱 message:* 的 agents
      const eventNames = this.eventNames();
      eventNames.forEach(name => {
        if (typeof name === 'string' && name.startsWith('message:')) {
          this.emit(name, message);
        }
      });
    } else {
      // 點對點訊息：只發送給目標 agent
      this.emit(`message:${message.to}`, message);
    }
  }

  /**
   * 訂閱訊息
   */
  subscribe(agentId: string, handler: (message: AgentMessage) => void): void {
    this.on(`message:${agentId}`, handler);
    logger.debug(`MessageBus: ${agentId} subscribed to messages`);
  }

  /**
   * 取消訂閱
   */
  unsubscribe(agentId: string, handler: (message: AgentMessage) => void): void {
    this.off(`message:${agentId}`, handler);
    logger.debug(`MessageBus: ${agentId} unsubscribed from messages`);
  }

  /**
   * 訂閱特定主題的廣播
   */
  subscribeTopic(agentId: string, topic: string, handler: (message: AgentMessage) => void): void {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, new Set());
    }
    this.subscribers.get(topic)!.add(agentId);
    this.on(`topic:${topic}`, handler);
    logger.debug(`MessageBus: ${agentId} subscribed to topic: ${topic}`);
  }

  /**
   * 發布主題廣播
   */
  publishTopic(topic: string, message: AgentMessage): void {
    this.emit(`topic:${topic}`, message);
    logger.debug(`MessageBus: Published to topic: ${topic}`);
  }

  /**
   * 發送廣播訊息給所有訂閱者（便利方法）
   */
  broadcast(message: AgentMessage): void {
    this.sendMessage({ ...message, type: 'broadcast' });
  }

  /**
   * 發送訊息到特定主題（便利方法，別名 publishTopic）
   */
  sendToTopic(topic: string, message: AgentMessage): void {
    this.publishTopic(topic, message);
  }

  /**
   * 獲取訊息歷史
   */
  getMessageHistory(filter?: {
    from?: string;
    to?: string;
    type?: AgentMessage['type'];
    limit?: number;
  }): AgentMessage[] {
    let filtered = this.messageHistory;

    if (filter?.from) {
      filtered = filtered.filter(m => m.from === filter.from);
    }
    if (filter?.to) {
      filtered = filtered.filter(m => m.to === filter.to);
    }
    if (filter?.type) {
      filtered = filtered.filter(m => m.type === filter.type);
    }

    if (filter?.limit) {
      return filtered.slice(-filter.limit);
    }

    return filtered;
  }

  /**
   * 清除訊息歷史
   */
  clearHistory(): void {
    this.messageHistory = [];
    logger.debug('MessageBus: History cleared');
  }

  /**
   * 獲取統計資訊
   */
  getStats(): {
    totalMessages: number;
    messagesByType: Record<string, number>;
    activeSubscribers: number;
    activeTopics: number;
  } {
    const messagesByType: Record<string, number> = {};
    for (const msg of this.messageHistory) {
      messagesByType[msg.type] = (messagesByType[msg.type] || 0) + 1;
    }

    // 計算所有 message:* 事件的訂閱者總數
    const eventNames = this.eventNames();
    const messageSubscribers = eventNames
      .filter(name => typeof name === 'string' && name.startsWith('message:'))
      .reduce((count, name) => count + this.listenerCount(name), 0);

    return {
      totalMessages: this.messageHistory.length,
      messagesByType,
      activeSubscribers: messageSubscribers,
      activeTopics: this.subscribers.size,
    };
  }
}
