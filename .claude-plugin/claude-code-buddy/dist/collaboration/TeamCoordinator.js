import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { costTracker } from '../utils/cost-tracker.js';
export class TeamCoordinator {
    teams = new Map();
    agents = new Map();
    sessions = new Map();
    messageBus;
    metricsCache = new Map();
    metricsCacheTTL = 5000;
    constructor(messageBus) {
        this.messageBus = messageBus;
    }
    registerAgent(agent) {
        this.agents.set(agent.id, agent);
        logger.info(`TeamCoordinator: Registered agent ${agent.name} (${agent.id})`);
    }
    restoreTeam(team) {
        this.teams.set(team.id, team);
        logger.info(`TeamCoordinator: Restored team ${team.name} (${team.id}) from database`);
    }
    createTeam(team) {
        const id = uuidv4();
        const newTeam = { id, ...team };
        for (const memberId of team.members) {
            if (!this.agents.has(memberId)) {
                throw new Error(`Agent ${memberId} not registered`);
            }
        }
        if (!team.members.includes(team.leader)) {
            throw new Error(`Leader ${team.leader} must be a team member`);
        }
        const memberCapabilities = new Set();
        for (const memberId of team.members) {
            const agent = this.agents.get(memberId);
            for (const cap of agent.capabilities) {
                memberCapabilities.add(cap.name);
            }
        }
        for (const requiredCap of team.capabilities) {
            if (!memberCapabilities.has(requiredCap)) {
                throw new Error(`Team capability '${requiredCap}' is not provided by any team member`);
            }
        }
        this.teams.set(id, newTeam);
        logger.info(`TeamCoordinator: Created team ${team.name} (${id}) with ${team.members.length} members`);
        return newTeam;
    }
    selectTeamForTask(task) {
        let bestTeam = null;
        let bestScore = 0;
        for (const team of this.teams.values()) {
            const matchedCapabilities = task.requiredCapabilities.filter(cap => team.capabilities.includes(cap));
            const score = matchedCapabilities.length / task.requiredCapabilities.length;
            if (score > bestScore) {
                bestScore = score;
                bestTeam = team;
            }
        }
        if (bestScore < 0.5) {
            logger.warn(`TeamCoordinator: No suitable team found for task ${task.id} (best match: ${bestScore * 100}%)`);
            return null;
        }
        logger.info(`TeamCoordinator: Selected team ${bestTeam.name} for task ${task.id} (match: ${bestScore * 100}%)`);
        return bestTeam;
    }
    analyzeDependencies(capabilities) {
        const dependencyRules = {
            design: ['analyze'],
            implement: ['design'],
            test: ['implement'],
            review: ['analyze', 'design', 'implement'],
            deploy: ['test'],
            optimize: ['analyze'],
            document: ['implement', 'design'],
        };
        const dependencies = new Map();
        capabilities.forEach(capability => {
            const deps = dependencyRules[capability] || [];
            const actualDeps = deps.filter(dep => capabilities.includes(dep));
            dependencies.set(capability, actualDeps);
        });
        return dependencies;
    }
    async decomposeTask(task, team) {
        const subtasks = [];
        const capabilityToSubtaskId = new Map();
        const agentWorkload = new Map();
        team.members.forEach(memberId => agentWorkload.set(memberId, 0));
        const capabilityDependencies = this.analyzeDependencies(task.requiredCapabilities);
        for (const capability of task.requiredCapabilities) {
            const capableAgents = team.members.filter(memberId => {
                const agent = this.agents.get(memberId);
                return agent?.capabilities.some(c => c.name === capability);
            });
            if (capableAgents.length === 0)
                continue;
            let assignedAgent = capableAgents[0];
            let minWorkload = agentWorkload.get(assignedAgent) || 0;
            for (const agentId of capableAgents) {
                const workload = agentWorkload.get(agentId) || 0;
                if (workload < minWorkload) {
                    assignedAgent = agentId;
                    minWorkload = workload;
                }
            }
            agentWorkload.set(assignedAgent, minWorkload + 1);
            const subtaskId = uuidv4();
            const capDeps = capabilityDependencies.get(capability) || [];
            const subtaskDeps = capDeps
                .map(dep => capabilityToSubtaskId.get(dep))
                .filter((id) => id !== undefined);
            subtasks.push({
                id: subtaskId,
                parentTaskId: task.id,
                description: `Execute ${capability} for: ${task.description}`,
                assignedAgent,
                status: 'pending',
                dependencies: subtaskDeps,
            });
            capabilityToSubtaskId.set(capability, subtaskId);
            const agent = this.agents.get(assignedAgent);
            logger.info(`TeamCoordinator: Assigned ${capability} to ${agent?.name || assignedAgent} ` +
                `(workload: ${agentWorkload.get(assignedAgent)})`);
        }
        logger.info(`TeamCoordinator: Decomposed task ${task.id} into ${subtasks.length} subtasks`);
        return subtasks;
    }
    async executeCollaborativeTask(task) {
        const startTime = new Date();
        const sessionId = uuidv4();
        const team = this.selectTeamForTask(task);
        if (!team) {
            throw new Error(`No suitable team found for task ${task.id}`);
        }
        const session = {
            id: sessionId,
            task,
            team,
            startTime,
            messages: [],
            results: {
                success: false,
                cost: 0,
                durationMs: 0,
            },
        };
        this.sessions.set(sessionId, session);
        try {
            const subtasks = await this.decomposeTask(task, team);
            task.subtasks = subtasks;
            task.status = 'in_progress';
            logger.info(`TeamCoordinator: Executing task ${task.id} with team ${team.name}`);
            const results = [];
            const completedSubtasks = new Set();
            const executeSubtask = async (subtask) => {
                if (!subtask.assignedAgent)
                    return;
                subtask.status = 'in_progress';
                const agent = this.agents.get(subtask.assignedAgent);
                if (!agent) {
                    throw new Error(`Agent ${subtask.assignedAgent} not found`);
                }
                logger.info(`TeamCoordinator: Executing subtask ${subtask.id} with agent ${agent.name}`);
                const taskMessage = {
                    id: uuidv4(),
                    from: 'coordinator',
                    to: agent.id,
                    timestamp: new Date(),
                    type: 'request',
                    content: {
                        task: subtask.description,
                        data: subtask.input || task.context,
                    },
                    metadata: {
                        correlationId: sessionId,
                        requiresResponse: true,
                    },
                };
                session.messages.push(taskMessage);
                this.messageBus.sendMessage(taskMessage);
                try {
                    const result = await agent.handleMessage(taskMessage);
                    if (result.metadata?.usage) {
                        const { model, inputTokens, outputTokens } = result.metadata.usage;
                        if (model && inputTokens && outputTokens) {
                            const cost = costTracker.trackClaude(model, inputTokens, outputTokens);
                            session.results.cost += cost;
                            logger.debug(`TeamCoordinator: Agent ${agent.name} cost: $${cost.toFixed(6)}`);
                        }
                    }
                    subtask.output = result.content.result;
                    subtask.status = 'completed';
                    results.push(subtask.output);
                    completedSubtasks.add(subtask.id);
                    session.messages.push(result);
                }
                catch (error) {
                    subtask.status = 'failed';
                    subtask.error = error.message;
                    throw error;
                }
            };
            while (completedSubtasks.size < subtasks.length) {
                const readySubtasks = subtasks.filter(st => st.status === 'pending' &&
                    (st.dependencies || []).every(dep => completedSubtasks.has(dep)));
                if (readySubtasks.length === 0) {
                    const pendingSubtasks = subtasks.filter(st => st.status === 'pending');
                    if (pendingSubtasks.length > 0) {
                        throw new Error('Circular dependency detected or missing dependencies');
                    }
                    break;
                }
                logger.info(`TeamCoordinator: Executing ${readySubtasks.length} subtasks in parallel`);
                await Promise.all(readySubtasks.map(executeSubtask));
            }
            task.status = 'completed';
            session.results.success = true;
            session.results.output = results;
        }
        catch (error) {
            task.status = 'failed';
            session.results.success = false;
            session.results.error = error.message;
            logger.error(`TeamCoordinator: Task ${task.id} failed:`, error);
        }
        finally {
            session.endTime = new Date();
            session.results.durationMs = session.endTime.getTime() - startTime.getTime();
            logger.info(`TeamCoordinator: Task ${task.id} ${session.results.success ? 'completed' : 'failed'} ` +
                `in ${session.results.durationMs}ms`);
        }
        return session;
    }
    getTeamMetrics(teamId) {
        const team = this.teams.get(teamId);
        if (!team)
            return null;
        const cached = this.metricsCache.get(teamId);
        const now = Date.now();
        if (cached && (now - cached.timestamp) < this.metricsCacheTTL) {
            return cached.metrics;
        }
        const teamSessions = Array.from(this.sessions.values()).filter(s => s.team.id === teamId);
        const completed = teamSessions.filter(s => s.results.success);
        const totalDuration = teamSessions.reduce((sum, s) => sum + s.results.durationMs, 0);
        const totalCost = teamSessions.reduce((sum, s) => sum + s.results.cost, 0);
        const agentUtilization = {};
        const allSubtasks = teamSessions.flatMap(s => s.task.subtasks || []);
        const completedSubtasks = allSubtasks.filter(st => st.status === 'completed');
        for (const memberId of team.members) {
            const memberSubtasks = completedSubtasks.filter(st => st.assignedAgent === memberId);
            agentUtilization[memberId] = completedSubtasks.length > 0
                ? (memberSubtasks.length / completedSubtasks.length) * 100
                : 0;
        }
        const metrics = {
            teamId,
            tasksCompleted: completed.length,
            successRate: teamSessions.length > 0 ? completed.length / teamSessions.length : 0,
            averageDurationMs: teamSessions.length > 0 ? totalDuration / teamSessions.length : 0,
            totalCost,
            agentUtilization,
        };
        this.metricsCache.set(teamId, { metrics, timestamp: now });
        return metrics;
    }
    getTeams() {
        return Array.from(this.teams.values());
    }
    getAgents() {
        return Array.from(this.agents.values());
    }
    restoreSession(session) {
        this.sessions.set(session.id, session);
        logger.info(`TeamCoordinator: Restored session ${session.id} from database`);
    }
    getSession(sessionId) {
        return this.sessions.get(sessionId);
    }
}
//# sourceMappingURL=TeamCoordinator.js.map