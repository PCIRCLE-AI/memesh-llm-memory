import { createCodeDevelopmentTeam, CODE_DEV_TEAM_USE_CASES, type CodeDevelopmentTeamConfig } from './CodeDevelopmentTeam.js';
import { createResearchAnalysisTeam, RESEARCH_TEAM_USE_CASES, type ResearchAnalysisTeamConfig } from './ResearchAnalysisTeam.js';
import { createQualityAssuranceTeam, QA_TEAM_USE_CASES, type QualityAssuranceTeamConfig } from './QualityAssuranceTeam.js';
import { createOrchestrationTeam, ORCHESTRATION_TEAM_USE_CASES, type OrchestrationTeamConfig } from './OrchestrationTeam.js';
export { createCodeDevelopmentTeam, CODE_DEV_TEAM_USE_CASES, type CodeDevelopmentTeamConfig, };
export { createResearchAnalysisTeam, RESEARCH_TEAM_USE_CASES, type ResearchAnalysisTeamConfig, };
export { createQualityAssuranceTeam, QA_TEAM_USE_CASES, type QualityAssuranceTeamConfig, };
export { createOrchestrationTeam, ORCHESTRATION_TEAM_USE_CASES, type OrchestrationTeamConfig, };
export declare function createAllTeams(config: {
    teamCoordinator: import('../collaboration/TeamCoordinator.js').TeamCoordinator;
}): Promise<{
    codeDevelopment: import("../collaboration/types.js").AgentTeam;
    researchAnalysis: import("../collaboration/types.js").AgentTeam;
    qualityAssurance: import("../collaboration/types.js").AgentTeam;
    orchestration: import("../collaboration/types.js").AgentTeam;
}>;
export declare const TEAM_SELECTION_GUIDE: {
    readonly 'feature-development': {
        readonly primaryTeam: "codeDevelopment";
        readonly supportTeams: readonly ["qualityAssurance"];
        readonly description: "新功能開發：由代碼團隊主導，品質團隊支援";
    };
    readonly 'technical-research': {
        readonly primaryTeam: "researchAnalysis";
        readonly supportTeams: readonly [];
        readonly description: "技術調研：由研究團隊主導";
    };
    readonly 'performance-optimization': {
        readonly primaryTeam: "orchestration";
        readonly supportTeams: readonly ["codeDevelopment", "qualityAssurance"];
        readonly description: "性能優化：由編排團隊主導，代碼與品質團隊支援";
    };
    readonly 'security-audit': {
        readonly primaryTeam: "qualityAssurance";
        readonly supportTeams: readonly ["codeDevelopment"];
        readonly description: "安全審計：由品質團隊主導，代碼團隊支援修復";
    };
    readonly 'cost-optimization': {
        readonly primaryTeam: "orchestration";
        readonly supportTeams: readonly [];
        readonly description: "成本優化：由編排團隊主導";
    };
    readonly 'code-refactoring': {
        readonly primaryTeam: "codeDevelopment";
        readonly supportTeams: readonly ["qualityAssurance"];
        readonly description: "代碼重構：由代碼團隊主導，品質團隊驗證";
    };
    readonly 'competitive-analysis': {
        readonly primaryTeam: "researchAnalysis";
        readonly supportTeams: readonly [];
        readonly description: "競品分析：由研究團隊主導";
    };
    readonly 'pre-release-validation': {
        readonly primaryTeam: "qualityAssurance";
        readonly supportTeams: readonly ["codeDevelopment", "orchestration"];
        readonly description: "發布前驗證：由品質團隊主導，代碼與編排團隊支援";
    };
};
//# sourceMappingURL=index.d.ts.map