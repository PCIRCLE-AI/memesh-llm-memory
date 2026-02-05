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

${chalk.dim('A2A (Agent-to-Agent):')}     a2a-list-agents, a2a-send-task
${chalk.dim('Secrets:')}                   buddy-secret-store, buddy-secret-get
${chalk.dim('Knowledge:')}                 create-entities
${chalk.dim('Health:')}                    get-session-health

${chalk.yellow('💡 New to MeMesh?')}
Run: ${chalk.cyan('memesh tutorial')} (5 min guided intro)

${chalk.dim('📖 Full reference:')} buddy-help --all
${chalk.dim('   Specific command:')} buddy-help do
${chalk.dim('   Category help:')} buddy-help a2a
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
  ${chalk.cyan('buddy-do')} <task>           Execute tasks with smart routing
  ${chalk.cyan('buddy-remember')} <query>    Recall project memory & decisions
  ${chalk.cyan('buddy-help')} [command]      Show this help or command-specific help
  ${chalk.cyan('buddy-record-mistake')}      Record AI mistakes for learning

  ${chalk.dim('Aliases:')}
    ${chalk.dim('do:')} help-with, execute, run, task
    ${chalk.dim('remember:')} recall, retrieve, search, find

${chalk.bold.yellow('🤝 A2A (Agent-to-Agent) Collaboration')}
  ${chalk.cyan('a2a-list-agents')}           List all available A2A agents
  ${chalk.cyan('a2a-send-task')}             Send task to another agent
  ${chalk.cyan('a2a-get-task')}              Get task status and details
  ${chalk.cyan('a2a-list-tasks')}            List tasks assigned to you
  ${chalk.cyan('a2a-report-result')}         Report task execution result

  ${chalk.dim('Note:')} Your agent ID format: ${chalk.dim('${hostname}-${timestamp}')}
  ${chalk.dim('Find your ID:')} curl -s http://localhost:3000/a2a/agent-card | grep id

${chalk.bold.yellow('🔐 Secrets Management')}
  ${chalk.cyan('buddy-secret-store')}        Securely store API keys/tokens
  ${chalk.cyan('buddy-secret-get')}          Retrieve stored secret
  ${chalk.cyan('buddy-secret-list')}         List all stored secrets (names only)
  ${chalk.cyan('buddy-secret-delete')}       Delete a stored secret

  ${chalk.dim('Encryption:')} AES-256-GCM, stored locally only
  ${chalk.dim('Auto-expiry:')} Default 30 days, configurable

${chalk.bold.yellow('🧠 Knowledge Graph')}
  ${chalk.cyan('create-entities')}           Record decisions, features, lessons learned

  ${chalk.dim('Entity types:')} decision, feature, bug_fix, lesson_learned
  ${chalk.dim('Auto-tags:')} scope:project:*, tech:* added automatically

${chalk.bold.yellow('💊 Workflow & Health')}
  ${chalk.cyan('get-session-health')}        Check token usage & quality metrics
  ${chalk.cyan('get-workflow-guidance')}     Get context-aware workflow suggestions

${chalk.bold.yellow('📖 Examples')}
  ${chalk.green('# Task Execution')}
  ${chalk.green('❯')} buddy-do "setup authentication"
  ${chalk.green('❯')} buddy-remember "why JWT over sessions"

  ${chalk.green('# A2A Collaboration')}
  ${chalk.green('❯')} a2a-list-agents
  ${chalk.green('❯')} a2a-send-task targetAgentId="kts-macbook-abc123" task="analyze logs"

  ${chalk.green('# Secrets')}
  ${chalk.green('❯')} buddy-secret-store name="openai_key" value="sk-..." type="api_key"
  ${chalk.green('❯')} buddy-secret-get name="openai_key"

  ${chalk.green('# Knowledge')}
  ${chalk.green('❯')} create-entities entities=[{name:"JWT Auth",type:"decision",...}]

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
${chalk.dim('📖 Docs:')} https://memesh.pcircle.ai
`;
    }
    static getCommandHelp(command) {
        const commandHelpers = {
            do: () => this.getDoCommandHelp(),
            remember: () => this.getRememberCommandHelp(),
            help: () => this.getHelpCommandHelp(),
            a2a: () => this.getA2AHelp(),
            secrets: () => this.getSecretsHelp(),
            secret: () => this.getSecretsHelp(),
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
    static getA2AHelp() {
        const content = `
${chalk.bold.cyan('A2A (Agent-to-Agent)')} - Multi-Agent Collaboration

${chalk.dim('Description:')}
Enable multiple Claude Code sessions to collaborate and delegate
tasks to each other. Each session runs an independent A2A agent.

${chalk.bold('🔑 Key Concepts:')}

${chalk.yellow('Agent ID Format:')} ${chalk.dim('\${hostname}-\${timestamp}')}
  Example: kts-macbook-ml8cy34o

${chalk.yellow('Check-in Name:')} Display name (e.g., "Lambda")
  ${chalk.dim('Note:')} This is NOT your agent ID!

