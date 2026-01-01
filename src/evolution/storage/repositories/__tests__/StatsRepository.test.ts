import { describe, it, expect, beforeEach } from 'vitest';
import { SimpleDatabaseFactory } from '../../../../config/simple-config';
import { StatsRepository } from '../StatsRepository';

describe('StatsRepository', () => {
  let db: any;
  let repo: StatsRepository;

  beforeEach(() => {
    db = SimpleDatabaseFactory.createTestDatabase();

    // Create evolution_stats table
    db.exec(`
      CREATE TABLE IF NOT EXISTS evolution_stats (
        id TEXT PRIMARY KEY,
        agent_id TEXT,
        skill_name TEXT,
        period_start DATETIME NOT NULL,
        period_end DATETIME NOT NULL,
        period_type TEXT NOT NULL CHECK(period_type IN ('hourly', 'daily', 'weekly', 'monthly')),
        total_executions INTEGER NOT NULL,
        successful_executions INTEGER NOT NULL,
        failed_executions INTEGER NOT NULL,
        success_rate REAL NOT NULL,
        avg_duration_ms REAL NOT NULL,
        avg_cost REAL NOT NULL,
        avg_quality_score REAL NOT NULL,
        patterns_discovered INTEGER NOT NULL DEFAULT 0,
        adaptations_applied INTEGER NOT NULL DEFAULT 0,
        improvement_rate REAL NOT NULL DEFAULT 0,
        skills_used TEXT,
        most_successful_skill TEXT,
        avg_skill_satisfaction REAL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create spans table for skill performance tests
    db.exec(`
      CREATE TABLE IF NOT EXISTS spans (
        span_id TEXT PRIMARY KEY,
        trace_id TEXT NOT NULL,
        parent_span_id TEXT,
        task_id TEXT NOT NULL,
        execution_id TEXT NOT NULL,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        start_time INTEGER NOT NULL,
        end_time INTEGER,
        duration_ms INTEGER,
        status_code TEXT NOT NULL,
        status_message TEXT,
        attributes TEXT NOT NULL,
        resource TEXT NOT NULL,
        links TEXT,
        tags TEXT,
        events TEXT,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    repo = new StatsRepository(db);
  });

  it('should get stats for agent', async () => {
    // Insert a test stat record
    db.exec(`
      INSERT INTO evolution_stats (
        id, agent_id, period_start, period_end, period_type,
        total_executions, successful_executions, failed_executions,
        success_rate, avg_duration_ms, avg_cost, avg_quality_score
      ) VALUES (
        'stat1', 'agent1', '2024-01-01T00:00:00Z', '2024-01-02T00:00:00Z', 'daily',
        10, 8, 2, 0.8, 1000, 0.5, 0.9
      )
    `);

    const stats = await repo.getStats('agent1', {
      start: new Date('2024-01-01T00:00:00Z'),
      end: new Date('2024-01-02T00:00:00Z'),
    });

    expect(stats.agent_id).toBe('agent1');
    expect(stats.total_executions).toBe(10);
    expect(stats.success_rate).toBe(0.8);
  });

  it('should return empty stats if no data', async () => {
    const stats = await repo.getStats('nonexistent-agent', {
      start: new Date('2024-01-01T00:00:00Z'),
      end: new Date('2024-01-02T00:00:00Z'),
    });

    expect(stats.agent_id).toBe('nonexistent-agent');
    expect(stats.total_executions).toBe(0);
    expect(stats.success_rate).toBe(0);
  });

  it('should get skill performance', async () => {
    // Insert test spans with skill attribute
    db.exec(`
      INSERT INTO spans (
        span_id, trace_id, task_id, execution_id, name, kind,
        start_time, duration_ms, status_code, attributes, resource
      ) VALUES
      ('span1', 'trace1', 'task1', 'exec1', 'test', 'INTERNAL',
       1704067200000, 100, 'OK', '{"skill":{"name":"test-skill"}}', '{}'),
      ('span2', 'trace1', 'task1', 'exec1', 'test', 'INTERNAL',
       1704067200000, 200, 'OK', '{"skill":{"name":"test-skill"}}', '{}'),
      ('span3', 'trace1', 'task1', 'exec1', 'test', 'INTERNAL',
       1704067200000, 150, 'ERROR', '{"skill":{"name":"test-skill"}}', '{}')
    `);

    const performance = await repo.getSkillPerformance('test-skill', {
      start: new Date('2024-01-01T00:00:00Z'),
      end: new Date('2024-01-02T00:00:00Z'),
    });

    expect(performance.skill_name).toBe('test-skill');
    expect(performance.total_uses).toBe(3);
    expect(performance.successful_uses).toBe(2);
    expect(performance.failed_uses).toBe(1);
    expect(performance.success_rate).toBeCloseTo(0.666, 2);
  });
});
