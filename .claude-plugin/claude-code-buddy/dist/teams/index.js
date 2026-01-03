import { createCodeDevelopmentTeam, CODE_DEV_TEAM_USE_CASES, } from './CodeDevelopmentTeam.js';
import { createResearchAnalysisTeam, RESEARCH_TEAM_USE_CASES, } from './ResearchAnalysisTeam.js';
import { createQualityAssuranceTeam, QA_TEAM_USE_CASES, } from './QualityAssuranceTeam.js';
import { createOrchestrationTeam, ORCHESTRATION_TEAM_USE_CASES, } from './OrchestrationTeam.js';
export { createCodeDevelopmentTeam, CODE_DEV_TEAM_USE_CASES, };
export { createResearchAnalysisTeam, RESEARCH_TEAM_USE_CASES, };
export { createQualityAssuranceTeam, QA_TEAM_USE_CASES, };
export { createOrchestrationTeam, ORCHESTRATION_TEAM_USE_CASES, };
export async function createAllTeams(config) {
    const { teamCoordinator } = config;
    const teams = {
        codeDevelopment: createCodeDevelopmentTeam({ teamCoordinator }),
        researchAnalysis: createResearchAnalysisTeam({ teamCoordinator }),
        qualityAssurance: createQualityAssuranceTeam({ teamCoordinator }),
        orchestration: createOrchestrationTeam({ teamCoordinator }),
    };
    return teams;
}
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
};
//# sourceMappingURL=index.js.map