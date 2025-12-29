/**
 * Checkpoint Detection System
 *
 * Monitors development workflow events and triggers appropriate actions
 * when specific checkpoints are reached (e.g., tests complete, code written).
 */

/**
 * Callback function type for checkpoint handlers
 */
export type CheckpointCallback = (
  data: Record<string, unknown>
) => Promise<{ success: boolean }>;

/**
 * Checkpoint metadata structure
 */
export interface CheckpointMetadata {
  /** Human-readable description of the checkpoint */
  description?: string;

  /** Priority level (high, medium, low) */
  priority?: string;

  /** Category of checkpoint (testing, development, etc.) */
  category?: string;
}

/**
 * Result of triggering a checkpoint
 */
export interface CheckpointTriggerResult {
  /** Whether the checkpoint was triggered */
  triggered: boolean;

  /** Name of the checkpoint */
  checkpointName: string;

  /** Error message if triggering failed */
  error?: string;

  /** Number of callbacks that failed */
  failedCallbacks?: number;
}

/**
 * Checkpoint registry entry
 */
interface CheckpointEntry {
  callbacks: CheckpointCallback[];
  metadata?: CheckpointMetadata;
}

/**
 * Checkpoint Detector Class
 *
 * Manages checkpoint registration and triggering for development workflow events.
 * Supports multiple callbacks per checkpoint and graceful error handling.
 */
export class CheckpointDetector {
  private checkpoints: Map<string, CheckpointEntry> = new Map();

  /**
   * Register a checkpoint with a callback
   *
   * @param checkpointName - Name of the checkpoint
   * @param callback - Function to call when checkpoint is triggered
   * @param metadata - Optional metadata for the checkpoint
   * @returns True if registration successful
   */
  registerCheckpoint(
    checkpointName: string,
    callback: CheckpointCallback,
    metadata?: CheckpointMetadata
  ): boolean {
    if (!checkpointName || !callback) {
      return false;
    }

    this.checkpoints.set(checkpointName, {
      callbacks: [callback],
      metadata,
    });
    return true;
  }

  /**
   * Add an additional callback to an existing checkpoint
   *
   * @param checkpointName - Name of the checkpoint
   * @param callback - Additional callback to add
   * @returns True if callback was added
   */
  addCallback(
    checkpointName: string,
    callback: CheckpointCallback
  ): boolean {
    const entry = this.checkpoints.get(checkpointName);
    if (!entry) {
      return false;
    }

    entry.callbacks.push(callback);
    return true;
  }

  /**
   * Check if a checkpoint is registered
   *
   * @param checkpointName - Name of the checkpoint to check
   * @returns True if checkpoint is registered
   */
  isCheckpointRegistered(checkpointName: string): boolean {
    return this.checkpoints.has(checkpointName);
  }

  /**
   * Get list of all registered checkpoints
   *
   * @returns Array of registered checkpoint names
   */
  getRegisteredCheckpoints(): string[] {
    return Array.from(this.checkpoints.keys());
  }

  /**
   * Trigger a checkpoint, executing all registered callbacks
   *
   * @param checkpointName - Name of the checkpoint to trigger
   * @param data - Data to pass to the callbacks
   * @returns Promise<CheckpointTriggerResult> Result of the trigger
   * @throws Error if checkpoint is not registered
   */
  async triggerCheckpoint(
    checkpointName: string,
    data: Record<string, unknown>
  ): Promise<CheckpointTriggerResult> {
    // Check if checkpoint is registered
    if (!this.isCheckpointRegistered(checkpointName)) {
      throw new Error(`Checkpoint "${checkpointName}" is not registered`);
    }

    const entry = this.checkpoints.get(checkpointName)!;
    let failedCallbacks = 0;
    let firstError: string | undefined;

    // Execute all callbacks
    for (const callback of entry.callbacks) {
      try {
        await callback(data);
      } catch (error) {
        failedCallbacks++;
        if (!firstError) {
          firstError =
            error instanceof Error ? error.message : 'Unknown error';
        }
      }
    }

    // If all callbacks failed, return failure result
    if (failedCallbacks === entry.callbacks.length) {
      return {
        triggered: false,
        checkpointName,
        error: firstError,
      };
    }

    // Return success with failure count if some callbacks failed
    return {
      triggered: true,
      checkpointName,
      failedCallbacks: failedCallbacks > 0 ? failedCallbacks : undefined,
    };
  }

  /**
   * Unregister a checkpoint
   *
   * @param checkpointName - Name of the checkpoint to unregister
   * @returns True if checkpoint was unregistered
   */
  unregisterCheckpoint(checkpointName: string): boolean {
    return this.checkpoints.delete(checkpointName);
  }

  /**
   * Get metadata for a specific checkpoint
   *
   * @param checkpointName - Name of the checkpoint
   * @returns CheckpointMetadata or undefined if not found
   */
  getCheckpointMetadata(
    checkpointName: string
  ): CheckpointMetadata | undefined {
    return this.checkpoints.get(checkpointName)?.metadata;
  }
}
