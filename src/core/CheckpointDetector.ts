/**
 * Checkpoint Detection System - Development Workflow Event Management
 *
 * Monitors development workflow events and triggers appropriate actions when specific
 * checkpoints are reached (e.g., tests complete, code written, build finished). Supports
 * multiple callbacks per checkpoint, graceful error handling, and checkpoint metadata.
 *
 * Features:
 * - **Event-Driven Workflow**: Register callbacks for specific development milestones
 * - **Multiple Callbacks**: Support multiple handlers per checkpoint
 * - **Graceful Failure**: Continues execution if some callbacks fail
 * - **Metadata Support**: Attach description, priority, and category to checkpoints
 * - **Error Tracking**: Reports failed callbacks with error messages
 *
 * Common Checkpoints:
 * - **tests_complete**: All tests passed, ready for commit
 * - **code_written**: New code added, ready for review
 * - **build_complete**: Build finished successfully
 * - **commit_ready**: Staged changes ready for commit
 * - **review_requested**: Code review requested
 *
 * @example
 * ```typescript
 * import { CheckpointDetector } from './CheckpointDetector.js';
 *
 * const detector = new CheckpointDetector();
 *
 * // Register checkpoint for test completion
 * detector.registerCheckpoint(
 *   'tests_complete',
 *   async (data) => {
 *     console.log(`All ${data.testCount} tests passed`);
 *     await runCodeReview();
 *     return { success: true };
 *   },
 *   { description: 'Trigger code review after tests pass', priority: 'high' }
 * );
 *
 * // Add additional callback to same checkpoint
 * detector.addCallback('tests_complete', async (data) => {
 *   await updateCoverageReport(data.coverage);
 *   return { success: true };
 * });
 *
 * // Trigger checkpoint when tests complete
 * const result = await detector.triggerCheckpoint('tests_complete', {
 *   testCount: 42,
 *   coverage: 0.95
 * });
 *
 * if (result.triggered) {
 *   console.log('Checkpoint triggered successfully');
 * }
 * ```
 */

import { NotFoundError } from '../errors/index.js';

/**
 * Callback function type for checkpoint handlers
 *
 * Checkpoint callbacks receive event data and return success status.
 * Callbacks are executed sequentially for each checkpoint trigger.
 *
 * @param data - Event data passed to the callback
 * @returns Promise resolving to success object
 *
 * @example
 * ```typescript
 * const callback: CheckpointCallback = async (data) => {
 *   console.log('Processing event:', data);
 *   await performAction(data);
 *   return { success: true };
 * };
 * ```
 */
export type CheckpointCallback = (
  data: Record<string, unknown>
) => Promise<{ success: boolean }>;

/**
 * Checkpoint metadata structure
 *
 * Optional metadata for checkpoints providing human-readable context,
 * priority level, and categorization.
 *
 * @example
 * ```typescript
 * const metadata: CheckpointMetadata = {
 *   description: 'Trigger code review after tests complete',
 *   priority: 'high',
 *   category: 'testing'
 * };
 * ```
 */
export interface CheckpointMetadata {
  /** Human-readable description of the checkpoint */
  description?: string;

  /** Priority level (high, medium, low) */
  priority?: string;

  /** Category of checkpoint (testing, development, deployment, etc.) */
  category?: string;
}

/**
 * Result of triggering a checkpoint
 *
 * Returned by triggerCheckpoint() to indicate success or failure.
 * Includes error details and partial failure information.
 *
 * @example
 * ```typescript
 * const result: CheckpointTriggerResult = {
 *   triggered: true,
 *   checkpointName: 'tests_complete',
 *   failedCallbacks: 1 // 1 of 3 callbacks failed
 * };
 * ```
 */
export interface CheckpointTriggerResult {
  /** Whether the checkpoint was triggered (true if at least one callback succeeded) */
  triggered: boolean;

  /** Name of the checkpoint */
  checkpointName: string;

  /** Error message if all callbacks failed */
  error?: string;

