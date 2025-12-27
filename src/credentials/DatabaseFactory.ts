/**
 * Database Factory
 *
 * Centralized database initialization with consistent configuration.
 * Ensures all SQLite databases use the same settings for:
 * - Journal mode (WAL for concurrency)
 * - Foreign keys (ON for referential integrity)
 * - Busy timeout (for handling concurrent access)
 */

import Database from 'better-sqlite3';
import { DATABASE } from './constants.js';
import { logger } from '../utils/logger.js';

/**
 * Database configuration options
 */
export interface DatabaseOptions {
  /**
   * Database file path (use ':memory:' for in-memory database)
   */
  path: string;

  /**
   * Whether to enable verbose logging (default: false)
   */
  verbose?: boolean;

  /**
   * Whether to open database in read-only mode (default: false)
   */
  readonly?: boolean;

  /**
   * Custom busy timeout in milliseconds (default: 5000)
   */
  busyTimeout?: number;

  /**
   * Whether to skip WAL mode (default: false)
   * Note: WAL mode is not supported for in-memory databases
   */
  skipWAL?: boolean;

  /**
   * Whether to skip foreign keys enforcement (default: false)
   */
  skipForeignKeys?: boolean;
}

/**
 * Create a configured SQLite database instance
 */
export function createDatabase(options: DatabaseOptions | string): Database.Database {
  // Handle simple string path
  const opts: DatabaseOptions = typeof options === 'string'
    ? { path: options }
    : options;

  const {
    path,
    verbose = false,
    readonly = false,
    busyTimeout = DATABASE.BUSY_TIMEOUT_MS,
    skipWAL = false,
    skipForeignKeys = false,
  } = opts;

  // Create database instance
  const db = new Database(path, {
    verbose: verbose ? (message?: unknown, ...args: unknown[]) => {
      logger.debug('SQLite:', String(message), ...args);
    } : undefined,
    readonly,
  });

  // Configure database settings
  try {
    // Set busy timeout
    db.pragma(`busy_timeout = ${busyTimeout}`);

    // Enable WAL mode (unless skipped or in-memory)
    if (!skipWAL && path !== ':memory:') {
      db.pragma(`journal_mode = ${DATABASE.JOURNAL_MODE}`);
    }

    // Enable foreign keys (unless skipped)
    if (!skipForeignKeys) {
      db.pragma(`foreign_keys = ${DATABASE.FOREIGN_KEYS}`);
    }

    logger.debug('Database initialized', {
      path: path === ':memory:' ? 'in-memory' : path,
      walMode: !skipWAL && path !== ':memory:',
      foreignKeys: !skipForeignKeys,
      busyTimeout,
    });
  } catch (error) {
    logger.error('Failed to configure database', {
      path,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }

  return db;
}

/**
 * Create a test database (in-memory by default)
 */
export function createTestDatabase(path: string = ':memory:'): Database.Database {
  return createDatabase({
    path,
    verbose: false,
    skipWAL: path === ':memory:',
  });
}

/**
 * Database Factory class (for dependency injection scenarios)
 */
export class DatabaseFactory {
  private static instances: Map<string, Database.Database> = new Map();

  /**
   * Create a new database instance
   */
  static create(options: DatabaseOptions | string): Database.Database {
    return createDatabase(options);
  }

  /**
   * Get or create a singleton database instance for a given path
   * Useful for shared database connections
   */
  static getInstance(path: string): Database.Database {
    if (!this.instances.has(path)) {
      const db = createDatabase(path);
      this.instances.set(path, db);
    }
    return this.instances.get(path)!;
  }

  /**
   * Close and remove a singleton instance
   */
  static closeInstance(path: string): void {
    const db = this.instances.get(path);
    if (db) {
      db.close();
      this.instances.delete(path);
    }
  }

  /**
   * Close all singleton instances
   */
  static closeAll(): void {
    for (const db of this.instances.values()) {
      db.close();
    }
    this.instances.clear();
  }
}
