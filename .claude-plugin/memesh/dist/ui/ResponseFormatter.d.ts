export interface AgentResponse {
    agentType: string;
    taskDescription: string;
    status: 'success' | 'error' | 'partial';
    results?: Record<string, unknown> | string | Array<unknown>;
    enhancedPrompt?: EnhancedPrompt;
    error?: Error;
    metadata?: {
        duration?: number;
        tokensUsed?: number;
        model?: string;
    };
}
export interface EnhancedPrompt {
    systemPrompt: string;
    userPrompt: string;
    suggestedModel?: string;
    metadata?: Record<string, unknown>;
}
export declare class ResponseFormatter {
    private readonly MAX_PROMPT_LENGTH;
    private readonly MAX_STACK_LENGTH;
    private readonly LARGE_RESULT_THRESHOLD;
    private readonly errorClassifier;
    constructor();
    format(response: AgentResponse): string;
    private detectComplexity;
    private formatSimple;
    private formatMedium;
    private formatComplex;
    private resultsToString;
    private shouldShowAttribution;
    private formatMinimalHeader;
    private getResultSummary;
    private formatHeader;
    private formatTaskDescription;
    private formatSection;
    private formatDivider;
    private generateNextSteps;
    private formatEnhancedPrompt;
    private extractGuardrails;
    private stripGuardrails;
    private formatResults;
    private formatError;
    private getSeverityBadge;
    private formatMetadata;
    private formatAttribution;
    private formatArray;
    private formatObject;
    private formatTable;
    private getStatusIcon;
    private getStatusColor;
    private truncateText;
    private formatDuration;
    private formatNumber;
}
//# sourceMappingURL=ResponseFormatter.d.ts.map