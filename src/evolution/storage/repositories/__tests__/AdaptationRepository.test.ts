import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuid } from 'uuid';
import { SimpleDatabaseFactory } from '../../../../config/simple-config';
import { AdaptationRepository } from '../AdaptationRepository';
import type { Adaptation } from '../../types';

describe('AdaptationRepository', () => {
  let db: any;
  let repo: AdaptationRepository;

  beforeEach(() => {
    db = SimpleDatabaseFactory.createTestDatabase();

    // Create adaptations table
    db.exec(`
      CREATE TABLE IF NOT EXISTS adaptations (
        id TEXT PRIMARY KEY,
        pattern_id TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('config', 'prompt', 'strategy', 'resource', 'skill')),
        before_config TEXT NOT NULL,
        after_config TEXT NOT NULL,
        applied_to_agent_id TEXT,
        applied_to_task_type TEXT,
        applied_to_skill TEXT,
        applied_at DATETIME NOT NULL,
        success_count INTEGER NOT NULL DEFAULT 0,
        failure_count INTEGER NOT NULL DEFAULT 0,
        avg_improvement REAL NOT NULL DEFAULT 0,
        is_active INTEGER NOT NULL DEFAULT 1,
        deactivated_at DATETIME,
        deactivation_reason TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    repo = new AdaptationRepository(db);
  });

  it('should record adaptation', async () => {
    const adaptation: Adaptation = {
      id: uuid(),
      pattern_id: 'pattern-1',
      type: 'config',
      before_config: { timeout: 5000 },
      after_config: { timeout: 10000 },
      applied_at: new Date(),
      success_count: 0,
      failure_count: 0,
      avg_improvement: 0,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await repo.recordAdaptation(adaptation);

    const retrieved = await repo.getAdaptation(adaptation.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.pattern_id).toBe('pattern-1');
    expect(retrieved?.type).toBe('config');
  });

  it('should get adaptation by id', async () => {
    const adaptation: Adaptation = {
      id: uuid(),
      pattern_id: 'pattern-2',
      type: 'prompt',
      before_config: { maxTokens: 100 },
      after_config: { maxTokens: 200 },
      applied_to_agent_id: 'agent-1',
      applied_at: new Date(),
      success_count: 5,
      failure_count: 2,
      avg_improvement: 0.3,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await repo.recordAdaptation(adaptation);
    const retrieved = await repo.getAdaptation(adaptation.id);

    expect(retrieved).toEqual(expect.objectContaining({
      id: adaptation.id,
      pattern_id: 'pattern-2',
      type: 'prompt',
      applied_to_agent_id: 'agent-1',
      success_count: 5,
      failure_count: 2,
    }));
  });

  it('should query adaptations with filters', async () => {
    // Create multiple adaptations
    const adaptation1: Adaptation = {
      id: uuid(),
      pattern_id: 'pattern-1',
      type: 'config',
      before_config: {},
      after_config: {},
      applied_to_agent_id: 'agent-1',
      applied_to_task_type: 'code_review',
      applied_at: new Date(),
      success_count: 0,
      failure_count: 0,
      avg_improvement: 0,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const adaptation2: Adaptation = {
      id: uuid(),
      pattern_id: 'pattern-2',
      type: 'prompt',
      before_config: {},
      after_config: {},
      applied_to_agent_id: 'agent-2',
      applied_to_task_type: 'bug_fixing',
      applied_at: new Date(),
      success_count: 0,
      failure_count: 0,
      avg_improvement: 0,
      is_active: false,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await repo.recordAdaptation(adaptation1);
    await repo.recordAdaptation(adaptation2);

    // Query by pattern_id
    const byPattern = await repo.queryAdaptations({ patternId: 'pattern-1' });
    expect(byPattern).toHaveLength(1);
    expect(byPattern[0].pattern_id).toBe('pattern-1');

    // Query by agent_id
    const byAgent = await repo.queryAdaptations({ agentId: 'agent-2' });
    expect(byAgent).toHaveLength(1);
    expect(byAgent[0].applied_to_agent_id).toBe('agent-2');

    // Query by is_active
    const activeOnly = await repo.queryAdaptations({ isActive: true });
    expect(activeOnly).toHaveLength(1);
    expect(activeOnly[0].is_active).toBe(true);
  });
});
