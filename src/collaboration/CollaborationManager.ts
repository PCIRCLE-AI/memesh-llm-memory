/**
 * CollaborationManager - Multi-Agent 協作框架主管理器
 *
 * 統一入口點，整合 MessageBus 和 TeamCoordinator
 */

import { MessageBus } from './MessageBus.js';
import { TeamCoordinator } from './TeamCoordinator.js';
import {
  CollaborativeAgent,
  AgentTeam,
  CollaborativeTask,
  CollaborationSession,
  TeamMetrics,
} from './types.js';
import { logger } from '../utils/logger.js';
import { CollaborationDatabase } from './persistence/database.js';

export class CollaborationManager {
  private messageBus: MessageBus;
  private teamCoordinator: TeamCoordinator;
  private db: CollaborationDatabase;
  private initialized: boolean = false;

  constructor(dbPath?: string) {
    this.messageBus = new MessageBus();
    this.teamCoordinator = new TeamCoordinator(this.messageBus);
    this.db = new CollaborationDatabase(dbPath);
  }

  /**
   * 初始化協作管理器
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('CollaborationManager: Already initialized');
      return;
    }

    logger.info('CollaborationManager: Initializing...');

    // Initialize database
    await this.db.initialize();

    // Load persisted teams from database and restore to teamCoordinator
    const dbTeams = await this.db.listTeams();
    logger.info(`CollaborationManager: Loaded ${dbTeams.length} persisted teams from database`);

    // Restore teams to teamCoordinator
    for (const dbTeam of dbTeams) {
      // Convert DB Team to AgentTeam format
      const agentTeam = {
        id: dbTeam.id,
        name: dbTeam.name,
        description: dbTeam.description || '',
        members: dbTeam.members.map(m => m.agent_id),
        leader: dbTeam.members[0]?.agent_id || '', // First member as leader
        capabilities: [...new Set(dbTeam.members.flatMap(m => m.capabilities))], // Unique capabilities
      };

      this.teamCoordinator.restoreTeam(agentTeam);
    }

    logger.info(`CollaborationManager: Restored ${dbTeams.length} teams to memory`);

    // Load persisted sessions from database and restore to teamCoordinator
    const dbSessions = await this.db.listRecentSessions(1000); // Load up to 1000 sessions
    logger.info(`CollaborationManager: Loaded ${dbSessions.length} persisted sessions from database`);

    // Restore sessions to teamCoordinator
    for (const dbSession of dbSessions) {
      // Find the team using team_id
      const team = this.teamCoordinator.getTeams().find(t => t.id === dbSession.team_id);
      if (!team) {
        logger.warn(`CollaborationManager: Team ${dbSession.team_id} not found for session ${dbSession.id}, skipping`);
        continue;
      }

      // Reconstruct CollaborativeTask from stored data
      const task: CollaborativeTask = {
        id: dbSession.id, // Use session ID as task ID
        description: dbSession.task,
        requiredCapabilities: team.capabilities,
        status: dbSession.status === 'completed' ? 'completed' : dbSession.status === 'failed' ? 'failed' : 'in_progress',
      };

      // Reconstruct results object from session results
      const results = {
        success: dbSession.status === 'completed',
        error: dbSession.status === 'failed' ? 'Task failed' : undefined,
        cost: 0, // Default value, will be updated if stored in metadata
        durationMs: 0, // Default value
      };

      // Extract cost and duration from session results metadata if available
      if (dbSession.results && dbSession.results.length > 0) {
        const firstResult = dbSession.results[0];
        if (firstResult.metadata) {
          results.cost = firstResult.metadata.cost || 0;
          results.durationMs = firstResult.metadata.durationMs || 0;
        }
      }

      // Create CollaborationSession
      const collaborationSession: CollaborationSession = {
        id: dbSession.id,
        task,
        team,
        startTime: dbSession.created_at,
        endTime: dbSession.completed_at,
        messages: [], // Messages are not persisted, so empty array
        results,
      };

      this.teamCoordinator.restoreSession(collaborationSession);
    }

    logger.info(`CollaborationManager: Restored ${dbSessions.length} sessions to memory`);

    this.initialized = true;
    logger.info('CollaborationManager: Initialized successfully');
  }

  /**
   * 註冊 agent
   */
  registerAgent(agent: CollaborativeAgent): void {
    if (!this.initialized) {
      throw new Error('CollaborationManager not initialized');
    }

    this.teamCoordinator.registerAgent(agent);

    // 訂閱 agent 的訊息
    this.messageBus.subscribe(agent.id, async (message) => {
      try {
        await agent.handleMessage(message);
      } catch (error) {
        logger.error(`CollaborationManager: Error handling message for agent ${agent.id}:`, error);
      }
    });

    logger.info(`CollaborationManager: Agent ${agent.name} registered and subscribed to messages`);
  }

