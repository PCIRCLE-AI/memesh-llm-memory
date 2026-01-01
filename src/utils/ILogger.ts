/**
 * Logger interface for dependency injection
 *
 * This interface provides a contract for logging functionality,
 * allowing components to accept loggers without tight coupling
 * to specific implementations.
 *
 * @interface ILogger
 */
export interface ILogger {
  /**
   * Log an informational message
   * @param message - The message to log
   * @param meta - Optional metadata
   */
  info(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log an error message
   * @param message - The message to log
   * @param meta - Optional metadata
   */
  error(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log a warning message
   * @param message - The message to log
   * @param meta - Optional metadata
   */
  warn(message: string, meta?: Record<string, unknown>): void;

  /**
   * Log a debug message
   * @param message - The message to log
   * @param meta - Optional metadata
   */
  debug(message: string, meta?: Record<string, unknown>): void;
}
