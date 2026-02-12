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

${chalk.bold('Additional Features')}

${chalk.dim('Knowledge:')}                 memesh-create-entities
${chalk.dim('Error Recording:')}           memesh-record-mistake

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
${chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

${chalk.bold.yellow('📋 Core Commands')}
  ${chalk.cyan('buddy-do')} <task>           Execute tasks with memory context
  ${chalk.cyan('buddy-remember')} <query>    Recall project memory & decisions
  ${chalk.cyan('buddy-help')} [command]      Show this help or command-specific help
  ${chalk.cyan('buddy-record-mistake')}      Record AI mistakes for learning

  ${chalk.dim('Aliases:')}
    ${chalk.dim('do:')} help-with, execute, run, task
    ${chalk.dim('remember:')} recall, retrieve, search, find

${chalk.bold.yellow('🧠 Knowledge Graph')}
  ${chalk.cyan('memesh-memesh-create-entities')}    Record decisions, features, lessons learned

  ${chalk.dim('Entity types:')} decision, feature, bug_fix, lesson_learned
  ${chalk.dim('Auto-tags:')} scope:project:*, tech:* added automatically

${chalk.bold.yellow('📖 Examples')}
  ${chalk.green('# Task Execution')}
  ${chalk.green('❯')} buddy-do "setup authentication"
  ${chalk.green('❯')} buddy-remember "why JWT over sessions"

  ${chalk.green('# Knowledge')}
  ${chalk.green('❯')} memesh-create-entities entities=[{name:"JWT Auth",type:"decision",...}]

${chalk.bold.yellow('🛠️  Configuration')}
  ${chalk.cyan('memesh setup')}              Interactive configuration wizard
  ${chalk.cyan('memesh config show')}        View current configuration
  ${chalk.cyan('memesh config validate')}    Test MCP connection

${chalk.bold.yellow('📚 Learning Resources')}
  ${chalk.cyan('memesh tutorial')}           Interactive 5-minute tutorial
  ${chalk.cyan('memesh dashboard')}          Session health dashboard
  ${chalk.cyan('memesh stats')}              Usage statistics
  ${chalk.cyan('buddy-help')} <command>      Detailed command help

${chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}
${chalk.dim('🔗 Links:')} https://github.com/PCIRCLE-AI/claude-code-buddy
${chalk.dim('📖 Docs:')} https://github.com/PCIRCLE-AI/claude-code-buddy/blob/main/docs/USER_GUIDE.md
`;
    }
    static getCommandHelp(command) {
        const commandHelpers = {
            do: () => this.getDoCommandHelp(),
            remember: () => this.getRememberCommandHelp(),
            help: () => this.getHelpCommandHelp(),
            knowledge: () => this.getKnowledgeHelp(),
            health: () => this.getHealthHelp(),
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
  📖 User Guide:    https://github.com/PCIRCLE-AI/claude-code-buddy/blob/main/docs/USER_GUIDE.md
  🚀 Quick Start:   https://github.com/PCIRCLE-AI/claude-code-buddy#quick-start
  💬 Discussions:   github.com/PCIRCLE-AI/claude-code-buddy
`;
        return boxen(content, {
            padding: 1,
            borderColor: 'cyan',
            borderStyle: 'round',
        });
    }
    static getKnowledgeHelp() {
        const content = `
${chalk.bold.cyan('Knowledge Graph')} - Project Memory System

${chalk.dim('Description:')}
Record decisions, features, lessons, and bugs in a structured
knowledge graph. MeMesh automatically tracks relationships and
provides powerful search capabilities.

${chalk.bold('📋 Available Tools:')}

${chalk.cyan('memesh-create-entities')} entities
  Create one or more entities in the knowledge graph

${chalk.cyan('buddy-remember')} query [limit]
  Search and recall stored knowledge

${chalk.bold('🏗️ Entity Structure:')}

${chalk.yellow('name:')} Unique identifier (searchable)
  ${chalk.dim('Format:')} Use imperative or declarative
  ${chalk.dim('Examples:')} "Use Redis for caching", "JWT auth implementation"

${chalk.yellow('entityType:')} Category of entity
  ${chalk.dim('Types:')} decision, feature, bug_fix, lesson_learned, pattern

${chalk.yellow('observations:')} Array of facts/notes
  ${chalk.dim('Format:')} One fact per observation
  ${chalk.dim('Include:')} WHY (rationale), WHAT (impl), HOW (approach)

${chalk.yellow('tags:')} Array of tags (3-7 recommended)
  ${chalk.dim('Format:')} lowercase, hyphens for multi-word
  ${chalk.dim('Examples:')} "tech:postgresql", "domain:auth", "pattern:repository"

${chalk.bold('📝 Examples:')}

${chalk.green('# Record a technical decision')}
${chalk.green('❯')} memesh-create-entities entities='[{
  "name": "Use JWT for API authentication",
  "entityType": "decision",
  "observations": [
    "Rationale: Stateless auth enables horizontal scaling",
    "Implementation: jsonwebtoken library with RS256",
    "Security: Tokens expire 1hr, refresh tokens 7 days",
    "Files: src/auth/jwt.ts, middleware/authenticate.ts"
  ],
  "tags": ["tech:jwt", "domain:authentication", "security"]
}]'

${chalk.green('# Record a lesson learned')}
${chalk.green('❯')} memesh-create-entities entities='[{
  "name": "Always validate user input before DB queries",
  "entityType": "lesson_learned",
  "observations": [
    "Problem: SQL injection vulnerability in search endpoint",
    "Root cause: Direct string concatenation in query",
    "Solution: Use parameterized queries with prepared statements",
    "Prevention: Added input validation middleware"
  ],
  "tags": ["security", "database", "best-practice"]
}]'

${chalk.green('# Record a feature implementation')}
${chalk.green('❯')} memesh-create-entities entities='[{
  "name": "Dark mode implementation",
  "entityType": "feature",
  "observations": [
    "Approach: CSS variables + localStorage persistence",
    "Components: ThemeProvider, useTheme hook",
    "Colors: 16 semantic color tokens",
    "Files: src/theme/, components/ThemeToggle.tsx"
  ],
  "tags": ["tech:react", "frontend", "ux", "theme"]
}]'

${chalk.green('# Recall stored knowledge')}
${chalk.green('❯')} buddy-remember "authentication decisions" limit=5
${chalk.dim('→')} Found 3 relevant memories:
    1. Use JWT for API authentication
    2. OAuth2 for third-party login
    3. Session management with Redis

${chalk.bold('💡 Best Practices:')}
• Name entities clearly and searchably
• Include rationale (WHY) in observations
• Add relevant tags for discoverability
• Record decisions when made, not later
• Link related entities with shared tags
• Update entities when context changes

${chalk.bold('🏷️ Recommended Tag Patterns:')}

${chalk.yellow('Technology:')} tech:postgresql, tech:react, tech:nodejs
${chalk.yellow('Domain:')} domain:auth, domain:api, domain:frontend
${chalk.yellow('Pattern:')} pattern:repository, pattern:factory
${chalk.yellow('Concern:')} security, performance, scalability
${chalk.yellow('Status:')} deprecated, experimental, stable

${chalk.bold('🔍 Search Tips:')}
• Natural language: "why did we choose PostgreSQL"
• By tag: "tech:react AND domain:frontend"
• Recent changes: "recent authentication updates"
• Problem-solution: "how we fixed login bug"
`;
        return boxen(content, {
            padding: 1,
            borderColor: 'cyan',
            borderStyle: 'round',
        });
    }
    static getHealthHelp() {
        const content = `
${chalk.bold.cyan('Health Monitoring')} - Coming Soon

${chalk.dim('Description:')}
Health monitoring will be available through MeMesh Cloud integration.

${chalk.bold('📋 Planned Features:')}

• Session health tracking
• Token usage monitoring
• Quality metrics dashboard
• Workflow guidance
• Error rate analysis

${chalk.bold('💡 Current Status:')}

Health monitoring features are planned for future MeMesh Cloud integration.
For now, monitor your development progress through:
• Console logs
• Task completion status
• Test results
• Code review feedback

${chalk.bold('📖 Learn More:')}

Visit https://github.com/PCIRCLE-AI/claude-code-buddy for updates.
`;
        return boxen(content, {
            padding: 1,
            borderColor: 'cyan',
            borderStyle: 'round',
        });
    }
}
//# sourceMappingURL=BuddyCommands.js.map