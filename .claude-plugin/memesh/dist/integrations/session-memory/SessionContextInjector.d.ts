import type { KnowledgeGraph } from '../../knowledge-graph/index.js';
export interface InjectionConfig {
    maxItemsPerSection?: number;
    maxOutputChars?: number;
}
export interface InjectionContext {
    projectPath?: string;
    gitBranch?: string;
}
export declare class SessionContextInjector {
    private knowledgeGraph;
    private config;
    private maxItemsPerSection;
    private maxOutputChars;
    constructor(knowledgeGraph: KnowledgeGraph, config?: InjectionConfig);
    generateContext(ctx?: InjectionContext): string;
    private getLessons;
    private getBestPractices;
    private getPreventionRules;
    private getDecisions;
    private getRecentSessions;
    private formatSection;
    private formatBanner;
    private extractDisplayText;
    private extractSessionTitle;
    private extractBranchTerms;
    private safeSearch;
    private truncateText;
}
//# sourceMappingURL=SessionContextInjector.d.ts.map