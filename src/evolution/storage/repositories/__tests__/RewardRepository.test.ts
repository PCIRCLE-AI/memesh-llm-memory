import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuid } from 'uuid';
import { SimpleDatabaseFactory } from '../../../../config/simple-config';
import { RewardRepository } from '../RewardRepository';
import type { Reward } from '../../types';

describe('RewardRepository', () => {
  let db: any;
  let repo: RewardRepository;

  beforeEach(() => {
    db = SimpleDatabaseFactory.createTestDatabase();

    // Create rewards table
    db.exec(`
      CREATE TABLE IF NOT EXISTS rewards (
        id TEXT PRIMARY KEY,
        operation_span_id TEXT NOT NULL,
        value REAL NOT NULL,
        dimensions TEXT,
        feedback TEXT,
        feedback_type TEXT,
        provided_by TEXT,
        provided_at DATETIME NOT NULL,
        metadata TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    repo = new RewardRepository(db);
  });

  it('should record reward', async () => {
    const reward: Reward = {
      id: uuid(),
      operation_span_id: 'span-1',
      value: 0.9,
      dimensions: { accuracy: 0.95, speed: 0.85 },
      feedback: 'Great job!',
      feedback_type: 'user',
      provided_by: 'user-123',
      provided_at: new Date(),
      metadata: { source: 'test' },
    };

    await repo.recordReward(reward);

    // Verify it was inserted
    const rewards = await repo.getRewardsForSpan('span-1');
    expect(rewards).toHaveLength(1);
    expect(rewards[0].value).toBe(0.9);
    expect(rewards[0].feedback).toBe('Great job!');
  });

  it('should get rewards for span ordered by provided_at ASC', async () => {
    const spanId = 'span-2';
    const now = new Date();

    // Create rewards with different timestamps
    await repo.recordReward({
      id: uuid(),
      operation_span_id: spanId,
      value: 0.5,
      provided_at: new Date(now.getTime() + 1000), // Later
    });

    await repo.recordReward({
      id: uuid(),
      operation_span_id: spanId,
      value: 0.3,
      provided_at: new Date(now.getTime() - 1000), // Earlier
    });

    const rewards = await repo.getRewardsForSpan(spanId);

    expect(rewards).toHaveLength(2);
    expect(rewards[0].value).toBe(0.3); // Earlier first
    expect(rewards[1].value).toBe(0.5); // Later second
  });

  it('should query rewards by operation span ordered by provided_at DESC', async () => {
    const spanId = 'span-3';
    const now = new Date();

    // Create rewards
    await repo.recordReward({
      id: uuid(),
      operation_span_id: spanId,
      value: 0.7,
      provided_at: new Date(now.getTime() - 1000),
    });

    await repo.recordReward({
      id: uuid(),
      operation_span_id: spanId,
      value: 0.8,
      provided_at: new Date(now.getTime() + 1000),
    });

    const rewards = await repo.queryRewardsByOperationSpan(spanId);

    expect(rewards).toHaveLength(2);
    expect(rewards[0].value).toBe(0.8); // Latest first
    expect(rewards[1].value).toBe(0.7); // Older second
  });

  it('should query rewards with filters', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600000);
    const twoHoursAgo = new Date(now.getTime() - 7200000);

    // Create rewards with different values and times
    await repo.recordReward({
      id: uuid(),
      operation_span_id: 'span-4',
      value: 0.3,
      provided_at: twoHoursAgo,
    });

    await repo.recordReward({
      id: uuid(),
      operation_span_id: 'span-5',
      value: 0.6,
      provided_at: oneHourAgo,
    });

    await repo.recordReward({
      id: uuid(),
      operation_span_id: 'span-6',
      value: 0.9,
      provided_at: now,
    });

    // Query with filters
    const rewards = await repo.queryRewards({
      start_time: oneHourAgo,
      min_value: 0.5,
    });

    expect(rewards).toHaveLength(2);
    expect(rewards[0].value).toBe(0.9); // DESC order
    expect(rewards[1].value).toBe(0.6);
  });
});
