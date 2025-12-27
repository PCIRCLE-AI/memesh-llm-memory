// src/compliance/rules/RunBeforeClaimRule.test.ts
import { describe, it, expect } from 'vitest';
import { RunBeforeClaimRule } from './RunBeforeClaimRule.js';
import type { RuleContext, ToolCallRecord } from '../types.js';

describe('RunBeforeClaimRule', () => {
  const rule = new RunBeforeClaimRule();

  it('should detect claiming success without running tests', () => {
    const claimCall: ToolCallRecord = {
      agentId: 'agent-1',
      toolName: 'SendMessage',
      args: {
        message: 'All tests passed! ✓',
        type: 'success_claim'
      },
      timestamp: new Date(),
    };

    const context: RuleContext = {
      agentId: 'agent-1',
      recentToolCalls: [
        {
          agentId: 'agent-1',
          toolName: 'Edit',
          args: { file_path: 'src/test.ts' },
          timestamp: new Date(Date.now() - 2000),
        }
      ],
    };

    const violation = rule.validate(claimCall, context);

    expect(violation).toBeDefined();
    expect(violation).toContain('RUN_BEFORE_CLAIM');
  });

  it('should allow claiming success after running command', () => {
    const bashCall: ToolCallRecord = {
      agentId: 'agent-1',
      toolName: 'Bash',
      args: { command: 'npm test' },
      timestamp: new Date(Date.now() - 1000),
    };

    const claimCall: ToolCallRecord = {
      agentId: 'agent-1',
      toolName: 'SendMessage',
      args: {
        message: 'Tests passed',
        type: 'success_claim'
      },
      timestamp: new Date(),
    };

    const context: RuleContext = {
      agentId: 'agent-1',
      recentToolCalls: [bashCall],
    };

    const violation = rule.validate(claimCall, context);

    expect(violation).toBeUndefined();
  });

  it('should detect test claim keywords', () => {
    const keywords = [
      'tests passed',
      'build successful',
      'all checks passed',
      'no errors found',
      '34/34 passed',
    ];

    keywords.forEach(keyword => {
      const call: ToolCallRecord = {
        agentId: 'agent-1',
        toolName: 'SendMessage',
        args: { message: keyword },
        timestamp: new Date(),
      };

      const context: RuleContext = {
        agentId: 'agent-1',
        recentToolCalls: [],
      };

      const violation = rule.validate(call, context);
      expect(violation).toBeDefined();
    });
  });

  it('should have correct metadata', () => {
    expect(rule.id).toBe('RUN_BEFORE_CLAIM');
    expect(rule.severity).toBe('critical');
    expect(rule.action).toBe('block');
  });
});
