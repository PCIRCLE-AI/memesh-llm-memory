import { MessageBus } from './MessageBus.js';
import { TeamCoordinator } from './TeamCoordinator.js';
import { logger } from '../utils/logger.js';
import { CollaborationDatabase } from './persistence/database.js';
export class CollaborationManager {
    messageBus;
    teamCoordinator;
    db;
    initialized = false;
    constructor(dbPath) {
        this.messageBus = new MessageBus();
        this.teamCoordinator = new TeamCoordinator(this.messageBus);
        this.db = new CollaborationDatabase(dbPath);
    }
    async initialize() {
        if (this.initialized) {
            logger.warn('CollaborationManager: Already initialized');
            return;
        }
        logger.info('CollaborationManager: Initializing...');
        await this.db.initialize();
        const dbTeams = await this.db.listTeams();
        logger.info(`CollaborationManager: Loaded ${dbTeams.length} persisted teams from database`);
        for (const dbTeam of dbTeams) {
            const agentTeam = {
                id: dbTeam.id,
                name: dbTeam.name,
                description: dbTeam.description || '',
                members: dbTeam.members.map(m => m.agent_id),
                leader: dbTeam.members[0]?.agent_id || '',
                capabilities: [...new Set(dbTeam.members.flatMap(m => m.capabilities))],
            };
            this.teamCoordinator.restoreTeam(agentTeam);
        }
        logger.info(`CollaborationManager: Restored ${dbTeams.length} teams to memory`);
        const dbSessions = await this.db.listRecentSessions(1000);
        logger.info(`CollaborationManager: Loaded ${dbSessions.length} persisted sessions from database`);
        for (const dbSession of dbSessions) {
            const team = this.teamCoordinator.getTeams().find(t => t.id === dbSession.team_id);
            if (!team) {
                logger.warn(`CollaborationManager: Team ${dbSession.team_id} not found for session ${dbSession.id}, skipping`);
                continue;
            }
            const task = {
                id: dbSession.id,
                description: dbSession.task,
                requiredCapabilities: team.capabilities,
                status: dbSession.status === 'completed' ? 'completed' : dbSession.status === 'failed' ? 'failed' : 'in_progress',
            };
            const results = {
                success: dbSession.status === 'completed',
                error: dbSession.status === 'failed' ? 'Task failed' : undefined,
                cost: 0,
                durationMs: 0,
            };
            if (dbSession.results && dbSession.results.length > 0) {
                const firstResult = dbSession.results[0];
                if (firstResult.metadata) {
                    results.cost = firstResult.metadata.cost || 0;
                    results.durationMs = firstResult.metadata.durationMs || 0;
                }
            }
            const collaborationSession = {
                id: dbSession.id,
                task,
                team,
                startTime: dbSession.created_at,
                endTime: dbSession.completed_at,
                messages: [],
                results,
            };
            this.teamCoordinator.restoreSession(collaborationSession);
        }
        logger.info(`CollaborationManager: Restored ${dbSessions.length} sessions to memory`);
        this.initialized = true;
        logger.info('CollaborationManager: Initialized successfully');
    }
    registerAgent(agent) {
        if (!this.initialized) {
            throw new Error('CollaborationManager not initialized');
        }
        this.teamCoordinator.registerAgent(agent);
        this.messageBus.subscribe(agent.id, async (message) => {
            try {
                await agent.handleMessage(message);
            }
            catch (error) {
                logger.error(`CollaborationManager: Error handling message for agent ${agent.id}:`, error);
            }
        });
        logger.info(`CollaborationManager: Agent ${agent.name} registered and subscribed to messages`);
    }
    async createTeam(team) {
        if (!this.initialized) {
            throw new Error('CollaborationManager not initialized');
        }
        const createdTeam = this.teamCoordinator.createTeam(team);
        await this.db.createTeam({
            id: createdTeam.id,
            name: createdTeam.name,
            description: createdTeam.description,
        });
        for (const memberId of createdTeam.members) {
            const agent = this.teamCoordinator.getAgents().find(a => a.id === memberId);
            if (agent) {
                await this.db.addTeamMember({
                    team_id: createdTeam.id,
                    agent_id: agent.id,
                    agent_type: agent.type,
                    agent_name: agent.name,
                    capabilities: agent.capabilities.map(c => c.name),
                });
            }
        }
        return createdTeam;
    }
    async executeTask(task) {
        if (!this.initialized) {
            throw new Error('CollaborationManager not initialized');
        }
        logger.info(`CollaborationManager: Executing collaborative task: ${task.description}`);
        const session = await this.teamCoordinator.executeCollaborativeTask(task);
        await this.db.createSession({
            id: session.id,
            team_id: session.team.id,
            task: session.task.description,
            status: session.results.success ? 'completed' : 'failed',
        });
        await this.db.updateSessionStatus(session.id, session.results.success ? 'completed' : 'failed');
        if (session.results.output && Array.isArray(session.results.output)) {
            for (const [index, output] of session.results.output.entries()) {
                const agentName = session.team.members[index]
                    ? this.teamCoordinator.getAgents().find(a => a.id === session.team.members[index])?.name || 'unknown'
                    : 'unknown';
                await this.db.addSessionResult({
                    session_id: session.id,
                    agent_name: agentName,
                    result_type: 'analysis',
                    content: typeof output === 'string' ? output : JSON.stringify(output),
                    metadata: {
                        cost: session.results.cost,
                        durationMs: session.results.durationMs,
                    },
                });
            }
        }
        return session;
    }
    getTeamMetrics(teamId) {
        return this.teamCoordinator.getTeamMetrics(teamId);
    }
    getTeams() {
        return this.teamCoordinator.getTeams();
    }
    getAgents() {
        return this.teamCoordinator.getAgents();
    }
    getSession(sessionId) {
        return this.teamCoordinator.getSession(sessionId);
    }
    getMessageStats() {
        return this.messageBus.getStats();
    }
    getMessageHistory(filter) {
        return this.messageBus.getMessageHistory(filter);
    }
    clearMessageHistory() {
        this.messageBus.clearHistory();
    }
    async shutdown() {
        logger.info('CollaborationManager: Shutting down...');
        for (const agent of this.teamCoordinator.getAgents()) {
            try {
                await agent.shutdown();
            }
            catch (error) {
                logger.error(`CollaborationManager: Error shutting down agent ${agent.id}:`, error);
            }
        }
        await this.db.close();
        this.messageBus.removeAllListeners();
        this.initialized = false;
        logger.info('CollaborationManager: Shutdown complete');
    }
    async getRecentSessions(limit = 10) {
        return this.db.listRecentSessions(limit);
    }
    async searchSessions(query) {
        return this.db.searchSessions(query);
    }
    async getTeamSessions(teamId) {
        return this.db.getTeamSessions(teamId);
    }
    async getPersistedTeams() {
        return this.db.listTeams();
    }
}
//# sourceMappingURL=CollaborationManager.js.map