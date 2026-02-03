import chalk from 'chalk';
import boxen from 'boxen';
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
    ]);
    static VALID_COMMANDS = new Set([
        'do',
        'remember',
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
    static getHelp(command, options = {}) {
        if (!command) {
            return options.full ? this.getFullHelp() : this.getQuickStartHelp();
        }
        return this.getCommandHelp(command);
    }
    static getQuickStartHelp() {
        const content = `
${chalk.bold.cyan('🤖 MeMesh Quick Start')}

${chalk.bold('Essential Commands')}

${chalk.cyan('┌────────────────────────────────────────────┐')}
${chalk.cyan('│')} ${chalk.bold('buddy-do "<task>"')}                          ${chalk.cyan('│')}
${chalk.cyan('│')} Execute any development task               ${chalk.cyan('│')}
${chalk.cyan('└────────────────────────────────────────────┘')}
${chalk.green('❯')} buddy-do "add user authentication"
${chalk.dim('→')} Routes to backend-developer, creates auth system

${chalk.cyan('┌────────────────────────────────────────────┐')}
${chalk.cyan('│')} ${chalk.bold('buddy-remember "<query>"')}                    ${chalk.cyan('│')}
${chalk.cyan('│')} Recall project decisions and patterns      ${chalk.cyan('│')}
${chalk.cyan('└────────────────────────────────────────────┘')}
${chalk.green('❯')} buddy-remember "api design approach"
${chalk.dim('→')} Searches knowledge graph, shows past decisions

${chalk.yellow('💡 New to MeMesh?')}
Run: ${chalk.cyan('memesh tutorial')} (5 min guided intro)

${chalk.dim('📖 Full reference:')} buddy-help --all
${chalk.dim('   Specific command:')} buddy-help do
`;
        return boxen(content, {
            padding: 1,
            borderColor: 'cyan',
            borderStyle: 'round',
        });
    }
    static getFullHelp() {
        return `
${chalk.bold.cyan('MeMesh Complete Command Reference')}

${chalk.bold('Commands:')}
  ${chalk.cyan('buddy-do')} <task>        Execute tasks with smart routing
  ${chalk.cyan('buddy-remember')} <query> Recall project memory
  ${chalk.cyan('buddy-help')} [command]   Show this help or command-specific help

${chalk.bold('Aliases:')}
  do:       help-with, execute, run, task
  remember: recall, retrieve, search, find

${chalk.bold('Examples:')}
  ${chalk.green('❯')} buddy-do "setup authentication"
  ${chalk.green('❯')} buddy-remember "api design decisions"
  ${chalk.green('❯')} buddy-help do

${chalk.bold('Configuration:')}
  ${chalk.cyan('memesh setup')}           Interactive configuration wizard
  ${chalk.cyan('memesh config show')}     View current configuration
  ${chalk.cyan('memesh config validate')} Test MCP connection

${chalk.bold('Additional Commands:')}
  ${chalk.cyan('memesh tutorial')}        Interactive 5-minute tutorial
  ${chalk.cyan('memesh dashboard')}       Session health dashboard
  ${chalk.cyan('memesh stats')}           Usage statistics
  ${chalk.cyan('memesh report-issue')}    Report a bug or issue

${chalk.dim('For more info:')} https://github.com/PCIRCLE-AI/claude-code-buddy
${chalk.dim('Documentation:')} https://memesh.pcircle.ai
`;
    }
    static getCommandHelp(command) {
        const commandHelpers = {
            do: () => this.getDoCommandHelp(),
            remember: () => this.getRememberCommandHelp(),
            help: () => this.getHelpCommandHelp(),
        };
        const helper = commandHelpers[command];
        return helper ? helper() : this.getQuickStartHelp();
    }
    static getDoCommandHelp() {
        const content = `
${chalk.bold.cyan('buddy-do')} - Execute Development Tasks

${chalk.dim('Description:')}
Execute any development task with intelligent routing.
MeMesh analyzes complexity and routes to the best capability.

${chalk.bold('Usage:')}
  buddy-do "<task description>"

${chalk.bold('📝 Examples:')}

${chalk.green('❯')} ${chalk.cyan('buddy-do "add user authentication"')}
${chalk.dim('→')} Creates JWT auth system with tests
${chalk.dim('   Files:')} src/auth/jwt.ts, tests/auth/jwt.test.ts
${chalk.dim('   Agent:')} backend-developer

${chalk.green('❯')} ${chalk.cyan('buddy-do "refactor user service"')}
${chalk.dim('→')} Analyzes code, suggests improvements
${chalk.dim('   Agent:')} refactoring-specialist

${chalk.green('❯')} ${chalk.cyan('buddy-do "fix login bug"')}
${chalk.dim('→')} Debugs issue, provides fix
${chalk.dim('   Agent:')} debugger

${chalk.bold('💡 Pro Tips:')}
• Be specific: "add JWT authentication" > "add auth"
• Include context: "refactor user service for better testability"
• Ask follow-ups: Use buddy-remember to recall decisions

${chalk.bold('Common Tasks:')}
  Setup:        "setup project structure"
  Features:     "add dark mode toggle"
  Refactoring:  "extract auth logic to service"
  Debugging:    "fix memory leak in socket handler"
  Testing:      "add unit tests for auth service"
`;
        return boxen(content, {
            padding: 1,
            borderColor: 'cyan',
            borderStyle: 'round',
        });
    }
    static getRememberCommandHelp() {
        const content = `
${chalk.bold.cyan('buddy-remember')} - Recall Project Memory

${chalk.dim('Description:')}
Search your project's knowledge graph for past decisions,
patterns, and context. MeMesh remembers everything.

${chalk.bold('Usage:')}
  buddy-remember "<query>"

${chalk.bold('📝 Examples:')}

${chalk.green('❯')} ${chalk.cyan('buddy-remember "api design decisions"')}
${chalk.dim('→')} Shows: REST vs GraphQL choice, auth approach
${chalk.dim('   Found:')} 3 decisions from last 2 weeks

${chalk.green('❯')} ${chalk.cyan('buddy-remember "database schema"')}
${chalk.dim('→')} Recalls: Table structure, relations, migrations
${chalk.dim('   Context:')} User, Post, Comment entities

${chalk.green('❯')} ${chalk.cyan('buddy-remember "why JWT"')}
${chalk.dim('→')} Explains: Reasoning behind authentication choice
${chalk.dim('   Decision date:')} 2026-01-15

${chalk.bold('💡 Pro Tips:')}
• Use natural language: "why did we choose X?"
• Search by topic: "authentication", "database"
• Time-based queries: "recent api changes"
• Combine with do: Remember first, then implement

${chalk.bold('What Gets Remembered:')}
  ✓ Technical decisions and rationale
  ✓ Architecture patterns and approaches
  ✓ Code structure and organization
  ✓ Library/framework choices
  ✓ Problem solutions and workarounds

${chalk.dim('Aliases:')} recall, retrieve, search, find
`;
        return boxen(content, {
            padding: 1,
            borderColor: 'cyan',
            borderStyle: 'round',
        });
    }
    static getHelpCommandHelp() {
        const content = `
${chalk.bold.cyan('buddy-help')} - Get Help and Documentation

${chalk.dim('Description:')}
Show help for all commands or specific command details.

${chalk.bold('Usage:')}
  buddy-help              Show quick start guide
  buddy-help --all        Show complete reference
  buddy-help <command>    Show command-specific help

${chalk.bold('📝 Examples:')}

${chalk.green('❯')} ${chalk.cyan('buddy-help')}
${chalk.dim('→')} Shows essential commands (quick start)

${chalk.green('❯')} ${chalk.cyan('buddy-help --all')}
${chalk.dim('→')} Complete command reference

${chalk.green('❯')} ${chalk.cyan('buddy-help do')}
${chalk.dim('→')} Detailed help for buddy-do command

${chalk.bold('💡 Learning Resources:')}

  ${chalk.cyan('memesh tutorial')}    Interactive 5-minute intro
  ${chalk.cyan('memesh dashboard')}   View session health
  ${chalk.cyan('memesh stats')}       Your usage statistics

${chalk.bold('Documentation:')}
  📖 User Guide:    https://memesh.pcircle.ai/guide
  🚀 Quick Start:   https://memesh.pcircle.ai/quick-start
  💬 Discussions:   github.com/PCIRCLE-AI/claude-code-buddy
`;
        return boxen(content, {
            padding: 1,
            borderColor: 'cyan',
            borderStyle: 'round',
        });
    }
}
//# sourceMappingURL=BuddyCommands.js.map