  /** Number of callbacks that failed (undefined if all succeeded) */
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
   * Creates a new checkpoint with an initial callback handler. If a checkpoint with the same
   * name already exists, it is completely replaced (including all callbacks and metadata).
   * Use addCallback() to add additional handlers to an existing checkpoint without replacing it.
   *
   * Validation:
   * - Returns false if checkpointName is empty/null/undefined
   * - Returns false if callback is null/undefined
   * - Returns true on successful registration
   *
   * @param checkpointName - Unique name identifier for the checkpoint (e.g., 'tests_complete')
   * @param callback - Callback function to execute when checkpoint is triggered
   * @param metadata - Optional metadata providing context about the checkpoint
   * @returns True if checkpoint registered successfully, false if validation fails
   *
   * @example
   * ```typescript
   * import { CheckpointDetector } from './CheckpointDetector.js';
   *
   * const detector = new CheckpointDetector();
   *
   * // Register basic checkpoint
   * const success = detector.registerCheckpoint(
   *   'tests_complete',
   *   async (data) => {
   *     console.log(`All tests passed: ${data.testCount}`);
   *     return { success: true };
   *   }
   * );
   * console.log(`Registered: ${success}`); // true
   *
   * // Register with metadata
   * detector.registerCheckpoint(
   *   'build_complete',
   *   async (data) => {
   *     await deployToStaging(data.buildArtifacts);
   *     return { success: true };
   *   },
   *   {
   *     description: 'Deploy to staging after successful build',
   *     priority: 'high',
   *     category: 'deployment'
   *   }
   * );
   *
   * // Validation examples
   * const invalid1 = detector.registerCheckpoint('', async () => ({ success: true }));
   * console.log(invalid1); // false - empty name
   *
   * const invalid2 = detector.registerCheckpoint('valid_name', null as any);
   * console.log(invalid2); // false - null callback
   * ```
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
   * Appends a new callback handler to an existing checkpoint without affecting
   * existing callbacks or metadata. All callbacks execute sequentially in the
   * order they were added when the checkpoint is triggered.
   *
   * Use Case: Add multiple independent actions to the same checkpoint event,
   * such as code review + coverage report + notification when tests complete.
   *
   * @param checkpointName - Name of the existing checkpoint to add callback to
   * @param callback - Additional callback function to execute on checkpoint trigger
   * @returns True if callback added successfully, false if checkpoint not found
   *
   * @example
   * ```typescript
   * import { CheckpointDetector } from './CheckpointDetector.js';
   *
   * const detector = new CheckpointDetector();
   *
   * // Register initial checkpoint
   * detector.registerCheckpoint(
   *   'tests_complete',
   *   async (data) => {
   *     console.log(`Tests passed: ${data.testCount}`);
   *     return { success: true };
   *   }
   * );
   *
   * // Add coverage report callback
   * detector.addCallback('tests_complete', async (data) => {
   *   await updateCoverageReport(data.coverage);
   *   return { success: true };
   * });
   *
   * // Add notification callback
   * detector.addCallback('tests_complete', async (data) => {
   *   await sendSlackNotification('Tests completed successfully!');
   *   return { success: true };
   * });
   *
   * // All 3 callbacks execute when checkpoint triggered
   * await detector.triggerCheckpoint('tests_complete', {
   *   testCount: 42,
   *   coverage: 0.95
   * });
   *
   * // Returns false if checkpoint doesn't exist
   * const failed = detector.addCallback('nonexistent', async () => ({ success: true }));
   * console.log(failed); // false
   * ```
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
   * Verifies whether a checkpoint exists in the registry. Use this to
   * conditionally register, trigger, or add callbacks to checkpoints.
   *
   * @param checkpointName - Name of the checkpoint to check for existence
   * @returns True if checkpoint is registered, false otherwise
   *
   * @example
   * ```typescript
   * import { CheckpointDetector } from './CheckpointDetector.js';
   *
   * const detector = new CheckpointDetector();
   *
   * // Register a checkpoint
   * detector.registerCheckpoint(
   *   'tests_complete',
   *   async () => ({ success: true })
   * );
   *
   * // Check if registered
   * if (detector.isCheckpointRegistered('tests_complete')) {
   *   console.log('Checkpoint exists, can trigger');
   *   await detector.triggerCheckpoint('tests_complete', {});
   * }
   *
   * // Conditional registration
   * if (!detector.isCheckpointRegistered('build_complete')) {
   *   detector.registerCheckpoint(
   *     'build_complete',
   *     async (data) => {
   *       console.log('Build completed');
   *       return { success: true };
   *     }
   *   );
   * }
   *
   * // Check non-existent checkpoint
   * const exists = detector.isCheckpointRegistered('nonexistent');
   * console.log(exists); // false
   * ```
   */
  isCheckpointRegistered(checkpointName: string): boolean {
    return this.checkpoints.has(checkpointName);
  }

