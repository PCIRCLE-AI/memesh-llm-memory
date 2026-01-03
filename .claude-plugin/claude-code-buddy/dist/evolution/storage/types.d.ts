export type SQLParam = string | number | null | Buffer;
export type SQLParams = SQLParam[];
export interface Task {
    id: string;
    input: Record<string, any>;
    task_type?: string;
    origin?: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    created_at: Date;
    started_at?: Date;
    completed_at?: Date;
    metadata?: Record<string, any>;
}
export interface Execution {
    id: string;
    task_id: string;
    attempt_number: number;
    agent_id?: string;
    agent_type?: string;
    status: 'running' | 'completed' | 'failed';
    started_at: Date;
    completed_at?: Date;
    result?: Record<string, any>;
    error?: string;
    metadata?: Record<string, any>;
}
export interface Span {
    trace_id: string;
    span_id: string;
    parent_span_id?: string;
    task_id: string;
    execution_id: string;
    name: string;
    kind: SpanKind;
    start_time: number;
    end_time?: number;
    duration_ms?: number;
    status: SpanStatus;
    attributes: SpanAttributes;
    resource: ResourceAttributes;
    links?: SpanLink[];
    tags?: string[];
    events?: SpanEvent[];
}
export type SpanKind = 'internal' | 'client' | 'server' | 'producer' | 'consumer';
export interface SpanStatus {
    code: 'OK' | 'ERROR' | 'UNSET';
    message?: string;
}
export interface SpanAttributes {
    'agent.id'?: string;
    'agent.type'?: string;
    'agent.version'?: string;
    'task.type'?: string;
    'task.input'?: string;
    'execution.success'?: boolean;
    'execution.duration_ms'?: number;
    'execution.cost'?: number;
    'execution.quality_score'?: number;
    'skill.name'?: string;
    'skill.version'?: string;
    'skill.input'?: string;
    'skill.output'?: string;
    'skill.success'?: boolean;
    'skill.user_satisfaction'?: number;
    'llm.model'?: string;
    'llm.provider'?: string;
    'llm.tokens.prompt'?: number;
    'llm.tokens.completion'?: number;
    'llm.tokens.total'?: number;
    'llm.cost'?: number;
    'error.type'?: string;
    'error.message'?: string;
    'error.stack'?: string;
    'config.snapshot'?: string;
    [key: string]: unknown;
}
export interface ResourceAttributes {
    'task.id': string;
    'execution.id': string;
    'execution.attempt': number;
    'agent.id'?: string;
    'agent.type'?: string;
    'service.name'?: string;
    'service.version'?: string;
    'deployment.environment'?: 'dev' | 'staging' | 'production';
    [key: string]: unknown;
}
export interface SpanLink {
    trace_id: string;
    span_id: string;
    link_type?: 'reward_for' | 'caused_by' | 'follows_from' | 'parent_of';
    attributes?: Record<string, any>;
}
export interface SpanEvent {
    name: string;
    timestamp: number;
    attributes?: Record<string, any>;
}
export interface Pattern {
    id: string;
    type: PatternType;
    confidence: number;
    occurrences: number;
    pattern_data: PatternData;
    source_span_ids: string[];
    applies_to_agent_type?: string;
    applies_to_task_type?: string;
    applies_to_skill?: string;
    first_observed: Date;
    last_observed: Date;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
export type PatternType = 'success' | 'anti_pattern' | 'optimization';
export interface PatternData {
    conditions: Record<string, any>;
    recommendations: {
        config_changes?: Record<string, any>;
        prompt_changes?: string;
        strategy_changes?: string;
        skill_selection?: string[];
    };
    expected_improvement: {
        success_rate?: number;
        duration_reduction?: number;
        cost_reduction?: number;
        quality_increase?: number;
    };
    evidence: {
        sample_size: number;
        mean?: number;
        std_dev?: number;
        p_value?: number;
        confidence_interval?: [number, number];
    };
}
export interface Adaptation {
    id: string;
    pattern_id: string;
    type: AdaptationType;
    before_config: Record<string, any>;
    after_config: Record<string, any>;
    applied_to_agent_id?: string;
    applied_to_task_type?: string;
    applied_to_skill?: string;
    applied_at: Date;
    success_count: number;
    failure_count: number;
    avg_improvement: number;
    is_active: boolean;
    deactivated_at?: Date;
    deactivation_reason?: string;
    created_at: Date;
    updated_at: Date;
}
export type AdaptationType = 'config' | 'prompt' | 'strategy' | 'resource' | 'skill';
export interface EvolutionStats {
    id: string;
    agent_id?: string;
    skill_name?: string;
    period_start: Date;
    period_end: Date;
    period_type: 'hourly' | 'daily' | 'weekly' | 'monthly';
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    success_rate: number;
    avg_duration_ms: number;
    avg_cost: number;
    avg_quality_score: number;
    patterns_discovered: number;
    adaptations_applied: number;
    improvement_rate: number;
    skills_used?: string[];
    most_successful_skill?: string;
    avg_skill_satisfaction?: number;
    created_at: Date;
    updated_at: Date;
}
export interface SpanQuery {
    task_id?: string;
    execution_id?: string;
    trace_id?: string;
    span_id?: string;
    agent_id?: string;
    agent_type?: string;
    task_type?: string;
    skill_name?: string;
    status_code?: 'OK' | 'ERROR';
    success?: boolean;
    tags?: string[];
    tags_mode?: 'any' | 'all';
    start_time_gte?: number;
    start_time_lte?: number;
    end_time_gte?: number;
    end_time_lte?: number;
    attributes?: Record<string, any>;
    limit?: number;
    offset?: number;
    sort_by?: 'start_time' | 'duration_ms' | 'created_at';
    sort_order?: 'asc' | 'desc';
}
export interface PatternQuery {
    type?: PatternType | PatternType[];
    min_confidence?: number;
    max_confidence?: number;
    agent_type?: string;
    task_type?: string;
    skill_name?: string;
    tags?: string[];
    is_active?: boolean;
    observed_after?: Date;
    observed_before?: Date;
    limit?: number;
    offset?: number;
    sort_by?: 'confidence' | 'occurrences' | 'last_observed';
    sort_order?: 'asc' | 'desc';
}
export interface TimeRange {
    start: Date;
    end: Date;
}
export interface Reward {
    id: string;
    operation_span_id: string;
    value: number;
    dimensions?: {
        accuracy?: number;
        speed?: number;
        cost?: number;
        user_satisfaction?: number;
        [key: string]: number | undefined;
    };
    feedback?: string;
    feedback_type?: 'user' | 'automated' | 'expert';
    provided_by?: string;
    provided_at: Date;
    metadata?: Record<string, any>;
}
export interface SkillPerformance {
    skill_name: string;
    skill_version?: string;
    total_uses: number;
    successful_uses: number;
    failed_uses: number;
    success_rate: number;
    avg_duration_ms: number;
    avg_user_satisfaction: number;
    most_used_with_agent?: string;
    most_used_for_task?: string;
    trend_7d: 'improving' | 'declining' | 'stable';
    trend_30d: 'improving' | 'declining' | 'stable';
    period_start: Date;
    period_end: Date;
}
export interface SkillRecommendation {
    skill_name: string;
    confidence: number;
    reason: string;
    evidence: {
        similar_tasks_count: number;
        avg_success_rate: number;
        avg_user_satisfaction: number;
    };
    expected_outcome: {
        success_probability: number;
        estimated_duration_ms: number;
        estimated_quality_score: number;
    };
}
export interface TaskRow {
    id: string;
    input: string;
    task_type: string | null;
    origin: string | null;
    status: string;
    created_at: string;
    started_at: string | null;
    completed_at: string | null;
    metadata: string | null;
}
export interface ExecutionRow {
    id: string;
    task_id: string;
    attempt_number: number;
    agent_id: string | null;
    agent_type: string | null;
    status: string;
    started_at: string;
    completed_at: string | null;
    result: string | null;
    error: string | null;
    metadata: string | null;
}
export interface SpanRow {
    trace_id: string;
    span_id: string;
    parent_span_id: string | null;
    task_id: string;
    execution_id: string;
    name: string;
    kind: string;
    start_time: number;
    end_time: number | null;
    duration_ms: number | null;
    status_code: string;
    status_message: string | null;
    attributes: string;
    resource: string;
    links: string | null;
    tags: string | null;
    events: string | null;
}
export interface PatternRow {
    id: string;
    type: string;
    confidence: number;
    occurrences: number;
    pattern_data: string;
    source_span_ids: string;
    applies_to_agent_type: string | null;
    applies_to_task_type: string | null;
    applies_to_skill: string | null;
    first_observed: string;
    last_observed: string;
    is_active: number;
    complexity: number | null;
    config_keys: string | null;
    context_metadata: string | null;
    created_at: string;
    updated_at: string;
}
export interface AdaptationRow {
    id: string;
    pattern_id: string;
    type: string;
    before_config: string;
    after_config: string;
    applied_to_agent_id: string | null;
    applied_to_task_type: string | null;
    applied_to_skill: string | null;
    applied_at: string;
    success_count: number;
    failure_count: number;
    avg_improvement: number;
    is_active: number;
    deactivated_at: string | null;
    deactivation_reason: string | null;
    created_at: string;
    updated_at: string;
}
export interface RewardRow {
    id: string;
    operation_span_id: string;
    value: number;
    dimensions: string | null;
    feedback: string | null;
    feedback_type: string | null;
    provided_by: string | null;
    provided_at: string;
    metadata: string | null;
}
export interface EvolutionStatsRow {
    id: string;
    agent_id: string | null;
    skill_name: string | null;
    period_start: string;
    period_end: string;
    period_type: string;
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    success_rate: number;
    avg_duration_ms: number;
    avg_cost: number;
    avg_quality_score: number;
    patterns_discovered: number;
    adaptations_applied: number;
    improvement_rate: number;
    skills_used: string | null;
    most_successful_skill: string | null;
    avg_skill_satisfaction: number | null;
    created_at: string;
    updated_at: string;
}
export interface ContextualPatternRow {
    id: string;
    pattern_id: string;
    context_hash: string;
    context_data: string;
    confidence: number;
    occurrences: number;
    success_rate: number;
    avg_quality_score: number | null;
    last_observed: string;
    created_at: string;
    updated_at: string;
}
export type { PatternContext, ContextualPattern } from '../types.js';
//# sourceMappingURL=types.d.ts.map