import { SQLiteStore } from './SQLiteStore.js';
import type { Span, TimeRange, SkillPerformance, SkillRecommendation } from './types';
export interface EnhancedSQLiteStoreOptions {
    dbPath?: string;
    verbose?: boolean;
    enableWAL?: boolean;
    enableBackup?: boolean;
    backupInterval?: number;
    performanceMonitoring?: boolean;
}
export declare class EnhancedSQLiteStore extends SQLiteStore {
    private enhancedOptions;
    private performanceMetrics;
    private backupTimer?;
    constructor(options?: EnhancedSQLiteStoreOptions);
    initialize(): Promise<void>;
    close(): Promise<void>;
    private trackPerformance;
    private printPerformanceMetrics;
    private startBackupTimer;
    backup(): Promise<string>;
    restore(backupPath: string): Promise<void>;
    recordSpan(span: Span): Promise<void>;
    getSkillPerformance(skillName: string, timeRange: TimeRange): Promise<SkillPerformance>;
    private calculateSkillTrend;
    private getMostUsedAgent;
    private getMostUsedTask;
    getSkillRecommendations(filters: {
        taskType: string;
        agentType?: string;
        topN?: number;
    }): Promise<SkillRecommendation[]>;
    searchSpansByText(query: string, limit?: number): Promise<Span[]>;
}
//# sourceMappingURL=SQLiteStore.enhanced.d.ts.map