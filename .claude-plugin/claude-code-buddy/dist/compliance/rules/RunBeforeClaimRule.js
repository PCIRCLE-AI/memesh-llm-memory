export class RunBeforeClaimRule {
    id = 'RUN_BEFORE_CLAIM';
    name = 'Run Before Claim';
    description = 'Agent must run commands/tests before claiming success';
    severity = 'critical';
    action = 'block';
    SUCCESS_CLAIM_KEYWORDS = [
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
    EXECUTION_TOOLS = ['Bash', 'Execute', 'Run'];
    validate(toolCall, context) {
        if (toolCall.toolName !== 'SendMessage') {
            return undefined;
        }
        const message = toolCall.args.message?.toLowerCase() || '';
        const isSuccessClaim = this.SUCCESS_CLAIM_KEYWORDS.some(keyword => message.includes(keyword.toLowerCase()));
        if (!isSuccessClaim) {
            return undefined;
        }
        const hasExecuted = context.recentToolCalls.some(call => this.EXECUTION_TOOLS.includes(call.toolName));
        if (!hasExecuted) {
            return `RUN_BEFORE_CLAIM violation: Agent claimed success ("${toolCall.args.message}") without executing commands/tests. Must run verification before claiming success.`;
        }
        return undefined;
    }
}
//# sourceMappingURL=RunBeforeClaimRule.js.map