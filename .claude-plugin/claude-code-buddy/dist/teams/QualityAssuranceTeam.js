import { CodeReviewAgent } from '../agents/code/CodeReviewAgent.js';
import { logger } from '../utils/logger.js';
export function createQualityAssuranceTeam(config) {
    const { teamCoordinator } = config;
    const qaAgent = new CodeReviewAgent({
        name: 'QA Expert',
    });
    teamCoordinator.registerAgent(qaAgent);
    const team = teamCoordinator.createTeam({
        name: config.name || 'Quality Assurance Team',
        description: config.description ||
            '專注於代碼品質、安全審計、性能測試的專業團隊',
        leader: qaAgent.id,
        members: [qaAgent.id],
        capabilities: [
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
//# sourceMappingURL=QualityAssuranceTeam.js.map