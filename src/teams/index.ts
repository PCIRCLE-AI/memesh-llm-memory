/**
 * Specialized Agent Teams for Smart Agents V2
 *
 * 5 專業團隊：
 * 1. System Architecture Team (Month 1 ✅)
 * 2. Code Development Team - 代碼開發
 * 3. Research & Analysis Team - 研究分析
 * 4. Quality Assurance Team - 品質保證
 * 5. Orchestration & Optimization Team - 編排優化
 *
 * 使用方式：
 * ```typescript
 * import { createCodeDevelopmentTeam } from './teams';
 * import { TeamCoordinator } from './collaboration/TeamCoordinator';
 * import { MessageBus } from './collaboration/MessageBus';
 *
 * const messageBus = new MessageBus();
 * const teamCoordinator = new TeamCoordinator(messageBus);
 *
 * // 創建團隊
 * const codingTeam = createCodeDevelopmentTeam({ teamCoordinator });
 * const researchTeam = createResearchAnalysisTeam({ teamCoordinator });
 * const qaTeam = createQualityAssuranceTeam({ teamCoordinator });
 * const orchestrationTeam = createOrchestrationTeam({ teamCoordinator });
 * ```
 */

// Import team creators for use in createAllTeams
import {
  createCodeDevelopmentTeam,
  CODE_DEV_TEAM_USE_CASES,
  type CodeDevelopmentTeamConfig,
} from './CodeDevelopmentTeam.js';

import {
  createResearchAnalysisTeam,
  RESEARCH_TEAM_USE_CASES,
  type ResearchAnalysisTeamConfig,
} from './ResearchAnalysisTeam.js';

import {
  createQualityAssuranceTeam,
  QA_TEAM_USE_CASES,
  type QualityAssuranceTeamConfig,
} from './QualityAssuranceTeam.js';

import {
  createOrchestrationTeam,
  ORCHESTRATION_TEAM_USE_CASES,
  type OrchestrationTeamConfig,
} from './OrchestrationTeam.js';

// Re-export everything
export {
  createCodeDevelopmentTeam,
  CODE_DEV_TEAM_USE_CASES,
  type CodeDevelopmentTeamConfig,
};

export {
  createResearchAnalysisTeam,
  RESEARCH_TEAM_USE_CASES,
  type ResearchAnalysisTeamConfig,
};

export {
  createQualityAssuranceTeam,
  QA_TEAM_USE_CASES,
  type QualityAssuranceTeamConfig,
};

export {
  createOrchestrationTeam,
  ORCHESTRATION_TEAM_USE_CASES,
  type OrchestrationTeamConfig,
};

/**
 * 快速創建所有團隊
 */
export async function createAllTeams(config: {
  teamCoordinator: import('../collaboration/TeamCoordinator.js').TeamCoordinator;
}) {
  const { teamCoordinator } = config;

  const teams = {
    codeDevelopment: createCodeDevelopmentTeam({ teamCoordinator }),
    researchAnalysis: createResearchAnalysisTeam({ teamCoordinator }),
    qualityAssurance: createQualityAssuranceTeam({ teamCoordinator }),
    orchestration: createOrchestrationTeam({ teamCoordinator }),
  };

  return teams;
}

/**
 * 團隊選擇建議
 */
export const TEAM_SELECTION_GUIDE = {
  'feature-development': {
    primaryTeam: 'codeDevelopment',
    supportTeams: ['qualityAssurance'],
    description: '新功能開發：由代碼團隊主導，品質團隊支援',
  },
  'technical-research': {
    primaryTeam: 'researchAnalysis',
    supportTeams: [],
    description: '技術調研：由研究團隊主導',
  },
  'performance-optimization': {
    primaryTeam: 'orchestration',
    supportTeams: ['codeDevelopment', 'qualityAssurance'],
    description: '性能優化：由編排團隊主導，代碼與品質團隊支援',
  },
  'security-audit': {
    primaryTeam: 'qualityAssurance',
    supportTeams: ['codeDevelopment'],
    description: '安全審計：由品質團隊主導，代碼團隊支援修復',
  },
  'cost-optimization': {
    primaryTeam: 'orchestration',
    supportTeams: [],
    description: '成本優化：由編排團隊主導',
  },
  'code-refactoring': {
    primaryTeam: 'codeDevelopment',
    supportTeams: ['qualityAssurance'],
    description: '代碼重構：由代碼團隊主導，品質團隊驗證',
  },
  'competitive-analysis': {
    primaryTeam: 'researchAnalysis',
    supportTeams: [],
    description: '競品分析：由研究團隊主導',
  },
  'pre-release-validation': {
    primaryTeam: 'qualityAssurance',
    supportTeams: ['codeDevelopment', 'orchestration'],
    description: '發布前驗證：由品質團隊主導，代碼與編排團隊支援',
  },
} as const;
