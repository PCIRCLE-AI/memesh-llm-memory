import Database from 'better-sqlite3';
import type { EvolutionStats, TimeRange, SkillPerformance, SkillRecommendation } from '../types';
export declare class StatsRepository {
    private db;
    constructor(db: Database.Database);
    getStats(agentId: string, timeRange: TimeRange): Promise<EvolutionStats>;
    private determinePeriodType;
    getSkillPerformance(skillName: string, timeRange: TimeRange): Promise<SkillPerformance>;
    getSkillRecommendations(filters: {
        taskType: string;
        agentType?: string;
        topN?: number;
    }): Promise<SkillRecommendation[]>;
    private rowToEvolutionStats;
}
//# sourceMappingURL=StatsRepository.d.ts.map