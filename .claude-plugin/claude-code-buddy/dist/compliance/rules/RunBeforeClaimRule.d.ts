import type { ComplianceRule, RuleContext, ToolCallRecord } from '../types.js';
export declare class RunBeforeClaimRule implements ComplianceRule {
    readonly id = "RUN_BEFORE_CLAIM";
    readonly name = "Run Before Claim";
    readonly description = "Agent must run commands/tests before claiming success";
    readonly severity: "critical";
    readonly action: "block";
    private readonly SUCCESS_CLAIM_KEYWORDS;
    private readonly EXECUTION_TOOLS;
    validate(toolCall: ToolCallRecord, context: RuleContext): string | undefined;
}
//# sourceMappingURL=RunBeforeClaimRule.d.ts.map