import { spawn } from 'child_process';

interface Checkpoint {
  testId: string;
  stashId: string;
  timestamp: number;
  description: string;
}

interface RollbackRecord {
  testId: string;
  timestamp: number;
  reason: string;
}

type ExecFunction = (command: string, args: string[]) => Promise<{
  stdout: string;
  stderr: string;
}>;

/**
 * RollbackManager - Git-based rollback mechanism for failed fixes
 *
 * Creates checkpoints before applying fixes using git stash.
 * Rolls back to checkpoint on failure, or commits on success.
 * Tracks rollback history for analysis.
 *
 * Security: Uses spawn with args array to prevent command injection.
 * Input validation with whitelist regex for all user inputs.
 */
export class RollbackManager {
  // Whitelist regex for safe inputs
  private static readonly TESTID_REGEX = /^[a-zA-Z0-9_-]+$/;
  private static readonly DESCRIPTION_REGEX = /^[a-zA-Z0-9\s_.,:-]+$/;
  private static readonly MESSAGE_REGEX = /^[a-zA-Z0-9\s_.,:-]+$/;

  private checkpoints: Map<string, Checkpoint> = new Map();
  private rollbackHistory: RollbackRecord[] = [];
  private readonly MAX_ROLLBACK_HISTORY = 500; // Max rollback records to keep
  private execFunction: ExecFunction;

  constructor() {
    this.execFunction = this.defaultExec;
  }

  /**
   * Validate testId against whitelist regex
   */
  private validateTestId(testId: string): void {
    if (!RollbackManager.TESTID_REGEX.test(testId)) {
      throw new Error(
        `Invalid testId: "${testId}". Only alphanumeric, dashes, and underscores allowed.`
      );
    }
  }

  /**
   * Validate description against whitelist regex
   */
  private validateDescription(description: string): void {
    if (!RollbackManager.DESCRIPTION_REGEX.test(description)) {
      throw new Error(
        `Invalid description: "${description}". Only alphanumeric, spaces, and basic punctuation allowed.`
      );
    }
  }

  /**
   * Validate commit message against whitelist regex
   */
  private validateMessage(message: string): void {
    if (!RollbackManager.MESSAGE_REGEX.test(message)) {
      throw new Error(
        `Invalid commit message: "${message}". Only alphanumeric, spaces, and basic punctuation allowed.`
      );
    }
  }

  /**
   * Set custom exec function (for testing)
   */
  setExecFunction(fn: ExecFunction): void {
    this.execFunction = fn;
  }

  /**
   * Create checkpoint before applying fix
   *
   * @param testId - Unique identifier for the test
   * @param description - Human-readable description of the fix
   * @returns Stash ID for the checkpoint
   * @throws Error if git stash fails or stash ID cannot be retrieved
   */
  async createCheckpoint(
    testId: string,
    description: string
  ): Promise<string> {
    // Validate inputs
    this.validateTestId(testId);
    this.validateDescription(description);

    try {
      // Create git stash using spawn (safe from command injection)
      await this.execFunction('git', [
        'stash',
        'push',
        '-m',
        `E2E Healing: ${description}`,
      ]);

      // Get stash ID from git stash list
      const stashId = await this.getLatestStashId();

      const checkpoint: Checkpoint = {
        testId,
        stashId,
        timestamp: Date.now(),
        description,
      };

      this.checkpoints.set(testId, checkpoint);

      return stashId;
    } catch (error) {
      // Clean up partial state on failure
      this.checkpoints.delete(testId);

      throw new Error(
        `Failed to create checkpoint for test ${testId}: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Rollback to checkpoint on failure
   *
   * @param testId - Unique identifier for the test
   * @param reason - Reason for rollback (default: 'Fix failed')
   * @throws Error if checkpoint not found or rollback fails
   */
  async rollback(testId: string, reason: string = 'Fix failed'): Promise<void> {
    const checkpoint = this.checkpoints.get(testId);
    if (!checkpoint) {
      throw new Error(`No checkpoint found for test ${testId}`);
    }

    try {
      // Restore from stash using spawn (safe from command injection)
      await this.execFunction('git', ['stash', 'pop', checkpoint.stashId]);

      // Record rollback
      this.rollbackHistory.push({
        testId,
        timestamp: Date.now(),
        reason,
      });

      // Trim history to prevent unbounded growth
      if (this.rollbackHistory.length > this.MAX_ROLLBACK_HISTORY) {
        this.rollbackHistory = this.rollbackHistory.slice(-this.MAX_ROLLBACK_HISTORY);
      }

      this.checkpoints.delete(testId);
    } catch (error) {
      throw new Error(
        `Failed to rollback test ${testId} using stash ${checkpoint.stashId}: ${
          error instanceof Error ? error.message : String(error)
        }. Manual recovery: git stash apply ${checkpoint.stashId}`
      );
    }
  }

  /**
   * Commit changes on success
   *
   * @param testId - Unique identifier for the test
   * @param message - Commit message
   * @throws Error if checkpoint not found or commit fails
   */
  async commit(testId: string, message: string): Promise<void> {
    // Validate inputs
    this.validateMessage(message);

    const checkpoint = this.checkpoints.get(testId);
    if (!checkpoint) {
      throw new Error(`No checkpoint found for test ${testId}`);
    }

    try {
      // Commit changes using spawn (safe from command injection)
      await this.execFunction('git', ['add', '.']);
      await this.execFunction('git', ['commit', '-m', message]);

      // Drop stash after successful commit (changes are committed)
      await this.execFunction('git', ['stash', 'drop', checkpoint.stashId]);

      this.checkpoints.delete(testId);
    } catch (error) {
      // If commit or stash drop fails, provide recovery options
      throw new Error(
        `Failed to commit changes for test ${testId}: ${
          error instanceof Error ? error.message : String(error)
        }. Stash ${checkpoint.stashId} preserved for manual review.`
      );
    }
  }

  /**
   * Get rollback history for analysis
   *
   * @returns Array of rollback records
   */
  getRollbackHistory(): RollbackRecord[] {
    return [...this.rollbackHistory];
  }

  /**
   * Get the latest stash ID from git stash list
   * This is more reliable than parsing git stash push output
   *
   * @returns Stash ID (e.g., "stash@{0}")
   */
  private async getLatestStashId(): Promise<string> {
    const { stdout } = await this.execFunction('git', ['stash', 'list']);

    // Parse first line to get latest stash ID
    const firstLine = stdout.trim().split('\n')[0];
    const match = firstLine?.match(/^(stash@\{\d+\})/);

    if (!match) {
      throw new Error('Failed to get stash ID from git stash list');
    }

    return match[1];
  }

  /**
   * Default exec function using Node.js spawn (secure)
   *
   * @param command - Command to execute (e.g., 'git')
   * @param args - Array of arguments (safe from injection)
   * @returns stdout and stderr from command execution
   */
  private async defaultExec(
    command: string,
    args: string[]
  ): Promise<{
    stdout: string;
    stderr: string;
  }> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args);
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Command failed with code ${code}: ${stderr}`));
        } else {
          resolve({ stdout, stderr });
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }
}
