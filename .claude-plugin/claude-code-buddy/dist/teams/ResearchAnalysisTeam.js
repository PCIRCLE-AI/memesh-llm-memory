import { ResearchAgent } from '../agents/research/ResearchAgent.js';
import { logger } from '../utils/logger.js';
export function createResearchAnalysisTeam(config) {
    const { teamCoordinator } = config;
    const researchAgent = new ResearchAgent({
        name: 'Research Analyst',
    });
    teamCoordinator.registerAgent(researchAgent);
    const team = teamCoordinator.createTeam({
        name: config.name || 'Research & Analysis Team',
        description: config.description ||
            '專注於技術調研、數據分析、市場洞察的專業團隊',
        leader: researchAgent.id,
        members: [researchAgent.id],
        capabilities: [
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
//# sourceMappingURL=ResearchAnalysisTeam.js.map