/**
 * Link Manager - Connect rewards to operation spans
 */
import { SpanTracker } from '../instrumentation/SpanTracker.js';
import type { EvolutionStore } from '../storage/EvolutionStore.js';
import type { Span, Reward } from '../storage/types.js';
import { v4 as uuid } from 'uuid';

export interface RewardInput {
  value: number; // 0-1
  feedback?: string;
  dimensions?: Record<string, number>;
}

export class LinkManager {
  constructor(
    private tracker: SpanTracker,
    private store: EvolutionStore
  ) {}

  /**
   * Link a reward to a previous operation span
   */
  async linkReward(
    operationSpanId: string,
    reward: RewardInput
  ): Promise<void> {
    // Create reward span
    const rewardSpan = this.tracker.startSpan({
      name: 'evolution.reward',
      attributes: {
        'reward.value': reward.value,
        'reward.feedback': reward.feedback,
        ...(reward.dimensions || {})
      },
      links: [{
        trace_id: '', // Will be filled by span tracker
        span_id: operationSpanId,
        attributes: { 'link.type': 'reward_for_operation' }
      }]
    });

    await rewardSpan.end();

    // Store reward record
    const rewardRecord: Reward = {
      id: uuid(),
      operation_span_id: operationSpanId,
      value: reward.value,
      dimensions: reward.dimensions,
      feedback: reward.feedback,
      provided_at: new Date()
    };

    await this.store.recordReward(rewardRecord);
  }

  /**
   * Query all rewards for an operation
   */
  async queryRewardsForOperation(operationSpanId: string): Promise<Span[]> {
    return await this.store.queryLinkedSpans(operationSpanId);
  }

  /**
   * Get reward records by operation span
   */
  async getRewards(operationSpanId: string): Promise<Reward[]> {
    return await this.store.queryRewardsByOperationSpan(operationSpanId);
  }
}
