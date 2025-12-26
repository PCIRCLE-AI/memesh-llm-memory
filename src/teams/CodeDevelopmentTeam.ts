/**
 * Code Development Team - 代碼開發團隊
 *
 * 職責：
 * - 功能開發與實作
 * - 代碼審查與優化
 * - 重構與性能優化
 * - 技術債務管理
 *
 * Team Members:
 * - Code Review Agent (leader) - 代碼審查專家
 * - Implementation Specialist - 功能實作專家
 * - Performance Optimizer - 性能優化專家
 */

import { AgentTeam } from '../collaboration/types.js';
import { TeamCoordinator } from '../collaboration/TeamCoordinator.js';
import { CodeReviewAgent } from '../agents/code/CodeReviewAgent.js';
import { logger } from '../utils/logger.js';

export interface CodeDevelopmentTeamConfig {
  teamCoordinator: TeamCoordinator;
  name?: string;
  description?: string;
}

/**
 * 創建並註冊代碼開發團隊
 */
export function createCodeDevelopmentTeam(
  config: CodeDevelopmentTeamConfig
): AgentTeam {
  const { teamCoordinator } = config;

  // 創建 Code Review Agent（團隊 leader）
  const codeReviewAgent = new CodeReviewAgent({
    name: 'Code Review Expert',
  });

  // 註冊 agents
  teamCoordinator.registerAgent(codeReviewAgent);

  // 創建 team
  const team = teamCoordinator.createTeam({
    name: config.name || 'Code Development Team',
    description:
      config.description ||
      '專注於代碼開發、審查、重構與性能優化的專業團隊',
    leader: codeReviewAgent.id,
    members: [codeReviewAgent.id],
    capabilities: [
      // Only use capabilities actually provided by CodeReviewAgent
      'code-review',
      'security-audit',
      'performance-analysis',
    ],
    metadata: {
      domain: 'software-development',
      expertise: [
        'TypeScript',
        'Node.js',
        'Code Quality',
        'Security',
        'Performance Optimization',
      ],
      maxConcurrency: 3,
    },
  });

  logger.info('Code Development Team created', {
    teamId: team.id,
    teamName: team.name,
    members: team.members.length,
    capabilities: team.capabilities.length,
  });

  return team;
}

/**
 * Code Development Team 的推薦使用場景
 */
export const CODE_DEV_TEAM_USE_CASES = {
  code_review: {
    description: '代碼審查',
    requiredCapabilities: ['code-review'],
    estimatedCost: 0.10,
    estimatedTimeMs: 15000,
  },
  security_audit: {
    description: '安全審計',
    requiredCapabilities: ['security-audit', 'code-review'],
    estimatedCost: 0.12,
    estimatedTimeMs: 18000,
  },
  performance_optimization: {
    description: '性能優化分析',
    requiredCapabilities: ['performance-analysis', 'code-review'],
    estimatedCost: 0.15,
    estimatedTimeMs: 20000,
  },
  comprehensive_review: {
    description: '全面審查（安全+性能+品質）',
    requiredCapabilities: ['security-audit', 'performance-analysis', 'code-review'],
    estimatedCost: 0.13,
    estimatedTimeMs: 16000,
  },
};
