import { SpanTracker } from '../instrumentation/SpanTracker.js';
import type { EvolutionStore } from '../storage/EvolutionStore.js';
import type { Span, Reward } from '../storage/types.js';
export interface RewardInput {
    value: number;
    feedback?: string;
    dimensions?: Record<string, number>;
}
export declare class LinkManager {
    private tracker;
    private store;
    constructor(tracker: SpanTracker, store: EvolutionStore);
    linkReward(operationSpanId: string, reward: RewardInput): Promise<void>;
    queryRewardsForOperation(operationSpanId: string): Promise<Span[]>;
    getRewards(operationSpanId: string): Promise<Reward[]>;
}
//# sourceMappingURL=LinkManager.d.ts.map