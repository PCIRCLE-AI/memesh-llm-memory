import { AgentTeam } from '../collaboration/types.js';
import { TeamCoordinator } from '../collaboration/TeamCoordinator.js';
export interface QualityAssuranceTeamConfig {
    teamCoordinator: TeamCoordinator;
    name?: string;
    description?: string;
}
export declare function createQualityAssuranceTeam(config: QualityAssuranceTeamConfig): AgentTeam;
export declare const QA_TEAM_USE_CASES: {
    comprehensive_qa: {
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
    performance_testing: {
        description: string;
        requiredCapabilities: string[];
        estimatedCost: number;
        estimatedTimeMs: number;
    };
    pre_release_check: {
        description: string;
        requiredCapabilities: string[];
        estimatedCost: number;
        estimatedTimeMs: number;
    };
};
//# sourceMappingURL=QualityAssuranceTeam.d.ts.map