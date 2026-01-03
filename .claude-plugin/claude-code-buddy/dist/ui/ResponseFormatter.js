import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import { icons } from './theme.js';
export class ResponseFormatter {
    MAX_PROMPT_LENGTH = 300;
    MAX_STACK_LENGTH = 500;
    format(response) {
        const sections = [];
        try {
            sections.push(this.formatHeader(response));
        }
        catch (error) {
            sections.push(chalk.red('[Error formatting header]'));
        }
        try {
            sections.push(this.formatTaskDescription(response.taskDescription));
        }
        catch (error) {
            sections.push(chalk.gray('Task: [Error formatting description]'));
        }
        if (response.enhancedPrompt) {
            try {
                sections.push(this.formatEnhancedPrompt(response.enhancedPrompt));
            }
            catch (error) {
                sections.push(chalk.magenta('[Error formatting enhanced prompt]'));
            }
        }
        if (response.results && response.status === 'success') {
            try {
                sections.push(this.formatResults(response.results));
            }
            catch (error) {
                sections.push(chalk.green('Results: [Error formatting results]'));
            }
        }
        if (response.error && response.status === 'error') {
            try {
                sections.push(this.formatError(response.error));
            }
            catch (error) {
                sections.push(chalk.red('[Error formatting error details]'));
            }
        }
        if (response.metadata) {
            try {
                sections.push(this.formatMetadata(response.metadata));
            }
            catch (error) {
            }
        }
        try {
            sections.push(this.formatAttribution());
        }
        catch (error) {
        }
        return sections.join('\n\n');
    }
    formatHeader(response) {
        const statusIcon = this.getStatusIcon(response.status);
        const statusColor = this.getStatusColor(response.status);
        const agentName = chalk.bold.cyan(response.agentType.toUpperCase());
        const headerText = `${statusIcon} ${agentName} ${statusColor(response.status.toUpperCase())}`;
        return boxen(headerText, {
            padding: { top: 0, bottom: 0, left: 2, right: 2 },
            borderColor: 'cyan',
            borderStyle: 'round',
        });
    }
    formatTaskDescription(description) {
        return chalk.gray('Task: ') + chalk.white(description);
    }
    formatEnhancedPrompt(prompt) {
        const sections = [chalk.bold.magenta('Enhanced Prompt:')];
        sections.push(chalk.gray('System:'));
        sections.push(chalk.white(this.truncateText(prompt.systemPrompt, this.MAX_PROMPT_LENGTH)));
        sections.push(chalk.gray('User:'));
        sections.push(chalk.white(this.truncateText(prompt.userPrompt, this.MAX_PROMPT_LENGTH)));
        if (prompt.suggestedModel) {
            sections.push(chalk.gray('Suggested Model: ') + chalk.cyan(prompt.suggestedModel));
        }
        return sections.join('\n');
    }
    formatResults(results) {
        const sections = [chalk.bold.green('Results:')];
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
        const sections = [chalk.bold.red('Error:')];
        sections.push(chalk.red(`${icons.error} ${error.name}: ${error.message}`));
        if (error.stack) {
            sections.push(chalk.gray('Stack Trace:'));
            sections.push(chalk.gray(this.truncateText(error.stack, this.MAX_STACK_LENGTH)));
        }
        return sections.join('\n');
    }
    formatMetadata(metadata) {
        const items = [];
        if (metadata?.duration !== undefined) {
            const duration = this.formatDuration(metadata.duration);
            items.push(chalk.gray('Duration: ') + chalk.cyan(duration));
        }
        if (metadata?.tokensUsed !== undefined) {
            const tokens = this.formatNumber(metadata.tokensUsed);
            items.push(chalk.gray('Tokens: ') + chalk.cyan(tokens));
        }
        if (metadata?.model) {
            items.push(chalk.gray('Model: ') + chalk.cyan(metadata.model));
        }
        return items.length > 0 ? items.join(' | ') : '';
    }
    formatAttribution() {
        return chalk.gray('─'.repeat(60)) + '\n' +
            chalk.gray('Powered by ') + chalk.bold.cyan('Claude Code Buddy') + chalk.gray(' | MCP Server');
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
        return chars.slice(0, maxLength).join('') + chalk.gray('... (truncated)');
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