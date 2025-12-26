/**
 * Research & Analysis Team - 研究分析團隊
 *
 * 職責：
 * - 技術調研與評估
 * - 競品分析
 * - 最佳實踐研究
 * - 數據分析與洞察
 * - 市場趨勢分析
 *
 * Team Members:
 * - Research Agent (leader) - 研究分析專家
 * - Data Analyst - 數據分析專家
 * - Trend Analyst - 趨勢分析專家
 */

import { AgentTeam } from '../collaboration/types.js';
import { TeamCoordinator } from '../collaboration/TeamCoordinator.js';
import { ResearchAgent } from '../agents/research/ResearchAgent.js';
import { logger } from '../utils/logger.js';

export interface ResearchAnalysisTeamConfig {
  teamCoordinator: TeamCoordinator;
  name?: string;
  description?: string;
}

/**
 * 創建並註冊研究分析團隊
 */
export function createResearchAnalysisTeam(
  config: ResearchAnalysisTeamConfig
): AgentTeam {
  const { teamCoordinator } = config;

  // 創建 Research Agent（團隊 leader）
  const researchAgent = new ResearchAgent({
    name: 'Research Analyst',
  });

  // 註冊 agents
  teamCoordinator.registerAgent(researchAgent);

  // 創建 team
  const team = teamCoordinator.createTeam({
    name: config.name || 'Research & Analysis Team',
    description:
      config.description ||
      '專注於技術調研、數據分析、市場洞察的專業團隊',
    leader: researchAgent.id,
    members: [researchAgent.id],
    capabilities: [
      // Only use capabilities actually provided by ResearchAgent
      'technical-research',
      'competitive-analysis',
      'best-practices',
    ],
    metadata: {
      domain: 'research-analysis',
      expertise: [
        'Technology Research',
        'Market Analysis',
        'Data Science',
        'Competitive Intelligence',
        'Best Practices',
      ],
      maxConcurrency: 2,
    },
  });

  logger.info('Research & Analysis Team created', {
    teamId: team.id,
    teamName: team.name,
    members: team.members.length,
    capabilities: team.capabilities.length,
  });

  return team;
}

/**
 * Research & Analysis Team 的推薦使用場景
 */
export const RESEARCH_TEAM_USE_CASES = {
  technology_evaluation: {
    description: '技術選型評估',
    requiredCapabilities: ['technical-research', 'competitive-analysis'],
    estimatedCost: 0.08,
    estimatedTimeMs: 12000,
  },
  market_research: {
    description: '市場調研',
    requiredCapabilities: ['competitive-analysis', 'best-practices'],
    estimatedCost: 0.09,
    estimatedTimeMs: 15000,
  },
  best_practices_research: {
    description: '最佳實踐研究',
    requiredCapabilities: ['best-practices', 'technical-research'],
    estimatedCost: 0.07,
    estimatedTimeMs: 10000,
  },
  competitive_intelligence: {
    description: '競品分析',
    requiredCapabilities: ['competitive-analysis'],
    estimatedCost: 0.08,
    estimatedTimeMs: 11000,
  },
};
