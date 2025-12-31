/**
 * BuddyCommands - User-friendly command layer for Claude Code Buddy
 *
 * Provides natural language command interface:
 * - buddy do <task>         - Execute tasks with smart routing
 * - buddy stats             - View performance dashboard
 * - buddy remember <query>  - Recall project memory
 * - buddy analyze <task>    - Analyze task complexity
 * - buddy route <query>     - Show routing decision
 * - buddy help              - Show command help
 */

export interface ParsedCommand {
  command: string;
  args: string;
  originalInput: string;
}

export class BuddyCommands {
  /**
   * Command aliases for better UX
   */
  private static readonly ALIASES: Map<string, string> = new Map([
    // Main command aliases
    ['help-with', 'do'],
    ['execute', 'do'],
    ['run', 'do'],
    ['task', 'do'],

    // Memory aliases
    ['recall', 'remember'],
    ['retrieve', 'remember'],
    ['search', 'remember'],
    ['find', 'remember'],

    // Stats aliases
    ['dashboard', 'stats'],
    ['metrics', 'stats'],
    ['performance', 'stats'],

    // Analyze aliases
    ['check', 'analyze'],
    ['evaluate', 'analyze'],
    ['assess', 'analyze'],

    // Route aliases
    ['routing', 'route'],
    ['decide', 'route'],
  ]);

  /**
   * Valid commands
   */
  private static readonly VALID_COMMANDS: Set<string> = new Set([
    'do',
    'stats',
    'remember',
    'analyze',
    'route',
    'help',
  ]);

  /**
   * Parse a command string into structured format
   *
   * @param input - Raw command string (e.g., "buddy do setup auth")
   * @returns ParsedCommand with command, args, and original input
   */
  static parse(input: string): ParsedCommand {
    const originalInput = input;
    let trimmed = input.trim();

    // Remove "buddy" prefix if present (case insensitive)
    if (trimmed.toLowerCase().startsWith('buddy ')) {
      trimmed = trimmed.slice(6).trim();
    }

    // Split into command and args
    const spaceIndex = trimmed.indexOf(' ');
    let command: string;
    let args: string;

    if (spaceIndex === -1) {
      // No args (e.g., "buddy stats")
      command = trimmed.toLowerCase();
      args = '';
    } else {
      // Has args (e.g., "buddy do setup auth")
      command = trimmed.slice(0, spaceIndex).toLowerCase();
      args = trimmed.slice(spaceIndex + 1).trim();
    }

    // Resolve aliases
    if (this.ALIASES.has(command)) {
      command = this.ALIASES.get(command)!;
    }

    // Validate command
    if (!this.VALID_COMMANDS.has(command)) {
      command = 'help';
      args = ''; // Clear args for help command
    }

    return {
      command,
      args,
      originalInput,
    };
  }

  /**
   * Get help text for a specific command or general help
   *
   * @param command - Optional specific command to get help for
   * @returns Help text
   */
  static getHelp(command?: string): string {
    if (!command) {
      return this.getGeneralHelp();
    }

    const helpTexts: Record<string, string> = {
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

  /**
   * Get general help text
   */
  private static getGeneralHelp(): string {
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
