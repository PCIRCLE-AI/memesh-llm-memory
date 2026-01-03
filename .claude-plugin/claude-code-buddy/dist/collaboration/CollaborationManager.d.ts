import { MessageBus } from './MessageBus.js';
import { CollaborativeAgent, AgentTeam, CollaborativeTask, CollaborationSession, TeamMetrics } from './types.js';
export declare class CollaborationManager {
    private messageBus;
    private teamCoordinator;
    private db;
    private initialized;
    constructor(dbPath?: string);
    initialize(): Promise<void>;
    registerAgent(agent: CollaborativeAgent): void;
    createTeam(team: Omit<AgentTeam, 'id'>): Promise<AgentTeam>;
    executeTask(task: CollaborativeTask): Promise<CollaborationSession>;
    getTeamMetrics(teamId: string): TeamMetrics | null;
    getTeams(): AgentTeam[];
    getAgents(): CollaborativeAgent[];
    getSession(sessionId: string): CollaborationSession | undefined;
    getMessageStats(): {
        totalMessages: number;
        messagesByType: Record<string, number>;
        activeSubscribers: number;
        activeTopics: number;
    };
    getMessageHistory(filter?: Parameters<MessageBus['getMessageHistory']>[0]): import("./types.js").AgentMessage[];
    clearMessageHistory(): void;
    shutdown(): Promise<void>;
    getRecentSessions(limit?: number): Promise<import("./persistence/database.js").Session[]>;
    searchSessions(query: string): Promise<import("./persistence/database.js").Session[]>;
    getTeamSessions(teamId: string): Promise<import("./persistence/database.js").Session[]>;
    getPersistedTeams(): Promise<import("./persistence/database.js").Team[]>;
}
//# sourceMappingURL=CollaborationManager.d.ts.map