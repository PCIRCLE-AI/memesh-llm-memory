/**
 * AgentRouter - Specialized Agent Router for MCP Server
 *
 * Features:
 * - Routes to specialized agents based on task capabilities
 * - Prompt Enhancement Mode: Returns enhanced prompts instead of API calls
 * - Capability-based routing (not model-based)
 * - Resource-aware routing (checks system resources)
 * - Fallback mechanism to general-agent
 *
 * MCP Server Pattern:
 * - No direct API calls
 * - Returns enhanced prompts to Claude Code
 * - Claude Code executes with user's API subscription
 */

import os from 'os';
import { TaskAnalysis, RoutingDecision, AgentType, SystemResources, TaskCapability, Task } from './types.js';
import { PromptEnhancer } from '../core/PromptEnhancer.js';
import { toDollars } from '../utils/money.js';

export class AgentRouter {
  private promptEnhancer: PromptEnhancer;

  constructor() {
    this.promptEnhancer = new PromptEnhancer();
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

    // 根據任務能力需求選擇專業 Agent
    const selectedAgent = this.selectAgent(analysis);
    const fallbackAgent = this.getFallbackAgent(selectedAgent);

    // 建立 Task 物件用於 Prompt Enhancement
    const task: Task = {
      id: analysis.taskId,
      description: `Task requiring ${analysis.requiredAgents.join(', ')} capabilities`,
      requiredCapabilities: this.getCapabilitiesForAgent(selectedAgent),
      metadata: {
        complexity: analysis.complexity,
        estimatedTokens: analysis.estimatedTokens,
      },
    };

    // 使用 PromptEnhancer 生成 enhanced prompt
    const enhancedPrompt = this.promptEnhancer.enhance(
      selectedAgent,
      task,
      analysis.complexity
    );

    return {
      taskId: analysis.taskId,
      selectedAgent,
      enhancedPrompt,
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
   * 選擇最佳 Agent（基於能力需求）
   */
  private selectAgent(analysis: TaskAnalysis): AgentType {
    // 根據 requiredAgents 包含的能力選擇對應的專業 Agent
    const requiredAgents = analysis.requiredAgents;

    // 能力到 Agent 的映射
    const capabilityToAgent: Record<string, AgentType> = {
      'code-review': 'code-reviewer',
      'code-generation': 'general-agent',
      'testing': 'test-writer',
      'debugging': 'debugger',
      'refactoring': 'refactorer',
      'api-design': 'api-designer',
      'rag-search': 'rag-agent',
      'research': 'research-agent',
      'architecture': 'architecture-agent',
      'data-analysis': 'data-analyst',
      'knowledge-query': 'knowledge-agent',
      'documentation': 'technical-writer',
    };

    // 嘗試從 requiredAgents 映射到 AgentType
    for (const required of requiredAgents) {
      if (capabilityToAgent[required]) {
        return capabilityToAgent[required];
      }
    }

    // 如果無法映射，fallback 到 general-agent
    return 'general-agent';
  }

  /**
   * 獲取 Agent 對應的能力清單
   */
  private getCapabilitiesForAgent(agent: AgentType): TaskCapability[] {
    const agentCapabilities: Record<AgentType, TaskCapability[]> = {
      'code-reviewer': ['code-review'],
      'test-writer': ['testing'], // Code generation is implicit in testing
      'debugger': ['debugging'],
      'refactorer': ['refactoring'], // Code generation is implicit in refactoring
      'api-designer': ['api-design'], // Code generation is implicit in API design
      'rag-agent': ['rag-search'],
      'research-agent': ['research'],
      'architecture-agent': ['architecture'],
      'data-analyst': ['data-analysis'],
      'knowledge-agent': ['knowledge-query'],
      'db-optimizer': ['general'],
      'frontend-specialist': ['general'],
      'backend-specialist': ['general'],
      'development-butler': ['general'],
      'performance-profiler': ['general'],
      'devops-engineer': ['general'],
      'security-auditor': ['general'],
      'technical-writer': ['general'],
      'ui-designer': ['general'],
      'migration-assistant': ['general'],
      'api-integrator': ['general'],
      'general-agent': ['general'],
      'project-manager': ['general'],
      'product-manager': ['general'],
      'data-engineer': ['data-analysis'],
      'ml-engineer': ['data-analysis'],
      'marketing-strategist': ['general'],
    };

    return agentCapabilities[agent] || ['general'];
  }

  /**
   * 獲取備用 Agent
   */
  private getFallbackAgent(primaryAgent: AgentType): AgentType | undefined {
    // 定義 Agent 的降級策略
    const fallbackMap: Record<AgentType, AgentType | undefined> = {
      // 開發類 Agent fallback
      'code-reviewer': 'general-agent',
      'test-writer': 'general-agent',
      'debugger': 'general-agent',
      'refactorer': 'general-agent',
      'api-designer': 'general-agent',

      // 分析類 Agent fallback
      'rag-agent': 'research-agent',
      'research-agent': 'general-agent',
      'architecture-agent': 'general-agent',
      'data-analyst': 'general-agent',

      // 知識類 Agent fallback
      'knowledge-agent': 'research-agent',

      'db-optimizer': 'general-agent',
      'development-butler': 'general-agent',
      'frontend-specialist': 'general-agent',
      'backend-specialist': 'general-agent',
      'performance-profiler': 'general-agent',
      'devops-engineer': 'general-agent',
      'security-auditor': 'general-agent',
      'technical-writer': 'general-agent',
      'ui-designer': 'general-agent',
      'migration-assistant': 'general-agent',
      'api-integrator': 'general-agent',
      'project-manager': 'general-agent',
      'product-manager': 'general-agent',
      'data-engineer': 'data-analyst',
      'ml-engineer': 'data-analyst',
      'marketing-strategist': 'general-agent',

      // general-agent 沒有 fallback
      'general-agent': undefined,
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

    reasons.push(`Selected ${selectedAgent} based on task capabilities and ${analysis.complexity} complexity`);
    reasons.push(`Available memory: ${resources.availableMemoryMB}MB`);
    reasons.push(`Memory usage: ${resources.memoryUsagePercent}%`);
    reasons.push(`Estimated cost: $${toDollars(analysis.estimatedCost).toFixed(6)}`);

    // Agent 專業說明
    const agentDescriptions: Record<AgentType, string> = {
      'code-reviewer': 'Specialized in code quality analysis and security review',
      'test-writer': 'Expert in test automation and TDD',
      'debugger': 'Specialized in root cause analysis and debugging',
      'refactorer': 'Expert in code refactoring and design patterns',
      'api-designer': 'Specialized in API design and RESTful principles',
      'rag-agent': 'Expert in knowledge retrieval and context search',
      'research-agent': 'Specialized in research and information gathering',
      'architecture-agent': 'Expert in system architecture and design',
      'data-analyst': 'Specialized in data analysis and visualization',
      'knowledge-agent': 'Expert in knowledge management and organization',
      'db-optimizer': 'Database optimization, query tuning, index design specialist',
      'development-butler': 'Event-driven workflow automation, automates everything except coding/planning/reviewing',
      'frontend-specialist': 'Frontend development, React, Vue, modern web frameworks expert',
      'backend-specialist': 'Backend development, API design, server architecture expert',
      'performance-profiler': 'Performance profiling, optimization, bottleneck identification',
      'devops-engineer': 'DevOps, CI/CD, infrastructure automation, deployment expert',
      'security-auditor': 'Security auditing, vulnerability assessment, compliance expert',
      'technical-writer': 'Technical writing, documentation, user guides, API docs expert',
      'ui-designer': 'UI/UX design, user experience, interface design specialist',
      'migration-assistant': 'Migration assistance, upgrade planning, legacy modernization',
      'api-integrator': 'API integration, third-party services, SDK implementation',
      'general-agent': 'Versatile AI assistant for general tasks',
      'project-manager': 'Project planning, task management, resource allocation, risk management',
      'product-manager': 'Product strategy, roadmap planning, user requirements, feature prioritization',
      'data-engineer': 'Data pipeline engineering, ETL/ELT, data infrastructure, data quality',
      'ml-engineer': 'Machine learning engineering, model development, ML ops, deployment',
      'marketing-strategist': 'Marketing strategy, campaign planning, growth, customer acquisition',
    };

    if (agentDescriptions[selectedAgent]) {
      reasons.push(agentDescriptions[selectedAgent]);
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
    // 降級到通用 Agent
    const fallbackAgent: AgentType = 'general-agent';

    // 建立簡化的 Task 物件
    const task: Task = {
      id: analysis.taskId,
      description: `Fallback task due to: ${reason}`,
      requiredCapabilities: ['general'],
      metadata: {
        complexity: 'simple',
        isFallback: true,
      },
    };

    // 使用 PromptEnhancer 生成 enhanced prompt（使用 simple complexity）
    const enhancedPrompt = this.promptEnhancer.enhance(
      fallbackAgent,
      task,
      'simple'
    );

    return {
      taskId: analysis.taskId,
      selectedAgent: fallbackAgent,
      enhancedPrompt,
      // general-agent 降低成本估算 (80% discount)
      estimatedCost: Math.round(analysis.estimatedCost * 0.2) as import('../utils/money.js').MicroDollars,
      reasoning: `Fallback to ${fallbackAgent} due to: ${reason}`,
    };
  }

  /**
   * CPU usage cache to avoid frequent recalculation
   */
  private cpuUsageCache: { value: number; timestamp: number } = { value: 50, timestamp: 0 };
  private readonly CPU_CACHE_TTL = 1000; // 1 second TTL

  /**
   * 獲取 CPU 使用率
   *
   * Uses Node.js built-in 'os' module to calculate actual CPU usage.
   * Results are cached for 1 second to avoid performance overhead.
   */
  private getCPUUsage(): number {
    const now = Date.now();

    // Return cached value if still fresh
    if (now - this.cpuUsageCache.timestamp < this.CPU_CACHE_TTL) {
      return this.cpuUsageCache.value;
    }

    // Calculate actual CPU usage from os.cpus()
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      // Sum all CPU times
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }

    // CPU usage = 100 - (idle percentage)
    const idlePercentage = (100 * totalIdle) / totalTick;
    const usage = Math.round(100 - idlePercentage);

    // Update cache
    this.cpuUsageCache = { value: usage, timestamp: now };

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
    // 如果所有任務都是簡單任務（general-agent），可以平行執行
    const allSimple = decisions.every(
      decision => decision.selectedAgent === 'general-agent'
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
