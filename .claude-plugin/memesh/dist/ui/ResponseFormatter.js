import chalk from 'chalk';
import Table from 'cli-table3';
import { icons } from './theme.js';
import { ErrorClassifier } from '../errors/ErrorClassifier.js';
import { getOperationDisplayName } from './design-tokens.js';
export class ResponseFormatter {
    MAX_PROMPT_LENGTH = 300;
    MAX_STACK_LENGTH = 500;
    LARGE_RESULT_THRESHOLD = 500;
    errorClassifier;
    constructor() {
        this.errorClassifier = new ErrorClassifier();
    }
    format(response) {
        const complexity = this.detectComplexity(response);
        switch (complexity) {
            case 'simple':
                return this.formatSimple(response);
            case 'medium':
                return this.formatMedium(response);
            case 'complex':
                return this.formatComplex(response);
            default:
                return this.formatComplex(response);
        }
    }
    detectComplexity(response) {
        if (response.error) {
            return 'complex';
        }
        if (response.enhancedPrompt) {
            return 'complex';
        }
        if (response.results) {
            const resultString = this.resultsToString(response.results);
            if (resultString.length > this.LARGE_RESULT_THRESHOLD) {
                return 'complex';
            }
        }
        if (response.results && typeof response.results === 'object' && !Array.isArray(response.results)) {
            return 'medium';
        }
        return 'simple';
    }
    formatSimple(response) {
        return this.formatMinimalHeader(response);
    }
    formatMedium(response) {
        const sections = [];
        sections.push(this.formatMinimalHeader(response));
        sections.push(this.formatDivider());
        if (response.results && response.status === 'success') {
            try {
                sections.push('');
                sections.push(this.formatResults(response.results));
            }
            catch (error) {
                sections.push(chalk.green('Results: [Error formatting results]'));
            }
        }
        const nextSteps = this.generateNextSteps(response);
        if (nextSteps) {
            try {
                sections.push('');
                sections.push(nextSteps);
            }
            catch (error) {
            }
        }
        if (response.metadata) {
            try {
                const metadataStr = this.formatMetadata(response.metadata);
                if (metadataStr) {
                    sections.push('');
                    sections.push(metadataStr);
                }
            }
            catch (error) {
            }
        }
        return sections.join('\n');
    }
    formatComplex(response) {
        const sections = [];
        try {
            sections.push(this.formatHeader(response));
        }
        catch (error) {
            sections.push(chalk.red('[Error formatting header]'));
        }
        try {
            sections.push(this.formatSection(icons.task || '📋', 'Task', response.taskDescription));
        }
        catch (error) {
            sections.push(chalk.gray('Task: [Error formatting description]'));
        }
        if (response.enhancedPrompt) {
            try {
                sections.push(this.formatDivider());
                sections.push(this.formatEnhancedPrompt(response.enhancedPrompt));
            }
            catch (error) {
                sections.push(chalk.magenta('[Error formatting enhanced prompt]'));
            }
        }
        if (response.results && response.status === 'success') {
            try {
                sections.push(this.formatDivider());
                sections.push(this.formatResults(response.results));
            }
            catch (error) {
                sections.push(chalk.green('Results: [Error formatting results]'));
            }
        }
        if (response.error && response.status === 'error') {
            try {
                sections.push(this.formatDivider());
                sections.push(this.formatError(response.error));
            }
            catch (error) {
                sections.push(chalk.red('[Error formatting error details]'));
            }
        }
        const nextSteps = this.generateNextSteps(response);
        if (nextSteps) {
            try {
                sections.push(this.formatDivider());
                sections.push(nextSteps);
            }
            catch (error) {
            }
        }
        if (response.metadata) {
            try {
                const metadataStr = this.formatMetadata(response.metadata);
                if (metadataStr) {
                    sections.push('');
                    sections.push(metadataStr);
                }
            }
            catch (error) {
            }
        }
        if (this.shouldShowAttribution(response)) {
            try {
                sections.push(this.formatAttribution());
            }
            catch (error) {
            }
        }
        return sections.join('\n');
    }
    resultsToString(results) {
        if (typeof results === 'string') {
            return results;
        }
        else if (Array.isArray(results) || typeof results === 'object') {
            return JSON.stringify(results);
        }
        else {
            return String(results);
        }
    }
    shouldShowAttribution(response) {
        if (process.env.SHOW_ATTRIBUTION === 'always') {
            return true;
        }
        const complexity = this.detectComplexity(response);
        return complexity === 'complex';
    }
    formatMinimalHeader(response) {
        const sections = [];
        const operationName = getOperationDisplayName(response.agentType);
        const statusIcon = this.getStatusIcon(response.status);
        const resultSummary = this.getResultSummary(response);
        sections.push(`${statusIcon} ${operationName}`);
        if (resultSummary) {
            sections.push(`  ${resultSummary}`);
        }
        if (response.agentType.startsWith('buddy-')) {
            const newName = response.agentType.replace('buddy-', 'memesh-');
            sections.push('');
            sections.push(chalk.yellow(`⚠ Deprecation Notice`));
            sections.push(chalk.dim(`  ${response.agentType} is deprecated, use ${newName} instead`));
            sections.push(chalk.dim(`  buddy-* commands will be removed in v3.0.0 (2026-08)`));
        }
        return sections.join('\n');
    }
    getResultSummary(response) {
        if (response.status !== 'success' || !response.results) {
            return '';
        }
        const results = response.results;
        if (response.agentType.includes('remember')) {
            if (typeof results === 'object' && 'count' in results) {
                const count = results.count;
                return count > 0
                    ? `Found ${count} ${count === 1 ? 'memory' : 'memories'}`
                    : 'No memories found';
            }
        }
        if (response.agentType.includes('list-agents')) {
            if (typeof results === 'object' && 'agents' in results) {
                const agents = results.agents;
                return `${agents.length} ${agents.length === 1 ? 'agent' : 'agents'} available`;
            }
        }
        if (response.agentType.includes('create-entities')) {
            if (typeof results === 'object' && 'created' in results) {
                const count = results.created;
                return `Created ${count} ${count === 1 ? 'entity' : 'entities'}`;
            }
        }
        if (response.agentType.includes('do')) {
            if (typeof results === 'object' && 'agent' in results) {
                const agent = results.agent;
                return `Routed to ${agent}`;
            }
        }
        return 'Completed successfully';
    }
    formatHeader(response) {
        return this.formatMinimalHeader(response);
    }
    formatTaskDescription(description) {
        return chalk.gray('Task: ') + chalk.white(description);
    }
    formatSection(icon, title, content) {
        const header = `${icon} ${chalk.bold(title)}`;
        return `${header}\n${chalk.white(content)}`;
    }
    formatDivider() {
        return chalk.dim('─'.repeat(60));
    }
    generateNextSteps(response) {
        const suggestions = [];
        if (response.status === 'error' && response.error) {
            suggestions.push('Review the error message and stack trace above');
            suggestions.push('Check recent changes that might have caused this error');
            suggestions.push('Try: buddy-remember "similar errors" to find past solutions');
        }
        if (response.status === 'success') {
            switch (response.agentType) {
                case 'buddy-do':
                    suggestions.push('Verify the implementation meets requirements');
                    suggestions.push('Run tests to ensure nothing broke');
                    suggestions.push('Consider: buddy-remember "this implementation" to store decision');
                    break;
                case 'buddy-remember':
                    const hasResults = response.results &&
                        typeof response.results === 'object' &&
                        'count' in response.results &&
                        response.results.count > 0;
                    if (!hasResults) {
                        suggestions.push('Try a broader search term');
                        suggestions.push('Use buddy-do to create new memories for this topic');
                    }
                    else {
                        suggestions.push('Review the memories above for relevant context');
                        suggestions.push('Apply these learnings to your current task');
                    }
                    break;
            }
        }
        if (suggestions.length === 0) {
            return null;
        }
        const header = `${icons.lightbulb || '💡'} ${chalk.bold.cyan('Next Steps')}`;
        const items = suggestions.map((s, i) => `  ${i + 1}. ${chalk.white(s)}`).join('\n');
        return `${header}\n${items}`;
    }
    formatEnhancedPrompt(prompt) {
        const icon = icons.rocket || '🚀';
        const header = `${chalk.magenta(icon)} ${chalk.bold.magenta('Enhanced Prompt')}`;
        const sections = [header];
        sections.push('');
        sections.push(chalk.bold('System:'));
        sections.push(chalk.white(this.truncateText(prompt.systemPrompt, this.MAX_PROMPT_LENGTH)));
        const guardrails = this.extractGuardrails(prompt.metadata);
        const userPrompt = guardrails
            ? this.stripGuardrails(prompt.userPrompt, guardrails)
            : prompt.userPrompt;
        sections.push('');
        sections.push(chalk.bold('User:'));
        sections.push(chalk.white(this.truncateText(userPrompt, this.MAX_PROMPT_LENGTH)));
        if (guardrails) {
            sections.push('');
            sections.push(chalk.bold.yellow(`${icons.warning || '⚠️'} Guardrails:`));
            sections.push(chalk.white(guardrails));
        }
        if (prompt.suggestedModel) {
            sections.push('');
            sections.push(chalk.dim('Suggested Model: ') + chalk.cyan(prompt.suggestedModel));
        }
        return sections.join('\n');
    }
    extractGuardrails(metadata) {
        if (!metadata || typeof metadata !== 'object') {
            return null;
        }
        const record = metadata;
        return typeof record.guardrails === 'string' ? record.guardrails : null;
    }
    stripGuardrails(userPrompt, guardrails) {
        const index = userPrompt.lastIndexOf(guardrails);
        if (index === -1) {
            return userPrompt;
        }
        return userPrompt.slice(0, index).trimEnd();
    }
    formatResults(results) {
        const icon = icons.success || '✓';
        const header = `${chalk.green(icon)} ${chalk.bold.green('Results')}`;
        const sections = [header];
        if (typeof results === 'string') {
            sections.push(chalk.white(results));
        }
        else if (Array.isArray(results)) {
            sections.push(this.formatArray(results));
        }
        else if (typeof results === 'object' && results !== null) {
            sections.push(this.formatObject(results));
        }
        else {
            sections.push(chalk.white(String(results)));
        }
        return sections.join('\n');
    }
    formatError(error) {
        const classified = this.errorClassifier.classify(error, {});
        const sections = [];
        const errorIcon = icons.error || '❌';
        const header = `${chalk.red(errorIcon)} ${chalk.bold.red(classified.title)}`;
        sections.push(header);
        sections.push('');
        const severityBadge = this.getSeverityBadge(classified.severity);
        sections.push(`${severityBadge} ${chalk.bold(classified.category.toUpperCase())}`);
        sections.push('');
        sections.push(chalk.white(classified.description));
        sections.push('');
        sections.push(chalk.bold('Root Cause:'));
        sections.push(chalk.yellow(`  ${classified.rootCause}`));
        sections.push('');
        if (classified.fixSteps.length > 0) {
            sections.push(chalk.bold('Fix Steps:'));
            classified.fixSteps.forEach((step, i) => {
                sections.push(chalk.white(`  ${i + 1}. ${step}`));
            });
            sections.push('');
        }
        if (classified.autoFixAvailable) {
            sections.push(chalk.cyan(`${icons.lightbulb || '💡'} Auto-fix available!`));
            sections.push(chalk.dim('  Run: buddy-fix --auto'));
            sections.push('');
        }
        if (classified.relatedDocs.length > 0) {
            sections.push(chalk.bold('Related Documentation:'));
            classified.relatedDocs.forEach((doc) => {
                sections.push(chalk.cyan(`  • ${doc.title}: ${chalk.underline(doc.url)}`));
            });
            sections.push('');
        }
        if (classified.relatedCommands.length > 0) {
            sections.push(chalk.bold('Related Commands:'));
            classified.relatedCommands.forEach((cmd) => {
                sections.push(chalk.cyan(`  $ ${cmd}`));
            });
            sections.push('');
        }
        if (classified.troubleshootingTips.length > 0) {
            sections.push(chalk.bold('Troubleshooting Tips:'));
            classified.troubleshootingTips.forEach((tip) => {
                sections.push(chalk.dim(`  • ${tip}`));
            });
            sections.push('');
        }
        if (error.stack && process.env.DEBUG) {
            sections.push(chalk.dim('Stack Trace (DEBUG):'));
            sections.push(chalk.dim(this.truncateText(error.stack, this.MAX_STACK_LENGTH)));
            sections.push('');
        }
        sections.push(chalk.dim('─'.repeat(60)));
        sections.push(chalk.dim('Need more help?'));
        sections.push(chalk.cyan('  $ memesh report-issue'));
        sections.push(chalk.dim('  https://github.com/PCIRCLE-AI/claude-code-buddy/issues'));
        return sections.join('\n');
    }
    getSeverityBadge(severity) {
        switch (severity) {
            case 'critical':
                return chalk.red.bold('[CRITICAL]');
            case 'high':
                return chalk.red('[HIGH]');
            case 'medium':
                return chalk.yellow('[MEDIUM]');
            case 'low':
                return chalk.gray('[LOW]');
            default:
                return chalk.gray('[UNKNOWN]');
        }
    }
    formatMetadata(metadata) {
        const items = [];
        if (metadata?.duration !== undefined) {
            const duration = this.formatDuration(metadata.duration);
            items.push(chalk.dim(`Duration: ${duration}`));
        }
        if (metadata?.tokensUsed !== undefined) {
            const tokens = this.formatNumber(metadata.tokensUsed);
            items.push(chalk.dim(`Tokens: ${tokens}`));
        }
        if (metadata?.model) {
            items.push(chalk.dim(`Model: ${metadata.model}`));
        }
        return items.length > 0 ? chalk.dim(items.join(' • ')) : '';
    }
    formatAttribution() {
        return chalk.gray('─'.repeat(60)) + '\n' +
            chalk.gray('Powered by ') + chalk.bold.cyan('MeMesh') + chalk.gray(' | MCP Server');
    }
    formatArray(arr) {
        if (arr.length === 0) {
            return chalk.gray('(empty array)');
        }
        if (typeof arr[0] === 'object' && arr[0] !== null) {
            return this.formatTable(arr);
        }
        return arr.map((item, i) => `  ${i + 1}. ${String(item)}`).join('\n');
    }
    formatObject(obj) {
        const lines = [];
        for (const [key, value] of Object.entries(obj)) {
            const formattedValue = typeof value === 'object' && value !== null
                ? JSON.stringify(value, null, 2)
                : String(value);
            lines.push(`  ${chalk.gray(key + ':')} ${chalk.white(formattedValue)}`);
        }
        return lines.join('\n');
    }
    formatTable(data) {
        if (data.length === 0)
            return '';
        const keys = Array.from(new Set(data.flatMap(obj => Object.keys(obj))));
        const table = new Table({
            head: keys.map(k => chalk.bold(k)),
            style: {
                head: [],
                border: ['gray'],
            },
        });
        for (const item of data) {
            const row = keys.map(k => {
                const value = item[k];
                if (value === undefined || value === null)
                    return chalk.gray('-');
                if (typeof value === 'object')
                    return chalk.gray('[Object]');
                return String(value);
            });
            table.push(row);
        }
        return table.toString();
    }
    getStatusIcon(status) {
        switch (status) {
            case 'success':
                return chalk.green(icons.success);
            case 'error':
                return chalk.red(icons.error);
            case 'partial':
                return chalk.yellow(icons.warning);
            default:
                return chalk.gray(icons.info);
        }
    }
    getStatusColor(status) {
        switch (status) {
            case 'success':
                return chalk.green;
            case 'error':
                return chalk.red;
            case 'partial':
                return chalk.yellow;
            default:
                return chalk.gray;
        }
    }
    truncateText(text, maxLength) {
        const chars = Array.from(text);
        if (chars.length <= maxLength) {
            return text;
        }
        const truncated = chars.length - maxLength;
        const truncatedChars = this.formatNumber(truncated);
        return chars.slice(0, maxLength).join('') +
            chalk.yellow(`\n... (truncated ${truncatedChars} characters, use --full to see complete output)`);
    }
    formatDuration(ms) {
        if (ms < 1000) {
            return `${ms}ms`;
        }
        else if (ms < 60000) {
            const seconds = Math.round(ms / 100) / 10;
            return `${seconds}s`;
        }
        else {
            const minutes = Math.floor(ms / 60000);
            const seconds = Math.round((ms % 60000) / 1000);
            return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
        }
    }
    formatNumber(num) {
        return num.toLocaleString();
    }
}
//# sourceMappingURL=ResponseFormatter.js.map