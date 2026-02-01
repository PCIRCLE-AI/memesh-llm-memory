// src/mcp/ProgressReporter.ts
/**
 * Progress Reporter
 *
 * Reports progress updates via MCP protocol for long-running operations.
 * Uses MCP SDK 1.25.3 progress reporting capability.
 */

export interface ProgressUpdate {
  progressToken: string;
  progress: number;
  total: number;
}

export type ProgressSender = (update: ProgressUpdate) => Promise<void>;

export class ProgressReporter {
  constructor(
    private progressToken: string | undefined,
    private sendProgress: ProgressSender
  ) {}

  /**
   * Report progress update
   *
   * @param current - Current progress value
   * @param total - Total items to process
   * @param message - Optional progress message
   */
  async report(current: number, total: number, message?: string): Promise<void> {
    if (!this.progressToken) {
      // No progress token, skip reporting
      return;
    }

    await this.sendProgress({
      progressToken: this.progressToken,
      progress: current,
      total,
    });
  }

  /**
   * Check if progress reporting is enabled
   *
   * @returns True if progress token is available
   */
  isEnabled(): boolean {
    return this.progressToken !== undefined;
  }
}
