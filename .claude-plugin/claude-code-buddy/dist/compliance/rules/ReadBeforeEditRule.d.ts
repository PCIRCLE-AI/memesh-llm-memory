import type { ComplianceRule, RuleContext, ToolCallRecord } from '../types.js';
export declare class ReadBeforeEditRule implements ComplianceRule {
    readonly id = "READ_BEFORE_EDIT";
    readonly name = "Read Before Edit";
    readonly description = "Agent must read a file before editing it";
    readonly severity: "critical";
    readonly action: "block";
    validate(toolCall: ToolCallRecord, context: RuleContext): string | undefined;
}
//# sourceMappingURL=ReadBeforeEditRule.d.ts.map