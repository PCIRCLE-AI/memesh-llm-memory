export class ReadBeforeEditRule {
    id = 'READ_BEFORE_EDIT';
    name = 'Read Before Edit';
    description = 'Agent must read a file before editing it';
    severity = 'critical';
    action = 'block';
    validate(toolCall, context) {
        if (toolCall.toolName !== 'Edit') {
            return undefined;
        }
        const targetFile = toolCall.args.file_path;
        if (!targetFile) {
            return undefined;
        }
        const hasRead = context.recentToolCalls.some(call => call.toolName === 'Read' && call.args.file_path === targetFile);
        if (!hasRead) {
            return `READ_BEFORE_EDIT violation: Agent attempted to edit "${targetFile}" without reading it first. Must use Read tool before Edit.`;
        }
        return undefined;
    }
}
//# sourceMappingURL=ReadBeforeEditRule.js.map