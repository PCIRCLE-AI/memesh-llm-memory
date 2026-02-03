/**
 * Result Handler
 *
 * Handles task result processing, callback execution, and error handling.
 * Extracted from BackgroundExecutor to follow Single Responsibility Principle.
 *
 * Features:
 * - Task completion handling
 * - Task failure handling
 * - Task cancellation handling
 * - Callback execution (onComplete, onError)
 * - Result storage
 * - Error logging
 *
 * @example
 * ```typescript
 * import { ResultHandler } from './ResultHandler.js';
 *
 * const handler = new ResultHandler();
 *
 * // Handle successful completion
 * handler.handleCompleted(task, result);
 *
 * // Handle failure
 * handler.handleFailed(task, error);
 *
 * // Handle cancellation
 * handler.handleCancelled(task);
 * ```
 */

import { BackgroundTask } from './types.js';
import { logger } from '../utils/logger.js';
import { looksLikeSensitive, hashValue } from '../telemetry/sanitization.js';

/**
 * ResultHandler Class
 *
 * Manages the final state transitions and callback execution for background tasks.
 * Ensures consistent handling of task completion, failure, and cancellation scenarios.
 *
 * Responsibilities:
 * - Update task status to terminal states (completed, failed, cancelled)
 * - Store task results or errors
 * - Execute user-provided callbacks (onComplete, onError)
 * - Log task lifecycle events
 * - Set task end timestamps
 *
 * Thread Safety:
 * - Handles are synchronous and update task state immediately
 * - Callback execution is synchronous but errors are caught and logged
 * - Task map updates are the caller's responsibility
 */
export class ResultHandler {
  /**
   * Handle successful task completion
   *
   * Updates task status to 'completed', stores the result, sets end timestamp,
   * and executes the onComplete callback if provided. Progress is updated to 100%.
   *
   * @param task - Background task to mark as completed
   * @param result - Result value from task execution
   *
   * @example
   * ```typescript
   * const handler = new ResultHandler();
   * const task: BackgroundTask = {
   *   taskId: 'bg-12345',
   *   status: 'running',
   *   config: {
   *     callbacks: {
   *       onComplete: (result) => console.log('Done:', result)
   *     }
   *   },
   *   // ... other fields
   * };
   *
   * handler.handleCompleted(task, { success: true, data: [1, 2, 3] });
   * // Task status: 'completed'
   * // Task result: { success: true, data: [1, 2, 3] }
   * // onComplete callback executed
   * ```
   */
  handleCompleted(task: BackgroundTask, result: unknown): void {
    // ✅ FIX MAJOR-2: Guard against status overwrite race condition
    // If task.status is already a terminal state (completed/failed/cancelled),
    // skip the update. This makes the first status transition authoritative.
    // This can happen when cancelTask() sets status='cancelled' but the running
    // task's promise chain tries to set it to 'completed' afterward.
    if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
      logger.debug(
        `BackgroundExecutor: Task ${task.taskId} already in terminal state '${task.status}', skipping completion update`
      );
      return;
    }

    task.status = 'completed';
    task.endTime = new Date();
    task.result = result;
    task.progress = {
      progress: 1.0,
      currentStage: 'completed',
    };

    logger.info(`BackgroundExecutor: Task ${task.taskId} completed`);

