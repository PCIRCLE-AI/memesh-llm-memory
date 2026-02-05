/**
 * Task Result Type
 *
 * Represents the execution result of a completed A2A task
 */

/**
 * Task execution result
 */
export interface TaskResult {
  /** Task ID */
  taskId: string;

  /** Task state (COMPLETED, FAILED, TIMEOUT) */
  state: 'COMPLETED' | 'FAILED' | 'TIMEOUT';

  /** Whether execution succeeded */
  success: boolean;

  /** Actual result data (only if success=true) */
  result?: unknown;

  /** Error message (only if success=false) */
  error?: string;

  /** When task was executed */
  executedAt: string;

  /** Agent ID that executed the task */
  executedBy: string;

  /** Execution duration in milliseconds */
  durationMs?: number;
}
