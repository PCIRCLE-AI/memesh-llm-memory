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

export class POCToolCallInterceptor {
  private toolHistory: Map<string, ToolCallRecord[]> = new Map();

  interceptToolCall(
    agentId: string,
    toolName: string,
    args: any
  ): Violation | undefined {
    const record: ToolCallRecord = {
      agentId,
      toolName,
      args,
      timestamp: new Date(),
    };

    // Store tool call
    if (!this.toolHistory.has(agentId)) {
      this.toolHistory.set(agentId, []);
    }
    this.toolHistory.get(agentId)!.push(record);

    // Check READ_BEFORE_EDIT rule
    if (toolName === 'Edit') {
      const recentCalls = this.getRecentToolCalls(agentId, 10);
      const targetFile = args.file_path;

      const hasRead = recentCalls.some(
        call => call.toolName === 'Read' && call.args.file_path === targetFile
      );

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

    return undefined; // No violation
  }

  getToolHistory(agentId: string): ToolCallRecord[] {
    return this.toolHistory.get(agentId) || [];
  }

  private getRecentToolCalls(agentId: string, limit: number): ToolCallRecord[] {
    const history = this.toolHistory.get(agentId) || [];
    return history.slice(-limit);
  }
}
