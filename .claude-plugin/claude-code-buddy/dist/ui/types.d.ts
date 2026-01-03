export declare const UIEventType: {
    readonly PROGRESS: "progress";
    readonly AGENT_START: "agent_start";
    readonly AGENT_COMPLETE: "agent_complete";
    readonly SUCCESS: "success";
    readonly ERROR: "error";
    readonly METRICS_UPDATE: "metrics_update";
    readonly ATTRIBUTION: "attribution";
};
export type UIEventTypeValue = typeof UIEventType[keyof typeof UIEventType];
export interface ProgressIndicator {
    agentId: string;
    agentType: string;
    taskDescription: string;
    progress: number;
    currentStage?: string;
    startTime: Date;
    endTime?: Date;
}
export interface AgentStatus {
    agentId: string;
    agentType: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress: number;
    currentTask?: string;
    startTime: Date;
    endTime?: Date;
}
export interface SuccessEvent {
    agentId: string;
    agentType: string;
    taskDescription: string;
    result: unknown;
    duration: number;
    timestamp: Date;
}
export interface ErrorEvent {
    agentId: string;
    agentType: string;
    taskDescription: string;
    error: Error;
    timestamp: Date;
    sanitized?: boolean;
}
export interface AgentStartEvent {
    agentId: string;
    agentType: string;
    taskDescription: string;
}
export interface AgentCompleteEvent {
    agentId: string;
    agentType: string;
    duration: number;
}
export interface AttributionEntry {
    type: 'success' | 'error';
    agentType: string;
    taskDescription: string;
    timestamp: Date;
    result?: unknown;
    error?: Error;
    sanitized?: boolean;
}
export interface MetricsSnapshot {
    sessionStart: Date;
    totalTasks: number;
    completedTasks: number;
    failedTasks: number;
    agentUsageCount: Record<string, number>;
    estimatedTimeSaved: number;
    tokensUsed: number;
}
export interface DashboardState {
    activeAgents: Map<string, AgentStatus>;
    recentEvents: AttributionEntry[];
    metrics: MetricsSnapshot;
}
export interface DashboardConfig {
    updateInterval: number;
    maxRecentEvents: number;
    showSpinner?: boolean;
    showMetrics?: boolean;
    showAttribution?: boolean;
}
export interface SanitizationOptions {
    removeUserPaths?: boolean;
    removeApiKeys?: boolean;
    removePasswords?: boolean;
    removeTokens?: boolean;
    customPatterns?: RegExp[];
}
export interface GitHubIssueOptions {
    enabled: boolean;
    repository: string;
    labels?: string[];
    assignees?: string[];
    sanitize?: SanitizationOptions;
}
export type AttributionType = 'success' | 'error' | 'warning';
export interface ErrorDetails {
    name: string;
    message: string;
    stack?: string;
}
export interface AttributionMessage {
    id: string;
    type: AttributionType;
    timestamp: Date;
    agentIds: string[];
    taskDescription: string;
    metadata?: {
        timeSaved?: number;
        tokensUsed?: number;
        error?: ErrorDetails;
        suggestGitHubIssue?: boolean;
    };
}
export interface GitHubIssueSuggestion {
    title: string;
    body: string;
    labels: string[];
}
export interface SessionMetrics {
    sessionId: string;
    startedAt: Date;
    tasksCompleted: number;
    tasksFailed: number;
    totalTimeSaved: number;
    totalTokensUsed: number;
    agentUsageBreakdown: Record<string, number>;
}
export interface UIConfig {
    updateInterval: number;
    maxRecentAttributions: number;
    colorEnabled: boolean;
    animationsEnabled: boolean;
    terminalWidth?: number;
}
export declare const DEFAULT_UI_CONFIG: UIConfig;
export interface DashboardStateForRendering {
    resources: import('../core/types.js').SystemResources;
    agents: ProgressIndicator[];
    recentAttributions: AttributionMessage[];
    sessionMetrics: SessionMetrics;
}
//# sourceMappingURL=types.d.ts.map