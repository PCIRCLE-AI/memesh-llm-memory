/**
 * AgentRouter - 智能 Agent 路由器
 *
 * 功能：
 * - 根據任務分析結果路由到最佳 Agent
 * - 支援 Claude Sonnet 4.5、Opus 4.5、Haiku
 * - 記憶體感知路由 (檢查系統資源)
 * - 成本最佳化決策
 * - 提供 fallback 機制
 */

import os from 'os';
import { TaskAnalysis, RoutingDecision, AgentType, SystemResources } from './types.js';
import { CLAUDE_MODELS } from '../config/models.js';

export class AgentRouter {
  constructor() {
    // Constructor intentionally empty - configuration loaded when needed
  }

  /**
   * 路由任務到最佳 Agent
   */
  async route(analysis: TaskAnalysis): Promise<RoutingDecision> {
    const systemResources = await this.getSystemResources();

    // 檢查記憶體是否足夠
    if (!this.hasEnoughMemory(systemResources, analysis)) {
      return this.createFallbackDecision(analysis, 'Insufficient memory');
    }

    // 根據複雜度選擇 Agent
    const selectedAgent = this.selectAgent(analysis);
    const modelName = this.getModelName(selectedAgent);
    const fallbackAgent = this.getFallbackAgent(selectedAgent);

    return {
      taskId: analysis.taskId,
      selectedAgent,
      modelName,
      estimatedCost: analysis.estimatedCost,
      fallbackAgent,
      reasoning: this.generateRoutingReasoning(
        analysis,
        selectedAgent,
        systemResources
      ),
    };
  }

  /**
   * 獲取系統資源狀態
   */
  async getSystemResources(): Promise<SystemResources> {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      totalMemoryMB: Math.floor(totalMemory / 1024 / 1024),
      availableMemoryMB: Math.floor(freeMemory / 1024 / 1024),
      memoryUsagePercent: Math.floor((usedMemory / totalMemory) * 100),
      cpuUsagePercent: this.getCPUUsage(),
    };
  }

  /**
   * 檢查記憶體是否足夠
   */
  private hasEnoughMemory(resources: SystemResources, analysis: TaskAnalysis): boolean {
    const requiredMemoryMB = this.estimateRequiredMemory(analysis);

    if (resources.availableMemoryMB < requiredMemoryMB) {
      console.warn(
        `⚠️  Insufficient memory: Available ${resources.availableMemoryMB}MB, ` +
        `Required ${requiredMemoryMB}MB`
      );
      return false;
    }

    return true;
  }

  /**
   * 估算任務所需記憶體 (MB)
   */
  private estimateRequiredMemory(analysis: TaskAnalysis): number {
    const baseMemory = {
      simple: 100,
      medium: 500,
      complex: 1000,
    };

    return baseMemory[analysis.complexity];
  }

  /**
   * 選擇最佳 Agent
   */
  private selectAgent(analysis: TaskAnalysis): AgentType {
    // 優先使用分析結果推薦的第一個 Agent
    const recommendedAgent = analysis.requiredAgents[0];

    const agentMap: Record<string, AgentType> = {
      'claude-haiku': 'claude-haiku',
      'claude-sonnet': 'claude-sonnet',
      'claude-opus': 'claude-opus',
    };

    return agentMap[recommendedAgent] || 'claude-sonnet';
  }

  /**
   * 獲取 Agent 對應的模型名稱
   */
  private getModelName(agent: AgentType): string {
    const modelMap: Record<AgentType, string> = {
      'claude-haiku': CLAUDE_MODELS.HAIKU,
      'claude-sonnet': CLAUDE_MODELS.SONNET,
      'claude-opus': CLAUDE_MODELS.OPUS,
      'openai-gpt4': 'gpt-4-turbo-preview',
    };

    return modelMap[agent];
  }

  /**
   * 獲取備用 Agent
   */
  private getFallbackAgent(primaryAgent: AgentType): AgentType | undefined {
    const fallbackMap: Record<AgentType, AgentType | undefined> = {
      'claude-opus': 'claude-sonnet',
      'claude-sonnet': 'claude-haiku',
      'claude-haiku': undefined,
      'openai-gpt4': 'claude-sonnet',
    };

    return fallbackMap[primaryAgent];
  }

  /**
   * 生成路由推理說明
   */
  private generateRoutingReasoning(
    analysis: TaskAnalysis,
    selectedAgent: AgentType,
    resources: SystemResources
  ): string {
    const reasons: string[] = [];

    reasons.push(`Selected ${selectedAgent} based on ${analysis.complexity} complexity`);
    reasons.push(`Available memory: ${resources.availableMemoryMB}MB`);
    reasons.push(`Memory usage: ${resources.memoryUsagePercent}%`);
    reasons.push(`Estimated cost: $${analysis.estimatedCost.toFixed(6)}`);

    if (selectedAgent === 'claude-opus') {
      reasons.push('Using Opus for complex reasoning tasks');
    } else if (selectedAgent === 'claude-haiku') {
      reasons.push('Using Haiku for cost-efficient simple tasks');
    } else {
      reasons.push('Using Sonnet for balanced performance');
    }

    return reasons.join('. ');
  }

  /**
   * 創建降級決策 (當資源不足時)
   */
  private createFallbackDecision(
    analysis: TaskAnalysis,
    reason: string
  ): RoutingDecision {
    // 降級到更輕量的模型
    const fallbackAgent: AgentType = 'claude-haiku';

    return {
      taskId: analysis.taskId,
      selectedAgent: fallbackAgent,
      modelName: this.getModelName(fallbackAgent),
      estimatedCost: analysis.estimatedCost * 0.2, // Haiku 成本約為 Sonnet 的 20%
      reasoning: `Fallback to ${fallbackAgent} due to: ${reason}`,
    };
  }

  /**
   * 獲取 CPU 使用率 (簡化實作)
   */
  private getCPUUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - Math.floor((idle / total) * 100);

    return usage;
  }

  /**
   * 批次路由多個任務
   */
  async routeBatch(analyses: TaskAnalysis[]): Promise<RoutingDecision[]> {
    return Promise.all(analyses.map(analysis => this.route(analysis)));
  }

  /**
   * 檢查是否應該使用平行執行
   */
  async shouldUseParallel(decisions: RoutingDecision[]): Promise<boolean> {
    // 如果所有任務都是簡單任務，可以平行執行
    const allSimple = decisions.every(
      decision => decision.selectedAgent === 'claude-haiku'
    );

    if (allSimple) {
      return true;
    }

    // 如果總成本不高，且系統資源充足，可以平行執行
    const totalCost = decisions.reduce((sum, d) => sum + d.estimatedCost, 0);
    const systemResources = await this.getSystemResources();

    // 檢查記憶體和成本
    const hasEnoughMemory = systemResources.memoryUsagePercent < 80;
    const costReasonable = totalCost < 0.1; // 總成本低於 $0.1

    return hasEnoughMemory && costReasonable;
  }
}
