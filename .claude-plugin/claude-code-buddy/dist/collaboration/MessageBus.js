import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
export class MessageBus extends EventEmitter {
    messageHistory = [];
    subscribers = new Map();
    maxHistorySize;
    constructor(options) {
        super();
        this.maxHistorySize = options?.maxHistorySize ?? 1000;
        this.setMaxListeners(options?.maxListeners ?? 50);
    }
    sendMessage(message) {
        this.messageHistory.push(message);
        if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory.shift();
        }
        logger.debug(`MessageBus: ${message.from} → ${message.to} (${message.type})`);
        if (message.type === 'broadcast') {
            this.emit('broadcast', message);
            const eventNames = this.eventNames();
            eventNames.forEach(name => {
                if (typeof name === 'string' && name.startsWith('message:')) {
                    this.emit(name, message);
                }
            });
        }
        else {
            this.emit(`message:${message.to}`, message);
        }
    }
    subscribe(agentId, handler) {
        this.on(`message:${agentId}`, handler);
        logger.debug(`MessageBus: ${agentId} subscribed to messages`);
    }
    unsubscribe(agentId, handler) {
        this.off(`message:${agentId}`, handler);
        logger.debug(`MessageBus: ${agentId} unsubscribed from messages`);
    }
    subscribeTopic(agentId, topic, handler) {
        if (!this.subscribers.has(topic)) {
            this.subscribers.set(topic, new Set());
        }
        this.subscribers.get(topic).add(agentId);
        this.on(`topic:${topic}`, handler);
        logger.debug(`MessageBus: ${agentId} subscribed to topic: ${topic}`);
    }
    publishTopic(topic, message) {
        this.emit(`topic:${topic}`, message);
        logger.debug(`MessageBus: Published to topic: ${topic}`);
    }
    broadcast(message) {
        this.sendMessage({ ...message, type: 'broadcast' });
    }
    sendToTopic(topic, message) {
        this.publishTopic(topic, message);
    }
    getMessageHistory(filter) {
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
    clearHistory() {
        this.messageHistory = [];
        logger.debug('MessageBus: History cleared');
    }
    getStats() {
        const messagesByType = {};
        for (const msg of this.messageHistory) {
            messagesByType[msg.type] = (messagesByType[msg.type] || 0) + 1;
        }
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
    async publishAsync(message) {
        this.messageHistory.push(message);
        if (this.messageHistory.length > this.maxHistorySize) {
            this.messageHistory.shift();
        }
        logger.debug(`MessageBus (async): ${message.from} → ${message.to} (${message.type})`);
        const listeners = [];
        if (message.type === 'broadcast') {
            const broadcastListeners = this.listeners('broadcast');
            listeners.push(...broadcastListeners);
            const eventNames = this.eventNames();
            eventNames.forEach(name => {
                if (typeof name === 'string' && name.startsWith('message:')) {
                    const messageListeners = this.listeners(name);
                    listeners.push(...messageListeners);
                }
            });
        }
        else {
            const targetListeners = this.listeners(`message:${message.to}`);
            listeners.push(...targetListeners);
        }
        const promises = listeners.map(listener => {
            try {
                const result = listener(message);
                if (result && typeof result === 'object' && typeof result.then === 'function') {
                    return result;
                }
                return Promise.resolve();
            }
            catch (error) {
                logger.error('MessageBus: Error in async message handler:', error);
                return Promise.resolve();
            }
        });
        await Promise.all(promises);
    }
    subscribeAsync(agentId, handler) {
        this.on(`message:${agentId}`, handler);
        logger.debug(`MessageBus: ${agentId} subscribed to async messages`);
    }
    subscribeTopicAsync(agentId, topic, handler) {
        if (!this.subscribers.has(topic)) {
            this.subscribers.set(topic, new Set());
        }
        this.subscribers.get(topic).add(agentId);
        this.on(`topic:${topic}`, handler);
        logger.debug(`MessageBus: ${agentId} subscribed to async topic: ${topic}`);
    }
    async publishTopicAsync(topic, message) {
        const listeners = this.listeners(`topic:${topic}`);
        logger.debug(`MessageBus (async): Published to topic: ${topic}`);
        const promises = listeners.map(listener => {
            try {
                const result = listener(message);
                if (result && typeof result === 'object' && typeof result.then === 'function') {
                    return result;
                }
                return Promise.resolve();
            }
            catch (error) {
                logger.error(`MessageBus: Error in async topic handler for ${topic}:`, error);
                return Promise.resolve();
            }
        });
        await Promise.all(promises);
    }
    async broadcastAsync(message) {
        await this.publishAsync({ ...message, type: 'broadcast' });
    }
}
//# sourceMappingURL=MessageBus.js.map