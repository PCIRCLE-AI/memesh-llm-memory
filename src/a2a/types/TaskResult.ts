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

  /**
   * Actual result data (only if success=true)
   *
   * @remarks
   * Maximum size: 10MB (enforced at runtime via A2AClient)
   * Large results should be stored externally (e.g., S3, database)
   * and referenced by URL or ID here instead.
   *
   * @example
   * ```typescript
   * // Small result - OK
   * { answer: 42, calculation: "2 + 2" }
   *
   * // Large result - use reference
   * { dataUrl: "https://storage.example.com/results/task-123.json" }
   * ```
   */
  result?: unknown;

  /**
   * Error message (only if success=false)
   *
   * @remarks
   * Maximum length: 10,000 characters (enforced at runtime via Zod schema)
   * Should contain human-readable error description.
   * Stack traces should be logged separately, not included here.
   */
  error?: string;

  /** When task was executed */
  executedAt: string;

  /** Agent ID that executed the task */
  executedBy: string;

  /** Execution duration in milliseconds */
  durationMs?: number;
}