${chalk.yellow('Find Your Agent ID:')}
  ${chalk.cyan('curl -s http://localhost:3000/a2a/agent-card | grep id')}

${chalk.bold('📋 Available Tools:')}

${chalk.cyan('a2a-list-agents')} [status]
  List all A2A agents in the registry
  ${chalk.dim('Status:')} active | inactive | all

${chalk.cyan('a2a-send-task')} targetAgentId taskDescription [priority]
  Send a task to another agent
  ${chalk.dim('Priority:')} low | normal | high | urgent

${chalk.cyan('a2a-get-task')} targetAgentId taskId
  Get status and details of a specific task

${chalk.cyan('a2a-list-tasks')} [state] [limit]
  List tasks assigned to you
  ${chalk.dim('State:')} SUBMITTED | WORKING | COMPLETED | FAILED

${chalk.cyan('a2a-report-result')} taskId result success
  Report task execution result

${chalk.bold('📝 Examples:')}

${chalk.green('# Discover agents')}
${chalk.green('❯')} a2a-list-agents status="active"
${chalk.dim('→')} Shows all active agents with IDs, ports, heartbeat

${chalk.green('# Send task')}
${chalk.green('❯')} a2a-send-task \\
  targetAgentId="kts-macbook-xyz789" \\
  taskDescription="analyze error logs" \\
  priority="high"
${chalk.dim('→')} Returns task ID for tracking

${chalk.green('# Check task')}
${chalk.green('❯')} a2a-get-task \\
  targetAgentId="kts-macbook-xyz789" \\
  taskId="task_123abc"
${chalk.dim('→')} Shows: WORKING, 60% complete

${chalk.green('# List your tasks')}
${chalk.green('❯')} a2a-list-tasks state="WORKING" limit=10
${chalk.dim('→')} Shows all tasks assigned to you

${chalk.bold('💡 Best Practices:')}
• Always check agent list before sending tasks
• Use meaningful task descriptions
• Set appropriate priority levels
• Monitor task progress with a2a-get-task
• Report results when completed

${chalk.bold('🔧 Troubleshooting:')}

${chalk.yellow('Q:')} Why don't I see my agent in the list?
${chalk.green('A:')} Your agent ID is different from check-in name.
   Run: curl -s http://localhost:3000/a2a/agent-card

${chalk.yellow('Q:')} How do I test A2A locally?
${chalk.green('A:')} Open multiple Claude Code sessions. Each creates
   an independent agent that can collaborate.

${chalk.yellow('Q:')} Agent shows "stale" status?
${chalk.green('A:')} No heartbeat for 5+ minutes. Restart the session.
`;
        return boxen(content, {
            padding: 1,
            borderColor: 'cyan',
            borderStyle: 'round',
        });
    }
    static getSecretsHelp() {
        const content = `
${chalk.bold.cyan('Secrets Management')} - Secure Credential Storage

${chalk.dim('Description:')}
Securely store and retrieve API keys, tokens, and passwords.
Uses AES-256-GCM encryption, stored locally only (never transmitted).

${chalk.bold('📋 Available Tools:')}

${chalk.cyan('buddy-secret-store')} name value type [description] [expiresIn]
  Store a secret securely
  ${chalk.dim('Types:')} api_key | token | password | other
  ${chalk.dim('ExpiresIn:')} "30d" (days), "24h" (hours), "60m" (minutes)

${chalk.cyan('buddy-secret-get')} name
  Retrieve a stored secret (returns decrypted value)

${chalk.cyan('buddy-secret-list')}
  List all secrets (names, types, expiry - NOT values)

${chalk.cyan('buddy-secret-delete')} name
  Permanently delete a secret

${chalk.bold('📝 Examples:')}

${chalk.green('# Store API key')}
${chalk.green('❯')} buddy-secret-store \\
  name="openai_api_key" \\
  value="sk-proj-..." \\
  type="api_key" \\
  description="Production OpenAI key for GPT-4"
${chalk.dim('→')} ✅ Secret stored securely (expires in 30 days)

${chalk.green('# Retrieve secret')}
${chalk.green('❯')} buddy-secret-get name="openai_api_key"
${chalk.dim('→')} sk-proj-xxx... (decrypted value)

${chalk.green('# List all secrets')}
${chalk.green('❯')} buddy-secret-list
${chalk.dim('→')} Shows:
    openai_api_key    | api_key  | Expires: 2026-03-05
    github_token      | token    | Expires: 2026-02-20
    db_password       | password | Expires: 2026-03-01

${chalk.green('# Delete secret')}
${chalk.green('❯')} buddy-secret-delete name="old_api_key"
${chalk.dim('→')} ✅ Secret deleted permanently

${chalk.green('# Store with custom expiry')}
${chalk.green('❯')} buddy-secret-store \\
  name="temp_token" \\
  value="token_abc123" \\
  type="token" \\
  expiresIn="24h"
