import { describe, it, expect, beforeEach } from 'vitest';
import { v4 as uuid } from 'uuid';
import { SimpleDatabaseFactory } from '../../../../config/simple-config';
import { PatternRepository } from '../PatternRepository';
import type { Pattern } from '../../types';

describe('PatternRepository', () => {
  let db: any;
  let repo: PatternRepository;

  beforeEach(() => {
    db = SimpleDatabaseFactory.createTestDatabase();

    // Create patterns table
    db.exec(`
      CREATE TABLE IF NOT EXISTS patterns (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK(type IN ('success', 'anti_pattern', 'optimization')),
        confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
        occurrences INTEGER NOT NULL DEFAULT 1,
        pattern_data TEXT NOT NULL,
        source_span_ids TEXT,
        applies_to_agent_type TEXT,
        applies_to_task_type TEXT,
        applies_to_skill TEXT,
        first_observed DATETIME NOT NULL,
        last_observed DATETIME NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    repo = new PatternRepository(db);
  });

  it('should record pattern', async () => {
    const pattern: Pattern = {
      id: uuid(),
      type: 'success',
      confidence: 0.85,
      occurrences: 5,
      pattern_data: {
        conditions: { task_type: 'code_review' },
        recommendations: { approach: 'incremental' },
        expected_improvement: { quality: 0.2 },
        evidence: { sample_size: 10 },
      },
      source_span_ids: ['span1', 'span2'],
      applies_to_agent_type: 'code_reviewer',
      applies_to_task_type: 'code_review',
      first_observed: new Date('2024-01-01'),
      last_observed: new Date('2024-01-10'),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await repo.recordPattern(pattern);

    const retrieved = await repo.getPattern(pattern.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(pattern.id);
    expect(retrieved?.type).toBe('success');
    expect(retrieved?.confidence).toBe(0.85);
    expect(retrieved?.occurrences).toBe(5);
    expect(retrieved?.applies_to_agent_type).toBe('code_reviewer');
  });

  it('should get pattern by id', async () => {
    const pattern: Pattern = {
      id: uuid(),
      type: 'anti_pattern',
      confidence: 0.7,
      occurrences: 3,
      pattern_data: {
        conditions: {},
        recommendations: {},
        expected_improvement: {},
        evidence: { sample_size: 5 },
      },
      source_span_ids: ['span1'],
      first_observed: new Date(),
      last_observed: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await repo.recordPattern(pattern);
    const retrieved = await repo.getPattern(pattern.id);

    expect(retrieved).toEqual(expect.objectContaining({
      id: pattern.id,
      type: 'anti_pattern',
      confidence: 0.7,
      occurrences: 3,
    }));
  });

  it('should return null for non-existent pattern', async () => {
    const pattern = await repo.getPattern('non-existent');
    expect(pattern).toBeNull();
  });

  it('should query patterns with filters', async () => {
    // Create multiple patterns
    const pattern1: Pattern = {
      id: uuid(),
      type: 'success',
      confidence: 0.9,
      occurrences: 10,
      pattern_data: {
        conditions: {},
        recommendations: {},
        expected_improvement: {},
        evidence: { sample_size: 10 },
      },
      source_span_ids: ['span1', 'span2'],
      applies_to_task_type: 'code_review',
      first_observed: new Date(),
      last_observed: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const pattern2: Pattern = {
      id: uuid(),
      type: 'optimization',
      confidence: 0.6,
      occurrences: 2,
      pattern_data: {
        conditions: {},
        recommendations: {},
        expected_improvement: {},
        evidence: { sample_size: 2 },
      },
      source_span_ids: ['span3'],
      applies_to_task_type: 'refactoring',
      first_observed: new Date(),
      last_observed: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await repo.recordPattern(pattern1);
    await repo.recordPattern(pattern2);

    // Query by type
    const successPatterns = await repo.queryPatterns({ type: 'success' });
    expect(successPatterns).toHaveLength(1);
    expect(successPatterns[0].type).toBe('success');

    // Query by confidence range
    const highConfidence = await repo.queryPatterns({ min_confidence: 0.8 });
    expect(highConfidence).toHaveLength(1);
    expect(highConfidence[0].confidence).toBeGreaterThanOrEqual(0.8);

    // Query with limit
    const limited = await repo.queryPatterns({ limit: 1 });
    expect(limited).toHaveLength(1);
  });

  it('should update pattern', async () => {
    const pattern: Pattern = {
      id: uuid(),
      type: 'success',
      confidence: 0.5,
      occurrences: 1,
      pattern_data: {
        conditions: {},
        recommendations: {},
        expected_improvement: {},
        evidence: { sample_size: 1 },
      },
      source_span_ids: ['span1'],
      first_observed: new Date(),
      last_observed: new Date(),
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    };

    await repo.recordPattern(pattern);

    // Update confidence and occurrences
    await repo.updatePattern(pattern.id, {
      confidence: 0.95,
      occurrences: 10,
    });

    const updated = await repo.getPattern(pattern.id);
    expect(updated?.confidence).toBe(0.95);
    expect(updated?.occurrences).toBe(10);
  });
});
