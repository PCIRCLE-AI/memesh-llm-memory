// src/compliance/rules/RunBeforeClaimRule.ts
import type { ComplianceRule, RuleContext, ToolCallRecord } from '../types.js';

export class RunBeforeClaimRule implements ComplianceRule {
  readonly id = 'RUN_BEFORE_CLAIM';
  readonly name = 'Run Before Claim';
  readonly description = 'Agent must run commands/tests before claiming success';
  readonly severity = 'critical' as const;
  readonly action = 'block' as const;

  private readonly SUCCESS_CLAIM_KEYWORDS = [
    'test',
    'passed',
    'successful',
    'success',
    'build',
    'completed',
    'no error',
    'all checks',
    '✓',
    '✅',
  ];

  private readonly EXECUTION_TOOLS = ['Bash', 'Execute', 'Run'];

  validate(toolCall: ToolCallRecord, context: RuleContext): string | undefined {
    // Only check message-sending tool calls
    if (toolCall.toolName !== 'SendMessage') {
      return undefined;
    }

    const message = toolCall.args.message?.toLowerCase() || '';

    // Check if message claims success
    const isSuccessClaim = this.SUCCESS_CLAIM_KEYWORDS.some(keyword =>
      message.includes(keyword.toLowerCase())
    );

    if (!isSuccessClaim) {
      return undefined; // Not claiming success
    }

    // Check if agent has executed commands recently
    const hasExecuted = context.recentToolCalls.some(
      call => this.EXECUTION_TOOLS.includes(call.toolName)
    );

    if (!hasExecuted) {
      return `RUN_BEFORE_CLAIM violation: Agent claimed success ("${toolCall.args.message}") without executing commands/tests. Must run verification before claiming success.`;
    }

    return undefined; // No violation
  }
}