    // Execute completion callback if provided
    this.executeCallback(() => {
      task.config.callbacks?.onComplete?.(result);
    }, task.taskId, 'onComplete');
  }

  /**
   * Handle task failure
   *
   * Updates task status to 'failed', stores the error, sets end timestamp,
   * and executes the onError callback if provided. Error details are logged.
   *
   * @param task - Background task to mark as failed
   * @param error - Error object that caused the failure
   *
   * @example
   * ```typescript
   * const handler = new ResultHandler();
   * const task: BackgroundTask = {
   *   taskId: 'bg-12345',
   *   status: 'running',
   *   config: {
   *     callbacks: {
   *       onError: (error) => console.error('Failed:', error.message)
   *     }
   *   },
   *   // ... other fields
   * };
   *
   * const error = new Error('Network timeout');
   * handler.handleFailed(task, error);
   * // Task status: 'failed'
   * // Task error: Error('Network timeout')
   * // onError callback executed
   * ```
   */
  handleFailed(task: BackgroundTask, error: Error): void {
    // ✅ FIX MAJOR-2: Guard against status overwrite race condition
    // If task.status is already a terminal state, skip the update.
    if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
      logger.debug(
        `BackgroundExecutor: Task ${task.taskId} already in terminal state '${task.status}', skipping failure update`
      );
      return;
    }

    task.status = 'failed';
    task.endTime = new Date();
    task.error = error;

    logger.error(`BackgroundExecutor: Task ${task.taskId} failed:`, error);

    // Execute error callback if provided
    this.executeCallback(() => {
      task.config.callbacks?.onError?.(error);
    }, task.taskId, 'onError');
  }

  /**
   * Handle task cancellation
   *
   * Updates task status to 'cancelled' and sets end timestamp.
   * No callbacks are executed for cancellation (as per original BackgroundExecutor behavior).
   *
   * @param task - Background task to mark as cancelled
   *
   * @example
   * ```typescript
   * const handler = new ResultHandler();
   * const task: BackgroundTask = {
   *   taskId: 'bg-12345',
   *   status: 'running',
   *   // ... other fields
   * };
   *
   * handler.handleCancelled(task);
   * // Task status: 'cancelled'
   * // Task endTime: current timestamp
   * // No callbacks executed
   * ```
   */
  handleCancelled(task: BackgroundTask): void {
    // ✅ FIX MAJOR-2: Guard against status overwrite race condition
    // If task.status is already a terminal state, skip the update.
    if (task.status === 'completed' || task.status === 'failed' || task.status === 'cancelled') {
      logger.debug(
        `BackgroundExecutor: Task ${task.taskId} already in terminal state '${task.status}', skipping cancellation update`
      );
      return;
    }

    task.status = 'cancelled';
    task.endTime = new Date();

    logger.info(`BackgroundExecutor: Task ${task.taskId} cancelled`);
  }

  /**
   * Execute a callback safely with error handling
   *
   * Wraps callback execution in try-catch to prevent callback errors from
   * propagating. Logs any errors that occur during callback execution.
   *
   * @param callback - Function to execute
   * @param taskId - Task ID for logging context
   * @param callbackName - Name of callback for logging (e.g., 'onComplete', 'onError')
   *
   * @private
   */
  private executeCallback(callback: () => void, taskId: string, callbackName: string): void {
    try {
      callback();
    } catch (callbackError) {
      // ✅ FIX LOW-1: Sanitize error messages before logging to prevent sensitive data exposure
      const sanitizedError = this.sanitizeCallbackError(callbackError);

      logger.error(
        `BackgroundExecutor: Error in ${callbackName} callback for task ${taskId}:`,
        sanitizedError
      );
    }
  }

  /**
   * ✅ FIX LOW-1: Sanitize callback errors before logging
   * User callbacks may log task results containing sensitive data.
   * This method sanitizes error messages to prevent data exposure.
   *
   * @param error - Error from user callback
   * @returns Sanitized error safe for logging
   * @private
   */
  private sanitizeCallbackError(error: unknown): unknown {
    if (error instanceof Error) {
      // Sanitize error message
      const message = error.message || '';
      const sanitized = message
        .split('\n')
        .map(line => (looksLikeSensitive(line) ? `[REDACTED:${hashValue(line)}]` : line))
        .join('\n');

      // Return sanitized error with original stack (stack doesn't contain user data)
      return {
        name: error.name,
        message: sanitized,
        stack: error.stack,
      };
    }

    // For non-Error objects, sanitize string representation
    const errorStr = String(error);
    if (looksLikeSensitive(errorStr)) {
      return `[REDACTED:${hashValue(errorStr)}]`;
    }

    return error;
  }
}
