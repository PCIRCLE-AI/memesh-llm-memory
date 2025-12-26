/**
 * Quality Assurance Team - 品質保證團隊
 *
 * 職責：
 * - 代碼品質檢查
 * - 安全漏洞掃描
 * - 性能測試與分析
 * - E2E 測試設計
 * - 品質指標追蹤
 *
 * Team Members:
 * - Code Review Agent (leader) - 品質檢查專家
 * - Security Auditor - 安全審計專家
 * - Performance Tester - 性能測試專家
 */

import { AgentTeam } from '../collaboration/types.js';
import { TeamCoordinator } from '../collaboration/TeamCoordinator.js';
import { CodeReviewAgent } from '../agents/code/CodeReviewAgent.js';
import { logger } from '../utils/logger.js';

export interface QualityAssuranceTeamConfig {
  teamCoordinator: TeamCoordinator;
  name?: string;
  description?: string;
}

/**
 * 創建並註冊品質保證團隊
 */
export function createQualityAssuranceTeam(
  config: QualityAssuranceTeamConfig
): AgentTeam {
  const { teamCoordinator } = config;

  // 創建 Code Review Agent（團隊 leader，專注品質保證）
  const qaAgent = new CodeReviewAgent({
    name: 'QA Expert',
  });

  // 註冊 agents
  teamCoordinator.registerAgent(qaAgent);

  // 創建 team
  const team = teamCoordinator.createTeam({
    name: config.name || 'Quality Assurance Team',
    description:
      config.description ||
      '專注於代碼品質、安全審計、性能測試的專業團隊',
    leader: qaAgent.id,
    members: [qaAgent.id],
    capabilities: [
      // Only use capabilities actually provided by CodeReviewAgent
      'code-review',
      'security-audit',
      'performance-analysis',
    ],
    metadata: {
      domain: 'quality-assurance',
      expertise: [
        'Code Quality',
        'Security Testing',
        'Performance Testing',
        'E2E Testing',
        'Test Automation',
      ],
      maxConcurrency: 3,
    },
  });

  logger.info('Quality Assurance Team created', {
    teamId: team.id,
    teamName: team.name,
    members: team.members.length,
    capabilities: team.capabilities.length,
  });

  return team;
}

/**
 * Quality Assurance Team 的推薦使用場景
 */
export const QA_TEAM_USE_CASES = {
  comprehensive_qa: {
    description: '全面品質檢查',
    requiredCapabilities: ['code-review', 'security-audit', 'performance-analysis'],
    estimatedCost: 0.14,
    estimatedTimeMs: 20000,
  },
  security_audit: {
    description: '安全審計',
    requiredCapabilities: ['security-audit', 'code-review'],
    estimatedCost: 0.10,
    estimatedTimeMs: 15000,
  },
  performance_testing: {
    description: '性能分析',
    requiredCapabilities: ['performance-analysis', 'code-review'],
    estimatedCost: 0.11,
    estimatedTimeMs: 16000,
  },
  pre_release_check: {
    description: '發布前檢查',
    requiredCapabilities: ['code-review', 'security-audit'],
    estimatedCost: 0.15,
    estimatedTimeMs: 22000,
  },
};
