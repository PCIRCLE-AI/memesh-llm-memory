export interface BaseTelemetryEvent {
    anonymous_id: string;
    timestamp: string;
    sdk_version: string;
    node_version: string;
    os_platform: string;
}
export interface AgentUsageEvent extends BaseTelemetryEvent {
    event: 'agent_execution';
    agent_type: string;
    agent_version?: string;
    success: boolean;
    duration_ms: number;
    cost?: number;
    task_type?: string;
    error_type?: string;
}
export interface SkillUsageEvent extends BaseTelemetryEvent {
    event: 'skill_execution';
    skill_name: string;
    skill_version?: string;
    success: boolean;
    duration_ms: number;
    user_satisfaction?: number;
    used_with_agent?: string;
    task_type?: string;
}
export interface FeatureUsageEvent extends BaseTelemetryEvent {
    event: 'feature_usage';
    feature_name: string;
    action: string;
}
export interface ErrorEvent extends BaseTelemetryEvent {
    event: 'error';
    error_type: string;
    error_category: string;
    component: string;
    stack_trace_hash?: string;
}
export interface PerformanceEvent extends BaseTelemetryEvent {
    event: 'performance';
    operation: string;
    duration_ms: number;
    data_size?: number;
}
export interface WorkflowEvent extends BaseTelemetryEvent {
    event: 'workflow';
    workflow_type: string;
    steps_completed: number;
    total_steps: number;
    success: boolean;
}
export type TelemetryEvent = AgentUsageEvent | SkillUsageEvent | FeatureUsageEvent | ErrorEvent | PerformanceEvent | WorkflowEvent;
export interface TelemetryConfig {
    enabled: boolean;
    anonymous_id: string;
    send_automatically: boolean;
    send_interval_hours?: number;
    last_sent?: Date;
}
export declare function isAgentUsageEvent(event: TelemetryEvent): event is AgentUsageEvent;
export declare function isSkillUsageEvent(event: TelemetryEvent): event is SkillUsageEvent;
export declare function isErrorEvent(event: TelemetryEvent): event is ErrorEvent;
export declare function isPerformanceEvent(event: TelemetryEvent): event is PerformanceEvent;
export declare function isWorkflowEvent(event: TelemetryEvent): event is WorkflowEvent;
export interface EventFilters {
    event_type?: TelemetryEvent['event'];
    start_date?: Date;
    end_date?: Date;
    sent?: boolean;
    limit?: number;
}
//# sourceMappingURL=types.d.ts.map