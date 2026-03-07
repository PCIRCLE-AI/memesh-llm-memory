/**
 * GitCommandParser - Git command detection and classification utility
 *
 * Provides static methods for detecting git commands, extracting commit messages,
 * and classifying test files/commands. Extracted from HookIntegration to provide
 * a focused, reusable utility.
 */
export class GitCommandParser {
  /** Patterns for detecting test files */
  private static readonly TEST_FILE_PATTERNS = ['.test.', '.spec.', '/tests/'];

  /** Patterns for detecting test commands */
  private static readonly TEST_COMMAND_PATTERNS = ['npm test', 'npm run test', 'vitest', 'jest', 'mocha'];

  /**
   * Check if a command is a git add command
   *
   * @param command - Bash command to check
   * @returns True if command is git add
   */
  static isGitAdd(command: string): boolean {
    return command.trim().startsWith('git add');
  }

  /**
   * Check if a command is a git commit command
   *
   * @param command - Bash command to check
   * @returns True if command contains a git commit segment
   */
  static isGitCommit(command: string): boolean {
    return GitCommandParser.findGitCommitSegment(command) !== null;
  }

  /**
   * Extract commit message from a git commit command
   *
   * Supports repeated -m flags and returns a combined message.
   * Returns null if no -m flag is present.
   *
   * @param command - Git commit command
   * @returns Commit message string or null
   */
  static extractCommitMessage(command: string): string | null {
    const segment = GitCommandParser.findGitCommitSegment(command);
    const source = segment ?? command;
    const messages: string[] = [];
    const regex = /-m\s+(?:"([^"]*)"|'([^']*)'|([^\s]+))/g;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(source)) !== null) {
      const message = match[1] ?? match[2] ?? match[3];
      if (message) {
        messages.push(message);
      }
    }

    return messages.length > 0 ? messages.join('\n') : null;
  }

  /**
   * Check if file path is a test file
   *
   * @param filePath - File path to check
   * @returns True if file appears to be a test file
   */
  static isTestFile(filePath: string): boolean {
    return GitCommandParser.TEST_FILE_PATTERNS.some(p => filePath.includes(p));
  }

  /**
   * Check if command is a test command
   *
   * @param command - Bash command to check
   * @returns True if command appears to be running tests
   */
  static isTestCommand(command: string): boolean {
    return GitCommandParser.TEST_COMMAND_PATTERNS.some(p => command.includes(p));
  }

  /**
   * Locate the git commit segment within a composite shell command
   *
   * Splits on && and ; to find the segment that starts with `git commit`.
   *
   * @param command - Full shell command (may contain chained commands)
   * @returns The git commit segment or null
   */
  static findGitCommitSegment(command: string): string | null {
    const segments = command
      .split(/&&|;/)
      .map(segment => segment.trim())
      .filter(Boolean);

    for (const segment of segments) {
      if (/^git\s+commit(\s|$)/.test(segment)) {
        return segment;
      }
    }

    return null;
  }
}