  /**
   * Get list of all registered checkpoints
   *
   * Returns an array of all checkpoint names currently registered in the detector.
   * Useful for debugging, introspection, and displaying available checkpoints.
   *
   * @returns Array of checkpoint names (strings) in insertion order
   *
   * @example
   * ```typescript
   * import { CheckpointDetector } from './CheckpointDetector.js';
   *
   * const detector = new CheckpointDetector();
   *
   * // Register multiple checkpoints
   * detector.registerCheckpoint('tests_complete', async () => ({ success: true }));
   * detector.registerCheckpoint('build_complete', async () => ({ success: true }));
   * detector.registerCheckpoint('deploy_complete', async () => ({ success: true }));
   *
   * // Get all registered checkpoints
   * const checkpoints = detector.getRegisteredCheckpoints();
   * console.log(checkpoints); // ['tests_complete', 'build_complete', 'deploy_complete']
   *
   * // Display available checkpoints
   * console.log('Available checkpoints:');
   * detector.getRegisteredCheckpoints().forEach(name => {
   *   const metadata = detector.getCheckpointMetadata(name);
   *   console.log(`  - ${name}: ${metadata?.description || 'No description'}`);
   * });
   *
   * // Check count
   * const count = detector.getRegisteredCheckpoints().length;
   * console.log(`Total checkpoints: ${count}`);
   * ```
   */
  getRegisteredCheckpoints(): string[] {
    return Array.from(this.checkpoints.keys());
  }

