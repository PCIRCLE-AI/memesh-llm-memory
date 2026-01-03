import { AgentTeam } from '../collaboration/types.js';
import { TeamCoordinator } from '../collaboration/TeamCoordinator.js';
export interface OrchestrationTeamConfig {
    teamCoordinator: TeamCoordinator;
    name?: string;
    description?: string;
}
export declare function createOrchestrationTeam(config: OrchestrationTeamConfig): AgentTeam;
export declare const ORCHESTRATION_TEAM_USE_CASES: {
    architecture_analysis: {
        description: string;
        requiredCapabilities: string[];
        estimatedCost: number;
        estimatedTimeMs: number;
    };
    improvement_suggestions: {
        description: string;
        requiredCapabilities: string[];
        estimatedCost: number;
        estimatedTimeMs: number;
    };
    architecture_review: {
        description: string;
        requiredCapabilities: string[];
        estimatedCost: number;
        estimatedTimeMs: number;
    };
    optimization_planning: {
        description: string;
        requiredCapabilities: string[];
        estimatedCost: number;
        estimatedTimeMs: number;
    };
};
//# sourceMappingURL=OrchestrationTeam.d.ts.map