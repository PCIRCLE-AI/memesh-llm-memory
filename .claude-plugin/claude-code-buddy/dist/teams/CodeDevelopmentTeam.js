import { CodeReviewAgent } from '../agents/code/CodeReviewAgent.js';
import { logger } from '../utils/logger.js';
export function createCodeDevelopmentTeam(config) {
    const { teamCoordinator } = config;
    const codeReviewAgent = new CodeReviewAgent({
        name: 'Code Review Expert',
    });
    teamCoordinator.registerAgent(codeReviewAgent);
    const team = teamCoordinator.createTeam({
        name: config.name || 'Code Development Team',
        description: config.description ||
            '專注於代碼開發、審查、重構與性能優化的專業團隊',
        leader: codeReviewAgent.id,
        members: [codeReviewAgent.id],
        capabilities: [
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
//# sourceMappingURL=CodeDevelopmentTeam.js.map