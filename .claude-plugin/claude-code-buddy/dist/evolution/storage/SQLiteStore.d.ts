import Database from 'better-sqlite3';
import { MigrationManager } from './migrations/MigrationManager';
import type { EvolutionStore } from './EvolutionStore';
import type { Task, Execution, Span, Pattern, Adaptation, EvolutionStats, Reward, SpanQuery, PatternQuery, TimeRange, SkillPerformance, SkillRecommendation, SpanRow } from './types';
export interface SQLiteStoreOptions {
    dbPath?: string;
    verbose?: boolean;
    enableWAL?: boolean;
}
export declare class SQLiteStore implements EvolutionStore {
    protected db: Database.Database;
    protected migrationManager: MigrationManager;
    private taskRepository;
    private executionRepository;
    private spanRepository;
    private patternRepository;
    private adaptationRepository;
    private rewardRepository;
    private statsRepository;
    private options;
    constructor(options?: SQLiteStoreOptions);
    private escapeLikePattern;
    initialize(): Promise<void>;
    close(): Promise<void>;
    private createTables;
    private createIndexes;
    createTask(input: Record<string, any>, metadata?: Record<string, any>): Promise<Task>;
    getTask(taskId: string): Promise<Task | null>;
    updateTask(taskId: string, updates: Partial<Task>): Promise<void>;
    listTasks(filters?: {
        status?: Task['status'];
        limit?: number;
        offset?: number;
    }): Promise<Task[]>;
    createExecution(taskId: string, metadata?: Record<string, any>): Promise<Execution>;
    getExecution(executionId: string): Promise<Execution | null>;
    updateExecution(executionId: string, updates: Partial<Execution>): Promise<void>;
    listExecutions(taskId: string): Promise<Execution[]>;
    recordSpan(span: Span): Promise<void>;
    recordSpanBatch(spans: Span[]): Promise<void>;
    querySpans(query: SpanQuery): Promise<Span[]>;
    getSpan(spanId: string): Promise<Span | null>;
    getSpansByTrace(traceId: string): Promise<Span[]>;
    getChildSpans(parentSpanId: string): Promise<Span[]>;
    queryLinkedSpans(spanId: string): Promise<Span[]>;
    queryByTags(tags: string[], mode?: 'any' | 'all'): Promise<Span[]>;
    recordReward(reward: Reward): Promise<void>;
    getRewardsForSpan(spanId: string): Promise<Reward[]>;
    queryRewardsByOperationSpan(operationSpanId: string): Promise<Reward[]>;
    queryRewards(filters: {
        start_time?: Date;
        end_time?: Date;
        min_value?: number;
        max_value?: number;
    }): Promise<Reward[]>;
    storePattern(pattern: Pattern): Promise<void>;
    getPattern(patternId: string): Promise<Pattern | null>;
    queryPatterns(query: PatternQuery): Promise<Pattern[]>;
    storeContextualPattern(pattern: import('./types.js').ContextualPattern): Promise<void>;
    queryPatternsByContext(context: import('./types.js').PatternContext): Promise<import('./types.js').ContextualPattern[]>;
    private rowToContextualPattern;
    updatePattern(patternId: string, updates: Partial<Pattern>): Promise<void>;
    deactivatePattern(patternId: string, reason?: string): Promise<void>;
    getActivePatternsFor(filters: {
        agentType?: string;
        taskType?: string;
        skillName?: string;
    }): Promise<Pattern[]>;
    storeAdaptation(adaptation: Adaptation): Promise<void>;
    getAdaptation(adaptationId: string): Promise<Adaptation | null>;
    queryAdaptations(filters: {
        patternId?: string;
        agentId?: string;
        taskType?: string;
        skillName?: string;
        isActive?: boolean;
    }): Promise<Adaptation[]>;
    updateAdaptationOutcome(adaptationId: string, outcome: {
        success: boolean;
        improvement?: number;
    }): Promise<void>;
    deactivateAdaptation(adaptationId: string, reason?: string): Promise<void>;
    getStats(agentId: string, timeRange: TimeRange): Promise<EvolutionStats>;
    getAllStats(timeRange: TimeRange): Promise<EvolutionStats[]>;
    computePeriodStats(periodType: 'hourly' | 'daily' | 'weekly' | 'monthly', periodStart: Date, periodEnd: Date): Promise<EvolutionStats[]>;
    getSkillPerformance(skillName: string, timeRange: TimeRange): Promise<SkillPerformance>;
    getAllSkillsPerformance(timeRange: TimeRange): Promise<SkillPerformance[]>;
    getSkillRecommendations(filters: {
        taskType: string;
        agentType?: string;
        topN?: number;
    }): Promise<SkillRecommendation[]>;
    recordSkillFeedback(spanId: string, feedback: {
        satisfaction: number;
        comment?: string;
    }): Promise<void>;
    getDatabaseStats(): Promise<{
        total_tasks: number;
        total_executions: number;
        total_spans: number;
        total_patterns: number;
        total_adaptations: number;
        database_size_bytes?: number;
    }>;
    optimize(): Promise<void>;
    exportData(filters: {
        startDate?: Date;
        endDate?: Date;
        format: 'json' | 'csv';
    }): Promise<string>;
    protected rowToSpan(row: SpanRow): Span;
    private rowToPattern;
    private rowToEvolutionStats;
}
//# sourceMappingURL=SQLiteStore.d.ts.map