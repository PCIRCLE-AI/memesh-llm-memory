/**
 * TeamCoordinator - Agent Team 管理與任務協調
 *
 * 負責：
 * - 建立和管理 agent teams
 * - 將任務分配給合適的 team
 * - 監控 team 執行狀態
 * - 收集和匯總結果
 */

import {
  AgentTeam,
  CollaborativeAgent,
  CollaborativeTask,
  CollaborativeSubTask,
  CollaborationSession,
  AgentMessage,
  TeamMetrics,
} from './types.js';
import { MessageBus } from './MessageBus.js';
import { logger } from '../utils/logger.js';
import { v4 as uuidv4 } from 'uuid';
import { costTracker } from '../utils/cost-tracker.js';
import type { ClaudeModel } from '../config/models.js';

interface MetricsCache {
  metrics: TeamMetrics;
  timestamp: number;
}

export class TeamCoordinator {
  private teams: Map<string, AgentTeam> = new Map();
  private agents: Map<string, CollaborativeAgent> = new Map();
  private sessions: Map<string, CollaborationSession> = new Map();
  private messageBus: MessageBus;
  private metricsCache: Map<string, MetricsCache> = new Map();
  private metricsCacheTTL: number = 5000; // 5 seconds TTL

  constructor(messageBus: MessageBus) {
    this.messageBus = messageBus;
  }

  /**
   * 註冊 agent
   */
  registerAgent(agent: CollaborativeAgent): void {
    this.agents.set(agent.id, agent);
    logger.info(`TeamCoordinator: Registered agent ${agent.name} (${agent.id})`);
  }

  /**
   * 建立 team
   */
  createTeam(team: Omit<AgentTeam, 'id'>): AgentTeam {
    const id = uuidv4();
    const newTeam: AgentTeam = { id, ...team };

    // 驗證 members 都是已註冊的 agents
    for (const memberId of team.members) {
      if (!this.agents.has(memberId)) {
        throw new Error(`Agent ${memberId} not registered`);
      }
    }

    // 驗證 leader 是 members 之一
    if (!team.members.includes(team.leader)) {
      throw new Error(`Leader ${team.leader} must be a team member`);
    }

    this.teams.set(id, newTeam);
    logger.info(`TeamCoordinator: Created team ${team.name} (${id}) with ${team.members.length} members`);

    return newTeam;
  }

