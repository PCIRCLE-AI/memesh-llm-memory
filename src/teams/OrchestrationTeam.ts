/**
 * Orchestration & Optimization Team - 編排與優化團隊
 *
 * 職責：
 * - AI provider 智能路由
 * - 成本優化與追蹤
 * - 配額管理
 * - 性能監控與優化
 * - 系統架構優化
 *
 * Team Members:
 * - Architecture Agent (leader) - 系統架構專家
 * - Cost Optimizer - 成本優化專家
 * - Performance Monitor - 性能監控專家
 */

import { AgentTeam } from '../collaboration/types.js';
import { TeamCoordinator } from '../collaboration/TeamCoordinator.js';
import { ArchitectureAgent } from '../agents/architecture/ArchitectureAgent.js';
import { logger } from '../utils/logger.js';

export interface OrchestrationTeamConfig {
  teamCoordinator: TeamCoordinator;
  name?: string;
  description?: string;
}

/**
 * 創建並註冊編排與優化團隊
 */
export function createOrchestrationTeam(
  config: OrchestrationTeamConfig
): AgentTeam {
  const { teamCoordinator } = config;

  // 創建 Architecture Agent（團隊 leader）
  const architectureAgent = new ArchitectureAgent({
    name: 'System Architect',
  });

  // 註冊 agents
  teamCoordinator.registerAgent(architectureAgent);

  // 創建 team
  const team = teamCoordinator.createTeam({
    name: config.name || 'Orchestration & Optimization Team',
    description:
      config.description ||
      '專注於系統編排、成本優化、性能監控的專業團隊',
    leader: architectureAgent.id,
    members: [architectureAgent.id],
    capabilities: [
      // Only use capabilities actually provided by ArchitectureAgent
      'analyze_architecture',
      'suggest_improvements',
    ],
    metadata: {
      domain: 'orchestration-optimization',
      expertise: [
        'System Architecture',
        'Cost Optimization',
        'Performance Monitoring',
        'AI Provider Routing',
        'Quota Management',
      ],
      maxConcurrency: 2,
    },
  });

  logger.info('Orchestration & Optimization Team created', {
    teamId: team.id,
    teamName: team.name,
    members: team.members.length,
    capabilities: team.capabilities.length,
  });

  return team;
}

/**
 * Orchestration & Optimization Team 的推薦使用場景
 */
export const ORCHESTRATION_TEAM_USE_CASES = {
  architecture_analysis: {
    description: '系統架構分析',
    requiredCapabilities: ['analyze_architecture'],
    estimatedCost: 0.09,
    estimatedTimeMs: 13000,
  },
  improvement_suggestions: {
    description: '架構改進建議',
    requiredCapabilities: ['suggest_improvements', 'analyze_architecture'],
    estimatedCost: 0.08,
    estimatedTimeMs: 12000,
  },
  architecture_review: {
    description: '系統架構審查',
    requiredCapabilities: ['analyze_architecture', 'suggest_improvements'],
    estimatedCost: 0.10,
    estimatedTimeMs: 14000,
  },
  optimization_planning: {
    description: '優化方案規劃',
    requiredCapabilities: ['suggest_improvements'],
    estimatedCost: 0.07,
    estimatedTimeMs: 10000,
  },
};
