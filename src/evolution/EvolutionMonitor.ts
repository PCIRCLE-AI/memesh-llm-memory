/**
 * Evolution Monitor - Dashboard and Metrics
 *
 * Provides queryable metrics for monitoring agent evolution
 */

import type { PerformanceTracker } from './PerformanceTracker.js';
import type { LearningManager } from './LearningManager.js';
import type { AdaptationEngine } from './AdaptationEngine.js';
import type { EvolutionStats } from './types.js';
import { getAllAgentConfigs } from './AgentEvolutionConfig.js';

export interface DashboardSummary {
  totalAgents: number;
  agentsWithPatterns: number;
  totalPatterns: number;
  totalExecutions: number;
  averageSuccessRate: number;
  topImprovingAgents: Array<{
    agentId: string;
    improvement: number;
  }>;
}

export interface AgentLearningProgress {
  agentId: string;
  totalExecutions: number;
  learnedPatterns: number;
  appliedAdaptations: number;
  successRateImprovement: number;
  lastLearningDate: Date | null;
}

export class EvolutionMonitor {
  private performanceTracker: PerformanceTracker;
  private learningManager: LearningManager;
  private adaptationEngine: AdaptationEngine;

  constructor(
    performanceTracker: PerformanceTracker,
    learningManager: LearningManager,
    adaptationEngine: AdaptationEngine
  ) {
    this.performanceTracker = performanceTracker;
    this.learningManager = learningManager;
    this.adaptationEngine = adaptationEngine;
  }

  /**
   * Get dashboard summary
   */
  getDashboardSummary(): DashboardSummary {
    const allConfigs = getAllAgentConfigs();
    const allAgents = Array.from(allConfigs.keys());

    let totalPatterns = 0;
    let totalExecutions = 0;
    let agentsWithPatterns = 0;
    const successRates: number[] = [];
    const improvements: Array<{ agentId: string; improvement: number }> = [];

    allAgents.forEach(agentId => {
      const stats = this.performanceTracker.getEvolutionStats(agentId);
      const patterns = this.learningManager.getPatterns(agentId);

      totalExecutions += stats.totalExecutions;
      totalPatterns += patterns.length;

      if (patterns.length > 0) {
        agentsWithPatterns++;
      }

      if (stats.totalExecutions > 0) {
        successRates.push(stats.successRateTrend.recent);
        improvements.push({
          agentId,
          improvement: stats.successRateTrend.improvement,
        });
      }
    });

    // Sort by improvement
    improvements.sort((a, b) => b.improvement - a.improvement);

    return {
      totalAgents: allAgents.length,
      agentsWithPatterns,
      totalPatterns,
      totalExecutions,
      averageSuccessRate:
        successRates.length > 0
          ? successRates.reduce((a, b) => a + b, 0) / successRates.length
          : 0,
      topImprovingAgents: improvements.slice(0, 5),
    };
  }

  /**
   * Get evolution stats for specific agent
   */
  getAgentStats(agentId: string): EvolutionStats {
    return this.performanceTracker.getEvolutionStats(agentId);
  }

  /**
   * Get learning progress for all agents
   */
  getLearningProgress(): AgentLearningProgress[] {
    const allConfigs = getAllAgentConfigs();
    const allAgents = Array.from(allConfigs.keys());

    return allAgents.map(agentId => {
      const stats = this.performanceTracker.getEvolutionStats(agentId);
      const patterns = this.learningManager.getPatterns(agentId);

      return {
        agentId,
        totalExecutions: stats.totalExecutions,
        learnedPatterns: patterns.length,
        appliedAdaptations: stats.appliedAdaptations,
        successRateImprovement: stats.successRateTrend.improvement,
        lastLearningDate: stats.totalExecutions > 0 ? stats.lastLearningDate : null,
      };
    });
  }

  /**
   * Format dashboard for terminal display
   */
  formatDashboard(): string {
    const summary = this.getDashboardSummary();
    const progress = this.getLearningProgress();

    const lines: string[] = [];

    lines.push('╔═══════════════════════════════════════════════════════════╗');
    lines.push('║          🧠 Claude Code Buddy Evolution Dashboard         ║');
    lines.push('╚═══════════════════════════════════════════════════════════╝');
    lines.push('');

    // Summary
    lines.push('📊 Overview:');
    lines.push(`   Total Agents: ${summary.totalAgents}`);
    lines.push(`   Agents with Learned Patterns: ${summary.agentsWithPatterns}`);
    lines.push(`   Total Patterns: ${summary.totalPatterns}`);
    lines.push(`   Total Executions: ${summary.totalExecutions}`);
    lines.push(`   Average Success Rate: ${(summary.averageSuccessRate * 100).toFixed(1)}%`);
    lines.push('');

    // Top improving agents
    if (summary.topImprovingAgents.length > 0) {
      lines.push('🚀 Top Improving Agents:');
      summary.topImprovingAgents.forEach((agent, idx) => {
        const improvement =
          agent.improvement >= 0
            ? `+${(agent.improvement * 100).toFixed(1)}%`
            : `${(agent.improvement * 100).toFixed(1)}%`;
        lines.push(`   ${idx + 1}. ${agent.agentId}: ${improvement}`);
      });
      lines.push('');
    }

    // Learning progress (agents with patterns)
    const activeAgents = progress.filter(p => p.learnedPatterns > 0);
    if (activeAgents.length > 0) {
      lines.push('📚 Learning Progress:');
      activeAgents.slice(0, 10).forEach(agent => {
        lines.push(`   • ${agent.agentId}:`);
        lines.push(`     Executions: ${agent.totalExecutions}`);
        lines.push(`     Patterns: ${agent.learnedPatterns}`);
        lines.push(`     Adaptations: ${agent.appliedAdaptations}`);
        lines.push(
          `     Improvement: ${agent.successRateImprovement >= 0 ? '+' : ''}${(agent.successRateImprovement * 100).toFixed(1)}%`
        );
      });
      lines.push('');
    }

    lines.push('╚═══════════════════════════════════════════════════════════╝');

    return lines.join('\n');
  }
}
