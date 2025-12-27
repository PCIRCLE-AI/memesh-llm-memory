import { describe, it, expect } from 'vitest';
import { ReadBeforeEditRule } from './ReadBeforeEditRule.js';
import type { RuleContext, ToolCallRecord } from '../types.js';

describe('ReadBeforeEditRule', () => {
  const rule = new ReadBeforeEditRule();

  it('should detect Edit without prior Read', () => {
    const toolCall: ToolCallRecord = {
      agentId: 'agent-1',
      toolName: 'Edit',
      args: { file_path: '/test/file.ts', old_string: 'foo', new_string: 'bar' },
      timestamp: new Date(),
    };

    const context: RuleContext = {
      agentId: 'agent-1',
      recentToolCalls: [],
    };

    const violation = rule.validate(toolCall, context);

    expect(violation).toBeDefined();
    expect(violation).toContain('READ_BEFORE_EDIT');
    expect(violation).toContain('/test/file.ts');
  });

  it('should allow Edit after Read of same file', () => {
    const readCall: ToolCallRecord = {
      agentId: 'agent-1',
      toolName: 'Read',
      args: { file_path: '/test/file.ts' },
      timestamp: new Date(Date.now() - 1000),
    };

    const editCall: ToolCallRecord = {
      agentId: 'agent-1',
      toolName: 'Edit',
      args: { file_path: '/test/file.ts', old_string: 'foo', new_string: 'bar' },
      timestamp: new Date(),
    };

    const context: RuleContext = {
      agentId: 'agent-1',
      recentToolCalls: [readCall],
    };

    const violation = rule.validate(editCall, context);

    expect(violation).toBeUndefined();
  });

  it('should detect Edit of different file than Read', () => {
    const readCall: ToolCallRecord = {
      agentId: 'agent-1',
      toolName: 'Read',
      args: { file_path: '/other/file.ts' },
      timestamp: new Date(Date.now() - 1000),
    };

    const editCall: ToolCallRecord = {
      agentId: 'agent-1',
      toolName: 'Edit',
      args: { file_path: '/test/file.ts', old_string: 'foo', new_string: 'bar' },
      timestamp: new Date(),
    };

    const context: RuleContext = {
      agentId: 'agent-1',
      recentToolCalls: [readCall],
    };

    const violation = rule.validate(editCall, context);

    expect(violation).toBeDefined();
    expect(violation).toContain('/test/file.ts');
  });

  it('should ignore non-Edit tool calls', () => {
    const readCall: ToolCallRecord = {
      agentId: 'agent-1',
      toolName: 'Read',
      args: { file_path: '/test/file.ts' },
      timestamp: new Date(),
    };

    const context: RuleContext = {
      agentId: 'agent-1',
      recentToolCalls: [],
    };

    const violation = rule.validate(readCall, context);

    expect(violation).toBeUndefined();
  });

  it('should have correct metadata', () => {
    expect(rule.id).toBe('READ_BEFORE_EDIT');
    expect(rule.severity).toBe('critical');
    expect(rule.action).toBe('block');
  });
});
