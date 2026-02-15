/**
 * Database Adapter Interface
 *
 * Abstraction layer for SQLite implementations to enable graceful degradation
 * when native modules are unavailable (e.g., in sandboxed environments).
 *
 * Supports multiple backends:
 * - better-sqlite3 (native, best performance)
 * - sql.js (pure JS, no compilation needed)
 * - Cloud-only mode (when MEMESH_API_KEY available)
 */

export interface IDatabaseAdapter {
  /**
   * Prepare a SQL statement for execution
   */
  prepare(sql: string): IStatement;

  /**
   * Execute SQL directly without returning results
   */
  exec(sql: string): void;

  /**
   * Close the database connection
   */
  close(): void;

  /**
   * Whether this is an in-memory database
   */
  readonly inMemory: boolean;

  /**
   * Name of the adapter implementation
   */
  readonly name: string;

  /**
   * Whether the database connection is open
   */
  readonly open: boolean;
}

export interface IStatement {
  /**
   * Execute statement and return all results
   */
  all<T = any>(...params: any[]): T[];

  /**
   * Execute statement and return first result
   */
  get<T = any>(...params: any[]): T | undefined;

  /**
   * Execute statement and return run result (changes, lastInsertRowid)
   */
  run(...params: any[]): IRunResult;

  /**
   * Execute statement and return iterator for results
   */
  iterate<T = any>(...params: any[]): IterableIterator<T>;
}

export interface IRunResult {
  /**
   * Number of rows changed by the statement
   */
  changes: number;

  /**
   * Row ID of the last inserted row
   */
  lastInsertRowid: number | bigint;
}

/**
 * Result of checking adapter availability
 */
export interface AdapterAvailability {
  /**
   * Whether the adapter is available and can be used
   */
  available: boolean;

  /**
   * Name of the adapter
   */
  name: string;

  /**
   * Error message if unavailable
   */
  error?: string;

  /**
   * Suggested action to make the adapter available
   */
  fallbackSuggestion?: string;
}
