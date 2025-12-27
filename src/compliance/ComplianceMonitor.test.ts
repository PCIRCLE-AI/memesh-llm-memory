// src/compliance/ComplianceMonitor.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { ComplianceMonitor } from './ComplianceMonitor.js';
import { ReadBeforeEditRule } from './rules/ReadBeforeEditRule.js';
import { RunBeforeClaimRule } from './rules/RunBeforeClaimRule.js';

describe('ComplianceMonitor', () => {
  let monitor: ComplianceMonitor;

  beforeEach(() => {
    monitor = new ComplianceMonitor({
      rules: [
        new ReadBeforeEditRule(),
        new RunBeforeClaimRule(),
      ],
    });
  });

  it('should detect READ_BEFORE_EDIT violation', () => {
    const result = monitor.checkToolCall('agent-1', 'Edit', {
      file_path: '/test.ts',
      old_string: 'foo',
      new_string: 'bar',
    });

    expect(result.allowed).toBe(false);
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0].rule.id).toBe('READ_BEFORE_EDIT');
    expect(result.violations[0].severity).toBe('critical');
  });

  it('should allow Edit after Read', () => {
    monitor.checkToolCall('agent-1', 'Read', { file_path: '/test.ts' });

    const result = monitor.checkToolCall('agent-1', 'Edit', {
      file_path: '/test.ts',
      old_string: 'foo',
      new_string: 'bar',
    });

    expect(result.allowed).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('should track violations per agent', () => {
    monitor.checkToolCall('agent-1', 'Edit', { file_path: '/a.ts' });
    monitor.checkToolCall('agent-2', 'Edit', { file_path: '/b.ts' });

    const stats1 = monitor.getStats('agent-1');
    const stats2 = monitor.getStats('agent-2');

    expect(stats1.totalViolations).toBe(1);
    expect(stats2.totalViolations).toBe(1);
  });

  it('should calculate compliance rate', () => {
    // 1 violation
    monitor.checkToolCall('agent-1', 'Edit', { file_path: '/test.ts' });

    // 2 successful calls
    monitor.checkToolCall('agent-1', 'Read', { file_path: '/test.ts' });
    monitor.checkToolCall('agent-1', 'Edit', { file_path: '/test.ts' });

    const stats = monitor.getStats('agent-1');

    expect(stats.complianceRate).toBeCloseTo(0.67, 2); // 2/3 = 0.67
  });

  it('should enforce "block" action', () => {
    const result = monitor.checkToolCall('agent-1', 'Edit', {
      file_path: '/test.ts',
    });

    expect(result.allowed).toBe(false);
    expect(result.action).toBe('block');
  });

  it('should get recent tool calls', () => {
    monitor.checkToolCall('agent-1', 'Read', { file_path: '/a.ts' });
    monitor.checkToolCall('agent-1', 'Edit', { file_path: '/a.ts' });
    monitor.checkToolCall('agent-1', 'Read', { file_path: '/b.ts' });

    const recent = monitor.getRecentToolCalls('agent-1', 2);

    expect(recent).toHaveLength(2);
    expect(recent[1].toolName).toBe('Read');
    expect(recent[1].args.file_path).toBe('/b.ts');
  });
});
