import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

type ExecFunction = (command: string) => Promise<{
  stdout: string;
  stderr: string;
}>;

/**
 * RollbackManager - Git-based rollback mechanism for failed fixes
 *
 * Creates checkpoints before applying fixes using git stash.
 * Rolls back to checkpoint on failure, or commits on success.
 * Tracks rollback history for analysis.
 */
export class RollbackManager {
  private checkpoints: Map<string, Checkpoint> = new Map();
  private rollbackHistory: RollbackRecord[] = [];
  private execFunction: ExecFunction;

  constructor() {
    this.execFunction = this.defaultExec;
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
   */
  async createCheckpoint(
    testId: string,
    description: string
  ): Promise<string> {
    // Create git stash
    const { stdout } = await this.execFunction(
      `git stash push -m "E2E Healing: ${description}"`
    );

    // Get stash ID
    const stashId = this.extractStashId(stdout);

    const checkpoint: Checkpoint = {
      testId,
      stashId,
      timestamp: Date.now(),
      description,
    };

    this.checkpoints.set(testId, checkpoint);

    return stashId;
  }

  /**
   * Rollback to checkpoint on failure
   *
   * @param testId - Unique identifier for the test
   * @param reason - Reason for rollback (default: 'Fix failed')
   */
  async rollback(testId: string, reason: string = 'Fix failed'): Promise<void> {
    const checkpoint = this.checkpoints.get(testId);
    if (!checkpoint) {
      throw new Error(`No checkpoint found for test ${testId}`);
    }

    // Restore from stash
    await this.execFunction(`git stash pop ${checkpoint.stashId}`);

    // Record rollback
    this.rollbackHistory.push({
      testId,
      timestamp: Date.now(),
      reason,
    });

    this.checkpoints.delete(testId);
  }

  /**
   * Commit changes on success
   *
   * @param testId - Unique identifier for the test
   * @param message - Commit message
   */
  async commit(testId: string, message: string): Promise<void> {
    const checkpoint = this.checkpoints.get(testId);
    if (!checkpoint) {
      throw new Error(`No checkpoint found for test ${testId}`);
    }

    // Drop stash (changes already applied)
    await this.execFunction(`git stash drop ${checkpoint.stashId}`);

    // Commit changes
    await this.execFunction(`git add . && git commit -m "${message}"`);

    this.checkpoints.delete(testId);
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
   * Extract stash ID from git output
   *
   * @param output - Git stash command output
   * @returns Stash ID (e.g., "stash@{0}")
   */
  private extractStashId(output: string): string {
    // Extract stash ID from git output
    // Example: "Saved working directory and index state WIP on main: abc123..."
    const match = output.match(/stash@\{(\d+)\}/);
    return match ? `stash@{${match[1]}}` : 'stash@{0}';
  }

  /**
   * Default exec function using Node.js child_process
   *
   * @param command - Shell command to execute
   * @returns stdout and stderr from command execution
   */
  private async defaultExec(command: string): Promise<{
    stdout: string;
    stderr: string;
  }> {
    const { stdout, stderr } = await execAsync(command);
    return { stdout, stderr };
  }
}