  /**
   * Trigger a checkpoint, executing all registered callbacks
   *
   * Executes all callbacks registered for the specified checkpoint sequentially.
   * Implements graceful failure handling: continues executing remaining callbacks
   * even if some fail. Returns success if at least one callback succeeds.
   *
   * Execution Behavior:
   * - **All callbacks succeed**: Returns `{ triggered: true, failedCallbacks: undefined }`
   * - **Some callbacks fail**: Returns `{ triggered: true, failedCallbacks: N }`
   * - **All callbacks fail**: Returns `{ triggered: false, error: "first error message" }`
   *
   * Callback execution is sequential (not parallel) in the order callbacks were registered.
   * This ensures predictable execution order and allows callbacks to depend on previous ones.
   *
   * @param checkpointName - Name of the checkpoint to trigger (must be registered)
   * @param data - Event data passed to all callbacks (available as callback parameter)
   * @returns Promise<CheckpointTriggerResult> Result indicating success/failure and any errors
   * @throws NotFoundError if checkpoint is not registered
   *
   * @example
   * ```typescript
   * import { CheckpointDetector } from './CheckpointDetector.js';
   *
   * const detector = new CheckpointDetector();
   *
   * // Register checkpoint with multiple callbacks
   * detector.registerCheckpoint(
   *   'tests_complete',
   *   async (data) => {
   *     console.log(`Tests passed: ${data.testCount}`);
   *     return { success: true };
   *   }
   * );
   *
   * detector.addCallback('tests_complete', async (data) => {
   *   await updateCoverageReport(data.coverage);
   *   return { success: true };
   * });
   *
   * detector.addCallback('tests_complete', async (data) => {
   *   // This callback might fail
   *   if (Math.random() < 0.5) {
   *     throw new Error('Notification service unavailable');
   *   }
   *   await sendNotification('Tests complete!');
   *   return { success: true };
   * });
   *
   * // Trigger checkpoint
   * const result = await detector.triggerCheckpoint('tests_complete', {
   *   testCount: 42,
   *   coverage: 0.95,
   *   duration: 15.3
   * });
   *
   * if (result.triggered) {
   *   console.log('Checkpoint executed successfully');
   *   if (result.failedCallbacks) {
   *     console.warn(`${result.failedCallbacks} callback(s) failed`);
   *   }
   * } else {
   *   console.error(`All callbacks failed: ${result.error}`);
   * }
   *
   * // Handle non-existent checkpoint
   * try {
   *   await detector.triggerCheckpoint('nonexistent', {});
   * } catch (error) {
   *   if (error instanceof NotFoundError) {
   *     console.error('Checkpoint not registered');
   *   }
   * }
   * ```
   */
  async triggerCheckpoint(
    checkpointName: string,
    data: Record<string, unknown>
  ): Promise<CheckpointTriggerResult> {
    // Check if checkpoint is registered
    if (!this.isCheckpointRegistered(checkpointName)) {
      throw new NotFoundError(
        `Checkpoint "${checkpointName}" is not registered`,
        'checkpoint',
        checkpointName
      );
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
   * Completely removes a checkpoint from the registry, including all callbacks
   * and metadata. Use this to clean up checkpoints that are no longer needed.
   *
   * @param checkpointName - Name of the checkpoint to remove from registry
   * @returns True if checkpoint existed and was removed, false if not found
   *
   * @example
   * ```typescript
   * import { CheckpointDetector } from './CheckpointDetector.js';
   *
   * const detector = new CheckpointDetector();
   *
   * // Register a temporary checkpoint
   * detector.registerCheckpoint(
   *   'temp_checkpoint',
   *   async () => ({ success: true })
   * );
   *
   * // Use the checkpoint
   * await detector.triggerCheckpoint('temp_checkpoint', {});
   *
   * // Remove when no longer needed
   * const removed = detector.unregisterCheckpoint('temp_checkpoint');
   * console.log(removed); // true
   *
   * // Verify removed
   * const exists = detector.isCheckpointRegistered('temp_checkpoint');
   * console.log(exists); // false
   *
   * // Removing non-existent checkpoint returns false
   * const notFound = detector.unregisterCheckpoint('nonexistent');
   * console.log(notFound); // false
   *
   * // Clean up all checkpoints
   * detector.getRegisteredCheckpoints().forEach(name => {
   *   detector.unregisterCheckpoint(name);
   * });
   * console.log(detector.getRegisteredCheckpoints().length); // 0
   * ```
   */
  unregisterCheckpoint(checkpointName: string): boolean {
    return this.checkpoints.delete(checkpointName);
  }

  /**
   * Get metadata for a specific checkpoint
   *
   * Retrieves the optional metadata associated with a checkpoint. Metadata includes
   * description, priority level, and category information attached during registration.
   * Returns undefined if checkpoint doesn't exist or has no metadata.
   *
   * @param checkpointName - Name of the checkpoint to get metadata for
   * @returns CheckpointMetadata object if exists, undefined if checkpoint not found or has no metadata
   *
   * @example
   * ```typescript
   * import { CheckpointDetector } from './CheckpointDetector.js';
   *
   * const detector = new CheckpointDetector();
   *
   * // Register checkpoint with metadata
   * detector.registerCheckpoint(
   *   'tests_complete',
   *   async () => ({ success: true }),
   *   {
   *     description: 'Trigger code review after tests pass',
   *     priority: 'high',
   *     category: 'testing'
   *   }
   * );
   *
   * // Get metadata
   * const metadata = detector.getCheckpointMetadata('tests_complete');
   * if (metadata) {
   *   console.log(`Description: ${metadata.description}`);
   *   console.log(`Priority: ${metadata.priority}`);
   *   console.log(`Category: ${metadata.category}`);
   * }
   *
   * // Display all checkpoints with metadata
   * detector.getRegisteredCheckpoints().forEach(name => {
   *   const meta = detector.getCheckpointMetadata(name);
   *   if (meta) {
   *     console.log(`${name}: ${meta.description} [${meta.priority}]`);
   *   } else {
   *     console.log(`${name}: No metadata`);
   *   }
   * });
   *
   * // Returns undefined for non-existent checkpoint
   * const notFound = detector.getCheckpointMetadata('nonexistent');
   * console.log(notFound); // undefined
   *
   * // Returns undefined if no metadata provided during registration
   * detector.registerCheckpoint('no_metadata', async () => ({ success: true }));
   * const noMeta = detector.getCheckpointMetadata('no_metadata');
   * console.log(noMeta); // undefined
   * ```
   */
  getCheckpointMetadata(
    checkpointName: string
  ): CheckpointMetadata | undefined {
    return this.checkpoints.get(checkpointName)?.metadata;
  }
}
