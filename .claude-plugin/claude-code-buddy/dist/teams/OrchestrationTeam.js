import { ArchitectureAgent } from '../agents/architecture/ArchitectureAgent.js';
import { logger } from '../utils/logger.js';
export function createOrchestrationTeam(config) {
    const { teamCoordinator } = config;
    const architectureAgent = new ArchitectureAgent({
        name: 'System Architect',
    });
    teamCoordinator.registerAgent(architectureAgent);
    const team = teamCoordinator.createTeam({
        name: config.name || 'Orchestration & Optimization Team',
        description: config.description ||
            '專注於系統編排、成本優化、性能監控的專業團隊',
        leader: architectureAgent.id,
        members: [architectureAgent.id],
        capabilities: [
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
//# sourceMappingURL=OrchestrationTeam.js.map