import type { ComplianceRule, RuleContext, ToolCallRecord } from '../types.js';

export class ReadBeforeEditRule implements ComplianceRule {
  readonly id = 'READ_BEFORE_EDIT';
  readonly name = 'Read Before Edit';
  readonly description = 'Agent must read a file before editing it';
  readonly severity = 'critical' as const;
  readonly action = 'block' as const;

  validate(toolCall: ToolCallRecord, context: RuleContext): string | undefined {
    // Only applies to Edit tool calls
    if (toolCall.toolName !== 'Edit') {
      return undefined;
    }

    const targetFile = toolCall.args.file_path;
    if (!targetFile) {
      return undefined; // No file path to validate
    }

    // Check if agent has read this file recently
    const hasRead = context.recentToolCalls.some(
      call => call.toolName === 'Read' && call.args.file_path === targetFile
    );

    if (!hasRead) {
      return `READ_BEFORE_EDIT violation: Agent attempted to edit "${targetFile}" without reading it first. Must use Read tool before Edit.`;
    }

    return undefined; // No violation
  }
}
