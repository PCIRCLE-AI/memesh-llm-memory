/**
 * BuddyCommands - User-friendly command layer for Claude Code Buddy
 *
 * Provides natural language command interface:
 * - buddy do <task>         - Execute tasks with smart routing
 * - buddy remember <query>  - Recall project memory
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

  ]);

  /**
   * Valid commands
   */
  private static readonly VALID_COMMANDS: Set<string> = new Set([
    'do',
    'remember',
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
      // No args (e.g., "buddy help")
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

Execute tasks with smart routing. CCB analyzes complexity and applies
capability-focused prompt enhancement.

Examples:
  buddy do setup authentication
  buddy do refactor user service
  buddy do fix login bug
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
  buddy remember <query> Recall project memory
  buddy help [command]   Show this help or command-specific help

Aliases:
  do:       help-with, execute, run, task
  remember: recall, retrieve, search, find

Examples:
  buddy do setup authentication
  buddy remember api design decisions

For more info: https://github.com/PCIRCLE-AI/claude-code-buddy
`;
  }
}
