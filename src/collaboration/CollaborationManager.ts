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

export class CollaborationManager {
  private messageBus: MessageBus;
  private teamCoordinator: TeamCoordinator;
  private initialized: boolean = false;

  constructor() {
    this.messageBus = new MessageBus();
    this.teamCoordinator = new TeamCoordinator(this.messageBus);
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

    // TODO: 載入已保存的 teams 和 agents
    // TODO: 設置定期清理機制

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
  createTeam(team: Omit<AgentTeam, 'id'>): AgentTeam {
    if (!this.initialized) {
      throw new Error('CollaborationManager not initialized');
    }

    return this.teamCoordinator.createTeam(team);
  }

  /**
   * 執行協作任務
   */
  async executeTask(task: CollaborativeTask): Promise<CollaborationSession> {
    if (!this.initialized) {
      throw new Error('CollaborationManager not initialized');
    }

    logger.info(`CollaborationManager: Executing collaborative task: ${task.description}`);
    return this.teamCoordinator.executeCollaborativeTask(task);
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

    this.messageBus.removeAllListeners();
    this.initialized = false;

    logger.info('CollaborationManager: Shutdown complete');
  }
}
