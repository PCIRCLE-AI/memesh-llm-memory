import { EventEmitter } from 'events';
import { AgentMessage } from './types.js';
export interface MessageBusOptions {
    maxHistorySize?: number;
    maxListeners?: number;
}
export declare class MessageBus extends EventEmitter {
    private messageHistory;
    private subscribers;
    private maxHistorySize;
    constructor(options?: MessageBusOptions);
    sendMessage(message: AgentMessage): void;
    subscribe(agentId: string, handler: (message: AgentMessage) => void): void;
    unsubscribe(agentId: string, handler: (message: AgentMessage) => void): void;
    subscribeTopic(agentId: string, topic: string, handler: (message: AgentMessage) => void): void;
    publishTopic(topic: string, message: AgentMessage): void;
    broadcast(message: AgentMessage): void;
    sendToTopic(topic: string, message: AgentMessage): void;
    getMessageHistory(filter?: {
        from?: string;
        to?: string;
        type?: AgentMessage['type'];
        limit?: number;
    }): AgentMessage[];
    clearHistory(): void;
    getStats(): {
        totalMessages: number;
        messagesByType: Record<string, number>;
        activeSubscribers: number;
        activeTopics: number;
    };
    publishAsync(message: AgentMessage): Promise<void>;
    subscribeAsync(agentId: string, handler: (message: AgentMessage) => Promise<void>): void;
    subscribeTopicAsync(agentId: string, topic: string, handler: (message: AgentMessage) => Promise<void>): void;
    publishTopicAsync(topic: string, message: AgentMessage): Promise<void>;
    broadcastAsync(message: AgentMessage): Promise<void>;
}
//# sourceMappingURL=MessageBus.d.ts.map