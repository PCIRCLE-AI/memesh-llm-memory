import { AgentTeam, CollaborativeAgent, CollaborativeTask, CollaborativeSubTask, CollaborationSession, TeamMetrics } from './types.js';
import { MessageBus } from './MessageBus.js';
export declare class TeamCoordinator {
    private teams;
    private agents;
    private sessions;
    private messageBus;
    private metricsCache;
    private metricsCacheTTL;
    constructor(messageBus: MessageBus);
    registerAgent(agent: CollaborativeAgent): void;
    restoreTeam(team: AgentTeam): void;
    createTeam(team: Omit<AgentTeam, 'id'>): AgentTeam;
    selectTeamForTask(task: CollaborativeTask): AgentTeam | null;
    private analyzeDependencies;
    decomposeTask(task: CollaborativeTask, team: AgentTeam): Promise<CollaborativeSubTask[]>;
    executeCollaborativeTask(task: CollaborativeTask): Promise<CollaborationSession>;
    getTeamMetrics(teamId: string): TeamMetrics | null;
    getTeams(): AgentTeam[];
    getAgents(): CollaborativeAgent[];
    restoreSession(session: CollaborationSession): void;
    getSession(sessionId: string): CollaborationSession | undefined;
}
//# sourceMappingURL=TeamCoordinator.d.ts.map