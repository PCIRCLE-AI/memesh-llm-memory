import { AgentTeam } from '../collaboration/types.js';
import { TeamCoordinator } from '../collaboration/TeamCoordinator.js';
export interface CodeDevelopmentTeamConfig {
    teamCoordinator: TeamCoordinator;
    name?: string;
    description?: string;
}
export declare function createCodeDevelopmentTeam(config: CodeDevelopmentTeamConfig): AgentTeam;
export declare const CODE_DEV_TEAM_USE_CASES: {
    code_review: {
        description: string;
        requiredCapabilities: string[];
        estimatedCost: number;
        estimatedTimeMs: number;
    };
    security_audit: {
        description: string;
        requiredCapabilities: string[];
        estimatedCost: number;
        estimatedTimeMs: number;
    };
    performance_optimization: {
        description: string;
        requiredCapabilities: string[];
        estimatedCost: number;
        estimatedTimeMs: number;
    };
    comprehensive_review: {
        description: string;
        requiredCapabilities: string[];
        estimatedCost: number;
        estimatedTimeMs: number;
    };
};
//# sourceMappingURL=CodeDevelopmentTeam.d.ts.map