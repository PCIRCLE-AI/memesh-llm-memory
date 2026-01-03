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
    format(response: AgentResponse): string;
    private formatHeader;
    private formatTaskDescription;
    private formatEnhancedPrompt;
    private formatResults;
    private formatError;
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