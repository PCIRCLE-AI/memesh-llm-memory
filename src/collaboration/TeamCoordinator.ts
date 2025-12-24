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

export class TeamCoordinator {
  private teams: Map<string, AgentTeam> = new Map();
  private agents: Map<string, CollaborativeAgent> = new Map();
  private sessions: Map<string, CollaborationSession> = new Map();
  private messageBus: MessageBus;

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
   * 將任務分解為子任務
   */
  async decomposeTask(task: CollaborativeTask, team: AgentTeam): Promise<CollaborativeSubTask[]> {
    const subtasks: CollaborativeSubTask[] = [];

    // 負載均衡：追蹤每個 agent 被分配的子任務數量
    const agentWorkload = new Map<string, number>();
    team.members.forEach(memberId => agentWorkload.set(memberId, 0));

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

      subtasks.push({
        id: uuidv4(),
        parentTaskId: task.id,
        description: `Execute ${capability} for: ${task.description}`,
        assignedAgent,
        status: 'pending',
        dependencies: [], // TODO: Implement dependency analysis
      });

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

      // 執行子任務（按順序）
      const results: any[] = [];
      for (const subtask of subtasks) {
        if (!subtask.assignedAgent) continue;

        subtask.status = 'in_progress';
        const agent = this.agents.get(subtask.assignedAgent);

        if (!agent) {
          throw new Error(`Agent ${subtask.assignedAgent} not found`);
        }

        logger.info(`TeamCoordinator: Executing subtask ${subtask.id} with agent ${agent.name}`);

        // 發送任務訊息給 agent
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

        // 執行任務（這裡簡化為直接呼叫）
        try {
          const result = await agent.handleMessage(taskMessage);
          subtask.output = result.content.result;
          subtask.status = 'completed';
          results.push(subtask.output);

          session.messages.push(result);
        } catch (error: any) {
          subtask.status = 'failed';
          subtask.error = error.message;
          throw error;
        }
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
   * 獲取 team 效能指標
   */
  getTeamMetrics(teamId: string): TeamMetrics | null {
    const team = this.teams.get(teamId);
    if (!team) return null;

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

    return {
      teamId,
      tasksCompleted: completed.length,
      successRate: teamSessions.length > 0 ? completed.length / teamSessions.length : 0,
      averageDurationMs: teamSessions.length > 0 ? totalDuration / teamSessions.length : 0,
      totalCost,
      agentUtilization,
    };
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
