import { AgentTeam } from '../collaboration/types.js';
import { TeamCoordinator } from '../collaboration/TeamCoordinator.js';
export interface ResearchAnalysisTeamConfig {
    teamCoordinator: TeamCoordinator;
    name?: string;
    description?: string;
}
export declare function createResearchAnalysisTeam(config: ResearchAnalysisTeamConfig): AgentTeam;
export declare const RESEARCH_TEAM_USE_CASES: {
    technology_evaluation: {
        description: string;
        requiredCapabilities: string[];
        estimatedCost: number;
        estimatedTimeMs: number;
    };
    market_research: {
        description: string;
        requiredCapabilities: string[];
        estimatedCost: number;
        estimatedTimeMs: number;
    };
    best_practices_research: {
        description: string;
        requiredCapabilities: string[];
        estimatedCost: number;
        estimatedTimeMs: number;
    };
    competitive_intelligence: {
        description: string;
        requiredCapabilities: string[];
        estimatedCost: number;
        estimatedTimeMs: number;
    };
};
//# sourceMappingURL=ResearchAnalysisTeam.d.ts.map