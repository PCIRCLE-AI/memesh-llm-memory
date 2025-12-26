import { describe, it, expect } from 'vitest';
import { PatternExplainer } from './PatternExplainer.js';
import type { ContextualPattern } from './types.js';

describe('PatternExplainer', () => {
  const explainer = new PatternExplainer();

  it('should generate explanation for optimization pattern', () => {
    const pattern: ContextualPattern = {
      id: 'p1',
      type: 'optimization',
      description: 'Increase timeout for large PRs',
      confidence: 0.85,
      observations: 12,
      success_rate: 0.92,
      avg_execution_time: 5000,
      last_seen: new Date('2025-01-15').toISOString(),
      context: {
        agent_type: 'code-reviewer',
        task_type: 'review_large_pr',
        complexity: 'high',
      },
    };

    const explanation = explainer.explain(pattern);

    expect(explanation.summary).toContain('code-reviewer');
    expect(explanation.summary).toContain('review_large_pr');
    expect(explanation.reasoning.length).toBeGreaterThan(0);
    expect(explanation.recommendation).toBeDefined();
  });

  it('should generate explanation for anti-pattern', () => {
    const pattern: ContextualPattern = {
      id: 'p2',
      type: 'anti-pattern',
      description: 'Frequent timeout with short timeout setting',
      confidence: 0.9,
      observations: 8,
      success_rate: 0.1,
      avg_execution_time: 1000,
      last_seen: new Date('2025-01-20').toISOString(),
      context: {
        agent_type: 'debugger',
        task_type: 'analyze_error',
        complexity: 'medium',
      },
    };

    const explanation = explainer.explain(pattern);

    expect(explanation.summary).toContain('avoid');
    expect(explanation.confidence_explanation).toContain('90%');
  });

  it('should explain why pattern was learned', () => {
    const pattern: ContextualPattern = {
      id: 'p3',
      type: 'success',
      description: 'Incremental approach works well',
      confidence: 0.75,
      observations: 5,
      success_rate: 0.8,
      avg_execution_time: 2000,
      last_seen: new Date().toISOString(),
      context: { agent_type: 'test-automator' },
    };

    const explanation = explainer.explain(pattern);

    expect(explanation.reasoning).toContainEqual(
      expect.stringContaining('observed 5 times')
    );
    expect(explanation.reasoning).toContainEqual(
      expect.stringContaining('75% confidence')
    );
  });
});