${chalk.dim('→')} Auto-deletes after 24 hours

${chalk.bold('💡 Best Practices:')}
• Use descriptive names (e.g., "prod_openai_key" not "key1")
• Set appropriate expiry times for temporary credentials
• Rotate keys regularly (delete old, store new)
• Never hardcode secrets in code - always use this system
• Check buddy-secret-list before storing to avoid duplicates

${chalk.bold('🔒 Security:')}
• Encryption: AES-256-GCM (industry standard)
• Storage: Local filesystem only (${chalk.dim('~/.memesh/secrets/')})
• Never transmitted: Secrets stay on your machine
• Auto-cleanup: Expired secrets are automatically deleted

${chalk.bold('🔧 Common Workflows:')}

${chalk.yellow('Key Rotation:')}
  ${chalk.cyan('1.')} buddy-secret-store name="openai_key_new" value="sk-..."
  ${chalk.cyan('2.')} Test with new key
  ${chalk.cyan('3.')} buddy-secret-delete name="openai_key_old"

${chalk.yellow('First-time Setup:')}
  ${chalk.cyan('1.')} buddy-secret-store name="openai_key" value="sk-..." type="api_key"
  ${chalk.cyan('2.')} buddy-secret-store name="github_token" value="ghp_..." type="token"
  ${chalk.cyan('3.')} buddy-secret-list  ${chalk.dim('# Verify stored')}
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

${chalk.cyan('create-entities')} entities
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
${chalk.green('❯')} create-entities entities='[{
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
${chalk.green('❯')} create-entities entities='[{
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
${chalk.green('❯')} create-entities entities='[{
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
${chalk.bold.cyan('Workflow & Health')} - Session Monitoring

${chalk.dim('Description:')}
Monitor session health, track quality metrics, and get
workflow guidance for optimal development practices.

${chalk.bold('📋 Available Tools:')}

${chalk.cyan('get-session-health')}
  Check current session health and metrics

${chalk.cyan('get-workflow-guidance')}
  Get context-aware workflow suggestions

${chalk.bold('📝 Examples:')}

${chalk.green('# Check session health')}
${chalk.green('❯')} get-session-health
${chalk.dim('→')} Session Health Report:

    Token Usage:     45,231 / 200,000 (23%)
    Quality Score:   87 / 100 (Good)
    Tool Calls:      142
    Errors:          3 (2.1% error rate)

    Recommendations:
    • Continue current approach
    • Consider saving checkpoint at 50% tokens

${chalk.green('# Get workflow guidance')}
${chalk.green('❯')} get-workflow-guidance
${chalk.dim('→')} Workflow Guidance:

    Current Phase: Implementation
    Suggested Next: Code Review

    Best Practices:
    ✓ Read files before editing
    ✓ Test after implementation
    ✓ Record decisions in knowledge graph

${chalk.bold('📊 Health Metrics:')}

${chalk.yellow('Token Usage:')} Track API usage and budget
  ${chalk.green('Green:')} < 50% - Plenty of room
  ${chalk.yellow('Yellow:')} 50-80% - Monitor usage
  ${chalk.red('Red:')} > 80% - Consider checkpoint

${chalk.yellow('Quality Score:')} Code quality indicators
  ${chalk.dim('Factors:')} Test coverage, error handling, documentation
  ${chalk.green('Good:')} 80-100
  ${chalk.yellow('Fair:')} 60-79
  ${chalk.red('Poor:')} < 60

${chalk.yellow('Error Rate:')} Tool call success rate
  ${chalk.green('Excellent:')} < 5%
  ${chalk.yellow('Normal:')} 5-15%
  ${chalk.red('High:')} > 15% (investigate)

${chalk.bold('💡 Best Practices:')}
• Check health every 30-60 minutes
• Save checkpoint before major changes
• Address quality issues proactively
• Use workflow guidance for complex tasks
• Monitor error trends

${chalk.bold('🔧 Common Workflows:')}

${chalk.yellow('Before Major Refactoring:')}
  ${chalk.cyan('1.')} get-session-health  ${chalk.dim('# Check token budget')}
  ${chalk.cyan('2.')} Save checkpoint if > 50% used
  ${chalk.cyan('3.')} Proceed with refactoring

${chalk.yellow('Quality Check:')}
  ${chalk.cyan('1.')} get-session-health  ${chalk.dim('# Check quality score')}
  ${chalk.cyan('2.')} If < 70, review recent changes
  ${chalk.cyan('3.')} Address flagged issues

${chalk.yellow('Error Troubleshooting:')}
  ${chalk.cyan('1.')} get-session-health  ${chalk.dim('# Check error rate')}
  ${chalk.cyan('2.')} If > 15%, review error types
  ${chalk.cyan('3.')} Adjust approach based on errors
`;
        return boxen(content, {
            padding: 1,
            borderColor: 'cyan',
            borderStyle: 'round',
        });
    }
}
//# sourceMappingURL=BuddyCommands.js.map