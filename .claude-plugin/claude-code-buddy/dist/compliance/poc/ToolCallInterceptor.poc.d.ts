export interface ToolCallRecord {
    agentId: string;
    toolName: string;
    args: any;
    timestamp: Date;
}
export interface Violation {
    agentId: string;
    rule: string;
    severity: 'critical' | 'major' | 'minor';
    toolCall: ToolCallRecord;
    context: {
        targetFile?: string;
        recentTools: ToolCallRecord[];
    };
}
export declare class POCToolCallInterceptor {
    private toolHistory;
    interceptToolCall(agentId: string, toolName: string, args: any): Violation | undefined;
    getToolHistory(agentId: string): ToolCallRecord[];
    private getRecentToolCalls;
}
//# sourceMappingURL=ToolCallInterceptor.poc.d.ts.map