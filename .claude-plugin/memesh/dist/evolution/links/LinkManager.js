import { v4 as uuid } from 'uuid';
export class LinkManager {
    tracker;
    store;
    constructor(tracker, store) {
        this.tracker = tracker;
        this.store = store;
    }
    async linkReward(operationSpanId, reward) {
        const rewardSpan = this.tracker.startSpan({
            name: 'evolution.reward',
            attributes: {
                'reward.value': reward.value,
                'reward.feedback': reward.feedback,
                ...(reward.dimensions || {})
            },
            links: [{
                    trace_id: '',
                    span_id: operationSpanId,
                    attributes: { 'link.type': 'reward_for_operation' }
                }]
        });
        await rewardSpan.end();
        const rewardRecord = {
            id: uuid(),
            operation_span_id: operationSpanId,
            value: reward.value,
            dimensions: reward.dimensions,
            feedback: reward.feedback,
            provided_at: new Date()
        };
        await this.store.recordReward(rewardRecord);
    }
    async queryRewardsForOperation(operationSpanId) {
        return await this.store.queryLinkedSpans(operationSpanId);
    }
    async getRewards(operationSpanId) {
        return await this.store.queryRewardsByOperationSpan(operationSpanId);
    }
}
//# sourceMappingURL=LinkManager.js.map