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
import { toDollars, type MicroDollars } from '../utils/money.js';
import { logger } from '../utils/logger.js';

export class AgentRouter {
  private promptEnhancer: PromptEnhancer;

  constructor() {
    this.promptEnhancer = new PromptEnhancer();
  }

  /**
   * Route task to optimal Agent
   */
  async route(analysis: TaskAnalysis): Promise<RoutingDecision> {
    const systemResources = await this.getSystemResources();

    // Check if memory is sufficient
    if (!this.hasEnoughMemory(systemResources, analysis)) {
      return this.createFallbackDecision(analysis, 'Insufficient memory');
    }

    // Select specialized Agent based on task capability requirements
    const selectedAgent = this.selectAgent(analysis);
    const fallbackAgent = this.getFallbackAgent(selectedAgent);

    // Create Task object for Prompt Enhancement
    const task: Task = {
      id: analysis.taskId,
      description: `Task requiring ${analysis.requiredCapabilities.join(', ')} capabilities`,
      requiredCapabilities: analysis.requiredCapabilities.length > 0
        ? analysis.requiredCapabilities
        : this.getCapabilitiesForAgent(selectedAgent),
      metadata: {
        complexity: analysis.complexity,
        estimatedTokens: analysis.estimatedTokens,
      },
    };

    // Use PromptEnhancer to generate enhanced prompt
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
   * Get system resource status
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
   * Check if memory is sufficient
   *
   * Note: On macOS, os.freemem() returns very low values because macOS
   * aggressively caches files. The "free" memory is misleading - macOS
   * will reclaim cached memory when needed. For MCP Server pattern
   * (prompt enhancement only, no local models), we use minimal thresholds.
   */
  private hasEnoughMemory(resources: SystemResources, analysis: TaskAnalysis): boolean {
    const requiredMemoryMB = this.estimateRequiredMemory(analysis);
    const platform = process.platform;

    // On macOS, os.freemem() is misleading due to aggressive file caching
    // Use total memory check instead - if system has >= 4GB, we're fine
    if (platform === 'darwin') {
      if (resources.totalMemoryMB >= 4096) {
        return true; // macOS with 4GB+ can handle MCP routing tasks
      }
    }

    // For other platforms or low-memory macs, use the original check
    // but with much lower thresholds since MCP Server only does prompt enhancement
    if (resources.availableMemoryMB < requiredMemoryMB) {
      logger.warn(
        `⚠️  Insufficient memory: Available ${resources.availableMemoryMB}MB, ` +
        `Required ${requiredMemoryMB}MB`
      );
      return false;
    }

    return true;
  }

  /**
   * Estimate required memory for task (MB)
   *
   * MCP Server Pattern: We only do prompt enhancement and routing,
   * not running local models. Memory requirements are minimal.
   */
  private estimateRequiredMemory(analysis: TaskAnalysis): number {
    // Much lower thresholds for MCP Server pattern (prompt enhancement only)
    const baseMemory = {
      simple: 50,
      medium: 100,
      complex: 200,
    };

    return baseMemory[analysis.complexity];
  }

  /**
   * Select optimal Agent (based on capability requirements)
   */
  private selectAgent(analysis: TaskAnalysis): AgentType {
    // Select specialized Agent based on requiredCapabilities
    const requiredCapabilities = analysis.requiredCapabilities;

    // Capability to Agent mapping
    const capabilityToAgent: Record<string, AgentType> = {
      'code-review': 'code-reviewer',
      'code-generation': 'general-agent',
      'testing': 'test-writer',
      'debugging': 'debugger',
      'refactoring': 'refactorer',
      'api-design': 'api-designer',
      'research': 'research-agent',
      'architecture': 'architecture-agent',
      'data-analysis': 'data-analyst',
      'knowledge-query': 'knowledge-agent',
      'documentation': 'technical-writer',
    };

    // Try to map from requiredCapabilities to AgentType
    for (const required of requiredCapabilities) {
      const mappedAgent = capabilityToAgent[required];
      if (mappedAgent) {
        return mappedAgent;
      }
    }

    // If mapping fails, fallback to general-agent
    return 'general-agent';
  }

  /**
   * Get capability list for Agent
   */
  private getCapabilitiesForAgent(agent: AgentType): TaskCapability[] {
    const agentCapabilities: Record<AgentType, TaskCapability[]> = {
      'code-reviewer': ['code-review'],
      'test-writer': ['testing'], // Code generation is implicit in testing
      'test-automator': ['testing'],
      'e2e-healing-agent': ['e2e-testing', 'auto-healing', 'testing'],
      'debugger': ['debugging'],
      'refactorer': ['refactoring'], // Code generation is implicit in refactoring
      'api-designer': ['api-design'], // Code generation is implicit in API design
      'research-agent': ['research'],
      'architecture-agent': ['architecture'],
      'data-analyst': ['data-analysis'],
      'knowledge-agent': ['knowledge-query'],
      'db-optimizer': ['general'],
      'frontend-specialist': ['general'],
      'frontend-developer': ['general'],
      'backend-specialist': ['general'],
      'backend-developer': ['general'],
      'database-administrator': ['general'],
      'development-butler': ['general'],
      'performance-profiler': ['general'],
      'performance-engineer': ['general'],
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
   * Get fallback Agent
   */
  private getFallbackAgent(primaryAgent: AgentType): AgentType | undefined {
    // Define Agent degradation strategy
    const fallbackMap: Record<AgentType, AgentType | undefined> = {
      // Development Agent fallbacks
      'code-reviewer': 'general-agent',
      'test-writer': 'general-agent',
      'test-automator': 'test-writer',
      'e2e-healing-agent': 'test-automator',
      'debugger': 'general-agent',
      'refactorer': 'general-agent',
      'api-designer': 'general-agent',

      // Analysis Agent fallbacks
      'research-agent': 'general-agent',
      'architecture-agent': 'general-agent',
      'data-analyst': 'general-agent',

      // Knowledge Agent fallbacks
      'knowledge-agent': 'research-agent',

      'db-optimizer': 'general-agent',
      'development-butler': 'general-agent',
      'frontend-specialist': 'general-agent',
      'frontend-developer': 'frontend-specialist',
      'backend-specialist': 'general-agent',
      'backend-developer': 'backend-specialist',
      'database-administrator': 'db-optimizer',
      'performance-profiler': 'general-agent',
      'performance-engineer': 'performance-profiler',
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

      // general-agent has no fallback
      'general-agent': undefined,
    };

    return fallbackMap[primaryAgent];
  }

  /**
   * Generate routing reasoning explanation
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

    // Agent specialization descriptions
    const agentDescriptions: Record<AgentType, string> = {
      'code-reviewer': 'Specialized in code quality analysis and security review',
      'test-writer': 'Expert in test automation and TDD',
      'test-automator': 'Automated test execution, CI/CD integration, test coverage analysis',
      'e2e-healing-agent': 'E2E test automation with self-healing capabilities, Playwright-powered browser testing, automatic failure analysis and code fixing',
      'debugger': 'Specialized in root cause analysis and debugging',
      'refactorer': 'Expert in code refactoring and design patterns',
      'api-designer': 'Specialized in API design and RESTful principles',
      'research-agent': 'Specialized in research and information gathering',
      'architecture-agent': 'Expert in system architecture and design',
      'data-analyst': 'Specialized in data analysis and visualization',
      'knowledge-agent': 'Expert in knowledge management and organization',
      'db-optimizer': 'Database optimization, query tuning, index design specialist',
      'development-butler': 'Event-driven workflow automation, automates everything except coding/planning/reviewing',
      'frontend-specialist': 'Frontend development, React, Vue, modern web frameworks expert',
      'frontend-developer': 'Full-stack frontend development, component libraries, state management',
      'backend-specialist': 'Backend development, API design, server architecture expert',
      'backend-developer': 'Full-stack backend development, microservices, databases, caching',
      'database-administrator': 'Database administration, schema design, performance tuning, backup and recovery',
      'performance-profiler': 'Performance profiling, optimization, bottleneck identification',
      'performance-engineer': 'End-to-end performance engineering, scalability, load testing',
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
   * Create fallback decision (when resources are insufficient)
   */
  private createFallbackDecision(
    analysis: TaskAnalysis,
    reason: string
  ): RoutingDecision {
    // Downgrade to general Agent
    const fallbackAgent: AgentType = 'general-agent';

    // Create simplified Task object
    const task: Task = {
      id: analysis.taskId,
      description: `Fallback task due to: ${reason}`,
      requiredCapabilities: ['general'],
      metadata: {
        complexity: 'simple',
        isFallback: true,
      },
    };

    // Use PromptEnhancer to generate enhanced prompt (using simple complexity)
    const enhancedPrompt = this.promptEnhancer.enhance(
      fallbackAgent,
      task,
      'simple'
    );

    return {
      taskId: analysis.taskId,
      selectedAgent: fallbackAgent,
      enhancedPrompt,
      // general-agent reduced cost estimate (80% discount)
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
   * Get CPU usage
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
   * Route multiple tasks in batch
   *
   * ✅ FIX MAJOR-2: Limit concurrency to prevent resource exhaustion
   */
  async routeBatch(analyses: TaskAnalysis[]): Promise<RoutingDecision[]> {
    const CONCURRENCY_LIMIT = 10; // Maximum 10 concurrent routing decisions
    const results: RoutingDecision[] = [];

    // Process in batches of CONCURRENCY_LIMIT
    for (let i = 0; i < analyses.length; i += CONCURRENCY_LIMIT) {
      const batch = analyses.slice(i, i + CONCURRENCY_LIMIT);
      const batchResults = await Promise.all(batch.map(analysis => this.route(analysis)));
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Check if parallel execution should be used
   */
  async shouldUseParallel(decisions: RoutingDecision[]): Promise<boolean> {
    // If all tasks are simple (general-agent), can execute in parallel
    const allSimple = decisions.every(
      decision => decision.selectedAgent === 'general-agent'
    );

    if (allSimple) {
      return true;
    }

    // If total cost is low and system resources are sufficient, can execute in parallel
    const totalCost = decisions.reduce(
      (sum, d) => (sum + d.estimatedCost) as MicroDollars,
      0 as MicroDollars
    );
    const systemResources = await this.getSystemResources();

    // Check memory and cost
    const hasEnoughMemory = systemResources.memoryUsagePercent < 80;
    const costReasonable = toDollars(totalCost) < 0.1; // Total cost below $0.1

    return hasEnoughMemory && costReasonable;
  }
}
