import Database from 'better-sqlite3';
import type { Reward } from '../types';
export declare class RewardRepository {
    private db;
    constructor(db: Database.Database);
    recordReward(reward: Reward): Promise<void>;
    getRewardsForSpan(spanId: string): Promise<Reward[]>;
    queryRewardsByOperationSpan(operationSpanId: string): Promise<Reward[]>;
    queryRewards(filters: {
        start_time?: Date;
        end_time?: Date;
        min_value?: number;
        max_value?: number;
    }): Promise<Reward[]>;
    private rowToReward;
}
//# sourceMappingURL=RewardRepository.d.ts.map