export interface ExecutionMetricsRecord {
    id: string;
    agent_id: string;
    task_type: string;
    success: boolean;
    duration_ms: number;
    timestamp: Date;
    cost?: number;
    quality_score?: number;
    error_message?: string;
    config_snapshot: string;
    metadata: string;
    created_at: Date;
    updated_at: Date;
}
export interface PatternRecord {
    id: string;
    type: 'success' | 'anti_pattern' | 'optimization';
    confidence: number;
    occurrences: number;
    pattern_data: string;
    source_metric_ids: string;
    agent_id?: string;
    task_type?: string;
    first_observed: Date;
    last_observed: Date;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
}
export interface AdaptationRecord {
    id: string;
    pattern_id: string;
    type: 'config' | 'prompt' | 'strategy' | 'resource';
    before_config: string;
    after_config: string;
    applied_to_agent_id?: string;
    applied_to_task_type?: string;
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
export interface EvolutionStatsRecord {
    id: string;
    agent_id: string;
    period_start: Date;
    period_end: Date;
    period_type: 'hourly' | 'daily' | 'weekly' | 'monthly';
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    avg_duration_ms: number;
    avg_cost: number;
    avg_quality_score: number;
    patterns_discovered: number;
    adaptations_applied: number;
    improvement_rate: number;
    created_at: Date;
    updated_at: Date;
}
export declare const SCHEMA_SQL: {
    sqlite: {
        execution_metrics: string;
        patterns: string;
        adaptations: string;
        evolution_stats: string;
    };
    postgresql: {
        execution_metrics: string;
        patterns: string;
        adaptations: string;
        evolution_stats: string;
    };
};
//# sourceMappingURL=schema.d.ts.map