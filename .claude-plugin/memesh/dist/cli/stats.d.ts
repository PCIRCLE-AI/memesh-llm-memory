interface StatsOptions {
    range?: 'day' | 'week' | 'month' | 'all';
    export?: 'json' | 'csv';
    verbose?: boolean;
}
export declare class StatsCommand {
    private kg;
    private constructor();
    static create(): Promise<StatsCommand>;
    run(options?: StatsOptions): Promise<void>;
    private getTimeRange;
    private getTotalEntities;
    private getTotalRelations;
    private getEntityBreakdown;
    private getGrowthData;
    private getTopEntityTypes;
    private getRecentActivity;
    private getHealthMetrics;
    private displayOverview;
    private calculateDensity;
    private displayEntityBreakdown;
    private formatEntityType;
    private displayGrowthChart;
    private displayTopTypes;
    private displayRecentActivity;
    private displayHealthMetrics;
    private calculateHealthScore;
    private displayVerboseStats;
    private exportJSON;
    private exportCSV;
}
export declare function runStats(options?: StatsOptions): Promise<void>;
export {};
//# sourceMappingURL=stats.d.ts.map