export class POCToolCallInterceptor {
    toolHistory = new Map();
    interceptToolCall(agentId, toolName, args) {
        const record = {
            agentId,
            toolName,
            args,
            timestamp: new Date(),
        };
        if (!this.toolHistory.has(agentId)) {
            this.toolHistory.set(agentId, []);
        }
        this.toolHistory.get(agentId).push(record);
        if (toolName === 'Edit') {
            const recentCalls = this.getRecentToolCalls(agentId, 10);
            const targetFile = args.file_path;
            const hasRead = recentCalls.some(call => call.toolName === 'Read' && call.args.file_path === targetFile);
            if (!hasRead) {
                return {
                    agentId,
                    rule: 'READ_BEFORE_EDIT',
                    severity: 'critical',
                    toolCall: record,
                    context: {
                        targetFile,
                        recentTools: recentCalls,
                    },
                };
            }
        }
        return undefined;
    }
    getToolHistory(agentId) {
        return this.toolHistory.get(agentId) || [];
    }
    getRecentToolCalls(agentId, limit) {
        const history = this.toolHistory.get(agentId) || [];
        return history.slice(-limit);
    }
}
//# sourceMappingURL=ToolCallInterceptor.poc.js.map