  /**
   * 創建 team
   */
  async createTeam(team: Omit<AgentTeam, 'id'>): Promise<AgentTeam> {
    if (!this.initialized) {
      throw new Error('CollaborationManager not initialized');
    }

    const createdTeam = this.teamCoordinator.createTeam(team);

    // Persist team to database
    await this.db.createTeam({
      id: createdTeam.id,
      name: createdTeam.name,
      description: createdTeam.description,
    });

    // Persist team members
    for (const memberId of createdTeam.members) {
      const agent = this.teamCoordinator.getAgents().find(a => a.id === memberId);
      if (agent) {
        await this.db.addTeamMember({
          team_id: createdTeam.id,
          agent_id: agent.id, // Store agent UUID for restoration
          agent_type: agent.type,
          agent_name: agent.name,
          capabilities: agent.capabilities.map(c => c.name),
        });
      }
    }

    return createdTeam;
  }

  /**
   * 執行協作任務
   */
  async executeTask(task: CollaborativeTask): Promise<CollaborationSession> {
    if (!this.initialized) {
      throw new Error('CollaborationManager not initialized');
    }

    logger.info(`CollaborationManager: Executing collaborative task: ${task.description}`);

    // Execute the task
    const session = await this.teamCoordinator.executeCollaborativeTask(task);

    // Persist session to database
    await this.db.createSession({
      id: session.id,
      team_id: session.team.id,
      task: session.task.description,
      status: session.results.success ? 'completed' : 'failed',
    });

    // Update session status
    await this.db.updateSessionStatus(
      session.id,
      session.results.success ? 'completed' : 'failed'
    );

    // Persist session results if available
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

  /**
   * 獲取 team 效能指標
   */
  getTeamMetrics(teamId: string): TeamMetrics | null {
    return this.teamCoordinator.getTeamMetrics(teamId);
  }

  /**
   * 獲取所有 teams
   */
  getTeams(): AgentTeam[] {
    return this.teamCoordinator.getTeams();
  }

  /**
   * 獲取所有 agents
   */
  getAgents(): CollaborativeAgent[] {
    return this.teamCoordinator.getAgents();
  }

  /**
   * 獲取 session
   */
  getSession(sessionId: string): CollaborationSession | undefined {
    return this.teamCoordinator.getSession(sessionId);
  }

  /**
   * 獲取訊息統計
   */
  getMessageStats() {
    return this.messageBus.getStats();
  }

  /**
   * 獲取訊息歷史
   */
  getMessageHistory(filter?: Parameters<MessageBus['getMessageHistory']>[0]) {
    return this.messageBus.getMessageHistory(filter);
  }

  /**
   * 清除訊息歷史
   */
  clearMessageHistory(): void {
    this.messageBus.clearHistory();
  }

  /**
   * 關閉協作管理器
   */
  async shutdown(): Promise<void> {
    logger.info('CollaborationManager: Shutting down...');

    // 關閉所有 agents
    for (const agent of this.teamCoordinator.getAgents()) {
      try {
        await agent.shutdown();
      } catch (error) {
        logger.error(`CollaborationManager: Error shutting down agent ${agent.id}:`, error);
      }
    }

    // Close database connection
    await this.db.close();

    this.messageBus.removeAllListeners();
    this.initialized = false;

    logger.info('CollaborationManager: Shutdown complete');
  }

  /**
   * Query Operations (new methods for accessing persisted data)
   */

  async getRecentSessions(limit: number = 10) {
    return this.db.listRecentSessions(limit);
  }

  async searchSessions(query: string) {
    return this.db.searchSessions(query);
  }

  async getTeamSessions(teamId: string) {
    return this.db.getTeamSessions(teamId);
  }

  async getPersistedTeams() {
    return this.db.listTeams();
  }
}
