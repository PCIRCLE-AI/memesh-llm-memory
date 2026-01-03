export class BuddyCommands {
    static ALIASES = new Map([
        ['help-with', 'do'],
        ['execute', 'do'],
        ['run', 'do'],
        ['task', 'do'],
        ['recall', 'remember'],
        ['retrieve', 'remember'],
        ['search', 'remember'],
        ['find', 'remember'],
        ['dashboard', 'stats'],
        ['metrics', 'stats'],
        ['performance', 'stats'],
        ['check', 'analyze'],
        ['evaluate', 'analyze'],
        ['assess', 'analyze'],
        ['routing', 'route'],
        ['decide', 'route'],
    ]);
    static VALID_COMMANDS = new Set([
        'do',
        'stats',
        'remember',
        'analyze',
        'route',
        'help',
    ]);
    static parse(input) {
        const originalInput = input;
        let trimmed = input.trim();
        if (trimmed.toLowerCase().startsWith('buddy ')) {
            trimmed = trimmed.slice(6).trim();
        }
        const spaceIndex = trimmed.indexOf(' ');
        let command;
        let args;
        if (spaceIndex === -1) {
            command = trimmed.toLowerCase();
            args = '';
        }
        else {
            command = trimmed.slice(0, spaceIndex).toLowerCase();
            args = trimmed.slice(spaceIndex + 1).trim();
        }
        if (this.ALIASES.has(command)) {
            command = this.ALIASES.get(command);
        }
        if (!this.VALID_COMMANDS.has(command)) {
            command = 'help';
            args = '';
        }
        return {
            command,
            args,
            originalInput,
        };
    }
    static getHelp(command) {
        if (!command) {
            return this.getGeneralHelp();
        }
        const helpTexts = {
            do: `
buddy do <task>

Execute tasks with smart routing. CCB analyzes complexity and routes to:
- Ollama (simple tasks, fast & free)
- Claude (complex tasks, high quality)

Examples:
  buddy do setup authentication
  buddy do refactor user service
  buddy do fix login bug
`,
            stats: `
buddy stats

View performance dashboard showing:
- Token usage and cost savings
- Model routing decisions
- Task completion metrics

Example:
  buddy stats
`,
            remember: `
buddy remember <query>

Recall project memory and decisions. CCB searches your:
- Knowledge graph (entities, relations)
- Project history
- Past decisions

Examples:
  buddy remember api design decisions
  buddy remember authentication approach
  buddy recall database schema
`,
            analyze: `
buddy analyze <task>

Analyze task complexity without executing. Shows:
- Complexity score (1-10)
- Recommended model (Ollama/Claude)
- Estimated tokens
- Routing rationale

Examples:
  buddy analyze setup authentication
  buddy analyze refactor codebase
`,
            route: `
buddy route <query>

Show routing decision for a query. Useful for understanding
how CCB makes routing decisions.

Examples:
  buddy route simple bug fix
  buddy route complex refactoring
`,
            help: `
buddy help [command]

Show help for all commands or a specific command.

Examples:
  buddy help
  buddy help do
  buddy help remember
`,
        };
        return helpTexts[command] || this.getGeneralHelp();
    }
    static getGeneralHelp() {
        return `
Claude Code Buddy (CCB) v2.0 - Your friendly AI companion

Commands:
  buddy do <task>        Execute tasks with smart routing
  buddy stats            View performance dashboard
  buddy remember <query> Recall project memory
  buddy analyze <task>   Analyze task complexity
  buddy route <query>    Show routing decision
  buddy help [command]   Show this help or command-specific help

Aliases:
  do:       help-with, execute, run, task
  remember: recall, retrieve, search, find
  stats:    dashboard, metrics, performance
  analyze:  check, evaluate, assess
  route:    routing, decide

Examples:
  buddy do setup authentication
  buddy stats
  buddy remember api design decisions
  buddy analyze refactor user service

For more info: https://github.com/yourusername/claude-code-buddy
`;
    }
}
//# sourceMappingURL=BuddyCommands.js.map