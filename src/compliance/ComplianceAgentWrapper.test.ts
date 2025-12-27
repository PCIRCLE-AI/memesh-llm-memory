// src/compliance/ComplianceAgentWrapper.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplianceAgentWrapper } from './ComplianceAgentWrapper.js';
import { ComplianceMonitor } from './ComplianceMonitor.js';
import { ReadBeforeEditRule } from './rules/ReadBeforeEditRule.js';
import type { CollaborativeAgent } from '../collaboration/types.js';

describe('ComplianceAgentWrapper', () => {
  let mockAgent: CollaborativeAgent;
  let monitor: ComplianceMonitor;
  let wrapper: ComplianceAgentWrapper;

  beforeEach(() => {
    // Create mock agent
    mockAgent = {
      id: 'test-agent',
      name: 'Test Agent',
      type: 'code',
      status: 'idle',
      capabilities: [],
      initialize: vi.fn(),
      shutdown: vi.fn(),
      handleMessage: vi.fn(),
      execute: vi.fn(),
    };

    monitor = new ComplianceMonitor({
      rules: [new ReadBeforeEditRule()],
    });

    wrapper = new ComplianceAgentWrapper(mockAgent, monitor);
  });

  it('should intercept tool calls', async () => {
    const editTool = {
      name: 'Edit',
      args: {
        file_path: '/test.ts',
        old_string: 'foo',
        new_string: 'bar',
      },
    };

    // Should block Edit without Read
    await expect(
      wrapper.executeTool(editTool.name, editTool.args)
    ).rejects.toThrow('READ_BEFORE_EDIT');
  });

  it('should allow compliant tool calls', async () => {
    // First read
    await wrapper.executeTool('Read', { file_path: '/test.ts' });

    // Then edit - should succeed
    await wrapper.executeTool('Edit', {
      file_path: '/test.ts',
      old_string: 'foo',
      new_string: 'bar',
    });

    // No error thrown
    expect(true).toBe(true);
  });

  it('should forward to wrapped agent when compliant', async () => {
    mockAgent.execute = vi.fn().mockResolvedValue({ success: true });

    await wrapper.executeTool('Read', { file_path: '/test.ts' });

    expect(mockAgent.execute).toHaveBeenCalledWith('Read', {
      file_path: '/test.ts',
    });
  });

  it('should expose compliance stats', () => {
    const stats = wrapper.getComplianceStats();

    expect(stats).toBeDefined();
    expect(stats.totalViolations).toBe(0);
    expect(stats.complianceRate).toBe(1.0);
  });

  it('should get violations history', async () => {
    // Cause violation
    try {
      await wrapper.executeTool('Edit', { file_path: '/test.ts' });
    } catch (e) {
      // Expected
    }

    const violations = wrapper.getViolations();

    expect(violations).toHaveLength(1);
    expect(violations[0].rule.id).toBe('READ_BEFORE_EDIT');
  });
});