  /**
   * 選擇最適合的 team 執行任務
   */
  selectTeamForTask(task: CollaborativeTask): AgentTeam | null {
    let bestTeam: AgentTeam | null = null;
    let bestScore = 0;

    for (const team of this.teams.values()) {
      // 計算 team 能力匹配度
      const matchedCapabilities = task.requiredCapabilities.filter(cap =>
        team.capabilities.includes(cap)
      );

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

    logger.info(`TeamCoordinator: Selected team ${bestTeam!.name} for task ${task.id} (match: ${bestScore * 100}%)`);
    return bestTeam;
  }

  /**
   * 分析 capability 之間的依賴關係
   * 基於常見的工作流程順序
   */
  private analyzeDependencies(capabilities: string[]): Map<string, string[]> {
    const dependencyRules: Record<string, string[]> = {
      // 設計依賴分析
      design: ['analyze'],
      // 實作依賴設計
      implement: ['design'],
      // 測試依賴實作
      test: ['implement'],
      // 審查可以依賴任何產出
      review: ['analyze', 'design', 'implement'],
      // 部署依賴測試
      deploy: ['test'],
      // 優化依賴分析
      optimize: ['analyze'],
      // 文檔依賴實作
      document: ['implement', 'design'],
    };

    const dependencies = new Map<string, string[]>();

    capabilities.forEach(capability => {
      const deps = dependencyRules[capability] || [];
      // 只保留實際存在於任務中的依賴
      const actualDeps = deps.filter(dep => capabilities.includes(dep));
      dependencies.set(capability, actualDeps);
    });

    return dependencies;
  }

  /**
   * 將任務分解為子任務
   */
  async decomposeTask(task: CollaborativeTask, team: AgentTeam): Promise<CollaborativeSubTask[]> {
    const subtasks: CollaborativeSubTask[] = [];
    const capabilityToSubtaskId = new Map<string, string>(); // Track subtask IDs by capability

    // 負載均衡：追蹤每個 agent 被分配的子任務數量
    const agentWorkload = new Map<string, number>();
    team.members.forEach(memberId => agentWorkload.set(memberId, 0));

    // 分析 capability 之間的依賴關係
    const capabilityDependencies = this.analyzeDependencies(task.requiredCapabilities);

    // 為每個 required capability 分配一個 subtask
    for (const capability of task.requiredCapabilities) {
      // 找到所有擁有此 capability 的 agents
      const capableAgents = team.members.filter(memberId => {
        const agent = this.agents.get(memberId);
        return agent?.capabilities.some(c => c.name === capability);
      });

      if (capableAgents.length === 0) continue;

      // 選擇工作量最少的 agent（負載均衡）
      let assignedAgent = capableAgents[0];
      let minWorkload = agentWorkload.get(assignedAgent) || 0;

      for (const agentId of capableAgents) {
        const workload = agentWorkload.get(agentId) || 0;
        if (workload < minWorkload) {
          assignedAgent = agentId;
          minWorkload = workload;
        }
      }

      // 更新工作量計數
      agentWorkload.set(assignedAgent, minWorkload + 1);

      // 創建 subtask ID
      const subtaskId = uuidv4();

      // 獲取此 capability 的依賴，並轉換為 subtask IDs
      const capDeps = capabilityDependencies.get(capability) || [];
      const subtaskDeps = capDeps
        .map(dep => capabilityToSubtaskId.get(dep))
        .filter((id): id is string => id !== undefined);

      subtasks.push({
        id: subtaskId,
        parentTaskId: task.id,
        description: `Execute ${capability} for: ${task.description}`,
        assignedAgent,
        status: 'pending',
        dependencies: subtaskDeps,
      });

      // 記錄 capability 到 subtask ID 的映射
      capabilityToSubtaskId.set(capability, subtaskId);

      const agent = this.agents.get(assignedAgent);
      logger.info(
        `TeamCoordinator: Assigned ${capability} to ${agent?.name || assignedAgent} ` +
        `(workload: ${agentWorkload.get(assignedAgent)})`
      );
    }

    logger.info(`TeamCoordinator: Decomposed task ${task.id} into ${subtasks.length} subtasks`);
    return subtasks;
  }

  /**
   * 執行協作任務
   */
  async executeCollaborativeTask(
    task: CollaborativeTask
  ): Promise<CollaborationSession> {
    const startTime = new Date();
    const sessionId = uuidv4();

    // 選擇 team
    const team = this.selectTeamForTask(task);
    if (!team) {
      throw new Error(`No suitable team found for task ${task.id}`);
    }

    // 創建 session
    const session: CollaborationSession = {
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
      // 分解任務
      const subtasks = await this.decomposeTask(task, team);
      task.subtasks = subtasks;
      task.status = 'in_progress';

      logger.info(`TeamCoordinator: Executing task ${task.id} with team ${team.name}`);

      // 執行子任務（支援並行執行）
      const results: any[] = [];
      const completedSubtasks = new Set<string>();

      // 執行單個 subtask 的輔助函數
      const executeSubtask = async (subtask: CollaborativeSubTask): Promise<void> => {
        if (!subtask.assignedAgent) return;

        subtask.status = 'in_progress';
        const agent = this.agents.get(subtask.assignedAgent);

        if (!agent) {
          throw new Error(`Agent ${subtask.assignedAgent} not found`);
        }

        logger.info(`TeamCoordinator: Executing subtask ${subtask.id} with agent ${agent.name}`);

        const taskMessage: AgentMessage = {
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

          // Track cost if usage information is provided
          if (result.metadata?.usage) {
            const { model, inputTokens, outputTokens } = result.metadata.usage;
            if (model && inputTokens && outputTokens) {
              const cost = costTracker.trackClaude(
                model as ClaudeModel,
                inputTokens,
                outputTokens
              );
              session.results.cost += cost;
              logger.debug(`TeamCoordinator: Agent ${agent.name} cost: $${cost.toFixed(6)}`);
            }
          }

          subtask.output = result.content.result;
          subtask.status = 'completed';
          results.push(subtask.output);
          completedSubtasks.add(subtask.id);

          session.messages.push(result);
        } catch (error: any) {
          subtask.status = 'failed';
          subtask.error = error.message;
          throw error;
        }
      };

      // 使用拓撲排序進行並行執行
      while (completedSubtasks.size < subtasks.length) {
        // 找出所有依賴已滿足的 subtasks
        const readySubtasks = subtasks.filter(st =>
          st.status === 'pending' &&
          (st.dependencies || []).every(dep => completedSubtasks.has(dep))
        );

        if (readySubtasks.length === 0) {
          // 所有剩餘任務都在等待依賴，檢查是否有循環依賴
          const pendingSubtasks = subtasks.filter(st => st.status === 'pending');
          if (pendingSubtasks.length > 0) {
            throw new Error('Circular dependency detected or missing dependencies');
          }
          break;
        }

        // 並行執行所有準備好的 subtasks
        logger.info(
          `TeamCoordinator: Executing ${readySubtasks.length} subtasks in parallel`
        );
        await Promise.all(readySubtasks.map(executeSubtask));
      }

      // 匯總結果
      task.status = 'completed';
      session.results.success = true;
      session.results.output = results;

    } catch (error: any) {
      task.status = 'failed';
      session.results.success = false;
      session.results.error = error.message;
      logger.error(`TeamCoordinator: Task ${task.id} failed:`, error);
    } finally {
      session.endTime = new Date();
      session.results.durationMs = session.endTime.getTime() - startTime.getTime();

      logger.info(
        `TeamCoordinator: Task ${task.id} ${session.results.success ? 'completed' : 'failed'} ` +
        `in ${session.results.durationMs}ms`
      );
    }

    return session;
  }

  /**
   * 獲取 team 效能指標（帶快取）
   */
  getTeamMetrics(teamId: string): TeamMetrics | null {
    const team = this.teams.get(teamId);
    if (!team) return null;

    // 檢查快取
    const cached = this.metricsCache.get(teamId);
    const now = Date.now();
    if (cached && (now - cached.timestamp) < this.metricsCacheTTL) {
      return cached.metrics;
    }

    // 收集此 team 的所有 sessions
    const teamSessions = Array.from(this.sessions.values()).filter(
      s => s.team.id === teamId
    );

    const completed = teamSessions.filter(s => s.results.success);
    const totalDuration = teamSessions.reduce((sum, s) => sum + s.results.durationMs, 0);
    const totalCost = teamSessions.reduce((sum, s) => sum + s.results.cost, 0);

    // Agent 使用率：基於執行的 subtasks 數量
    const agentUtilization: Record<string, number> = {};
    const allSubtasks = teamSessions.flatMap(s => s.task.subtasks || []);
    const completedSubtasks = allSubtasks.filter(st => st.status === 'completed');

    for (const memberId of team.members) {
      const memberSubtasks = completedSubtasks.filter(st => st.assignedAgent === memberId);
      agentUtilization[memberId] = completedSubtasks.length > 0
        ? (memberSubtasks.length / completedSubtasks.length) * 100
        : 0;
    }

    const metrics: TeamMetrics = {
      teamId,
      tasksCompleted: completed.length,
      successRate: teamSessions.length > 0 ? completed.length / teamSessions.length : 0,
      averageDurationMs: teamSessions.length > 0 ? totalDuration / teamSessions.length : 0,
      totalCost,
      agentUtilization,
    };

    // 更新快取
    this.metricsCache.set(teamId, { metrics, timestamp: now });

    return metrics;
  }

  /**
   * 獲取所有 teams
   */
  getTeams(): AgentTeam[] {
    return Array.from(this.teams.values());
  }

  /**
   * 獲取所有已註冊的 agents
   */
  getAgents(): CollaborativeAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * 獲取 session
   */
  getSession(sessionId: string): CollaborationSession | undefined {
    return this.sessions.get(sessionId);
  }
}
