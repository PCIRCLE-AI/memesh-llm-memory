export interface AgentMessage {
    id: string;
    from: string;
    to: string;
    timestamp: Date;
    type: 'request' | 'response' | 'broadcast' | 'notification';
    content: {
        task?: string;
        data?: any;
        result?: any;
        error?: string;
    };
    metadata?: {
        priority?: 'low' | 'medium' | 'high';
        requiresResponse?: boolean;
        correlationId?: string;
        usage?: {
            model?: string;
            inputTokens?: number;
            outputTokens?: number;
        };
    };
}
export interface AgentCapability {
    name: string;
    description: string;
    inputSchema: any;
    outputSchema: any;
    estimatedCost: number;
    estimatedTimeMs: number;
}
export interface CollaborativeAgent {
    id: string;
    name: string;
    type: 'voice' | 'rag' | 'code' | 'research' | 'architecture' | 'custom';
    capabilities: AgentCapability[];
    status: 'idle' | 'busy' | 'error';
    initialize(): Promise<void>;
    shutdown(): Promise<void>;
    handleMessage(message: AgentMessage): Promise<AgentMessage>;
    execute(capability: string, input: any): Promise<any>;
}
export interface AgentTeam {
    id: string;
    name: string;
    description: string;
    leader: string;
    members: string[];
    capabilities: string[];
    metadata?: {
        domain?: string;
        expertise?: string[];
        maxConcurrency?: number;
    };
}
export interface CollaborativeTask {
    id: string;
    description: string;
    requiredCapabilities: string[];
    assignedTeam?: string;
    assignedAgents?: string[];
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    subtasks?: CollaborativeSubTask[];
    context?: any;
    deadline?: Date;
}
export interface CollaborativeSubTask {
    id: string;
    parentTaskId: string;
    description: string;
    assignedAgent?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    dependencies?: string[];
    input?: any;
    output?: any;
    error?: string;
}
export interface CollaborationSession {
    id: string;
    task: CollaborativeTask;
    team: AgentTeam;
    startTime: Date;
    endTime?: Date;
    messages: AgentMessage[];
    results: {
        success: boolean;
        output?: any;
        error?: string;
        cost: number;
        durationMs: number;
    };
}
export interface TeamMetrics {
    teamId: string;
    tasksCompleted: number;
    successRate: number;
    averageDurationMs: number;
    totalCost: number;
    agentUtilization: Record<string, number>;
}
//# sourceMappingURL=types.d.ts.map