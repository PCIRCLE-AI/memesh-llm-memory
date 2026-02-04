/**
 * Simplified Configuration System - Reads from environment variables only
 * Replaces over-engineered credentials system
 *
 * Purpose:
 * - MCP server doesn't need to manage API keys (uses Claude Code subscription)
 * - Simple environment variable reading, without complex encryption/audit/RBAC
 *
 * Environment Variables:
 * - CLAUDE_MODEL: Claude AI model name (default: claude-sonnet-4-5-20250929)
 * - DATABASE_PATH: SQLite database path (default: ~/.claude-code-buddy/database.db)
 * - NODE_ENV: Environment (development/production/test)
 * - LOG_LEVEL: Log level (debug/info/warn/error, default: info)
 * - BEGINNER_MODE: Enable beginner-friendly guidance (default: true)
 * - EVIDENCE_MODE: Require evidence-based output (default: true)
 */

import { logger } from '../utils/logger.js';
import { getDataPath } from '../utils/PathResolver.js';
import path from 'path';
import { existsSync, mkdirSync } from 'fs';
import { expandHome, resolveUserPath } from '../utils/paths.js';

/**
 * Simplified Configuration Class - All configuration read from environment variables
 *
 * Provides centralized access to all environment-based configuration settings
 * without complex encryption, audit logging, or RBAC systems. Designed for
 * MCP server context where Claude Code manages the Claude API subscription.
 *
 * Features:
 * - **Environment Variable Reading**: All config from process.env
 * - **Sensible Defaults**: Fallback values for optional settings
 * - **Type Safety**: Strongly-typed configuration getters
 * - **Environment Detection**: isDevelopment/isProduction/isTest helpers
 * - **Validation**: validateRequired() checks for missing critical config
 * - **Debugging**: getAll() with sensitive data masking
 *
 * @example
 * ```typescript
 * import { SimpleConfig } from './simple-config.js';
 *
 * // Get configuration values
 * const model = SimpleConfig.CLAUDE_MODEL;
 * const dbPath = SimpleConfig.DATABASE_PATH;
 * const logLevel = SimpleConfig.LOG_LEVEL;
 *
 * // Check environment
 * if (SimpleConfig.isDevelopment) {
 *   console.log('Running in development mode');
 *   console.log(SimpleConfig.getAll()); // Debug: show all config
 * }
 *
 * // Validate configuration
 * const missing = SimpleConfig.validateRequired();
 * if (missing.length > 0) {
 *   throw new Error(`Missing required config: ${missing.join(', ')}`);
 * }
 *
 * // Optional external integrations can be gated by environment flags
 * // if (process.env.FEATURE_FLAG === 'true') { ... }
 * ```
 */
export class SimpleConfig {
  /**
   * Claude AI Model name
   *
   * Specifies which Claude model to use for agent operations. In MCP server context,
   * this is kept as a reference but actual API calls are managed by Claude Code.
   *
   * **Environment Variable**: `CLAUDE_MODEL`
   * **Default**: `'claude-sonnet-4-5-20250929'`
   * **Purpose**: Reference configuration (MCP server doesn't directly call Claude API)
   *
   * @example
   * ```typescript
   * const model = SimpleConfig.CLAUDE_MODEL;
   * console.log(model); // 'claude-sonnet-4-5-20250929' (or custom from env)
   * ```
   */
  static get CLAUDE_MODEL(): string {
    return process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';
  }

  /**
   * SQLite database file path
   *
   * Path to the SQLite database file used for persistent storage of agent data,
   * session history, and system state.
   *
   * **Environment Variable**: `DATABASE_PATH`
   * **Default**: `~/.claude-code-buddy/database.db`
   * **Purpose**: SQLite database storage location
   *
   * @example
   * ```typescript
   * const dbPath = SimpleConfig.DATABASE_PATH;
   * console.log(dbPath); // '/Users/username/.claude-code-buddy/database.db'
   *
   * // Custom database location
   * // export DATABASE_PATH=/var/lib/claude-code-buddy/db.sqlite
   * ```
   */
  static get DATABASE_PATH(): string {
    // Support multiple environment variable names for backward compatibility
    const raw = process.env.DATABASE_PATH
      || process.env.MEMESH_DATABASE_PATH
      || process.env.CCB_DATABASE_PATH
      || process.env.CLAUDE_CODE_BUDDY_DATABASE_PATH
      || getDataPath('database.db'); // Use PathResolver for automatic fallback
    return expandHome(raw);
  }

  /**
   * Beginner-friendly guidance mode
   *
   * Enables plain-language summaries and step-by-step guidance in prompts.
   *
   * **Environment Variable**: `BEGINNER_MODE`
   * **Default**: `true`
   */
  static get BEGINNER_MODE(): boolean {
    return this.parseBoolean(process.env.BEGINNER_MODE, true);
  }

  /**
   * Evidence-first output guard
   *
   * Instructs agents to cite file paths/commands and label assumptions.
   *
   * **Environment Variable**: `EVIDENCE_MODE`
   * **Default**: `true`
   */
  static get EVIDENCE_MODE(): boolean {
    return this.parseBoolean(process.env.EVIDENCE_MODE, true);
  }

  /**
   * Node.js environment name
   *
   * Indicates the current runtime environment (development/production/test).
   * Used to enable/disable features and adjust logging/debugging behavior.
   *
   * **Environment Variable**: `NODE_ENV`
   * **Default**: `'development'`
   * **Valid Values**: 'development' | 'production' | 'test'
   * **Purpose**: Environment-specific behavior configuration
   *
   * @example
   * ```typescript
   * const env = SimpleConfig.NODE_ENV;
   * console.log(env); // 'development' (default)
   *
   * // Check environment
   * if (env === 'production') {
   *   // Disable verbose logging
   * } else {
   *   // Enable debug features
   * }
   * ```
   */
  static get NODE_ENV(): string {
    return process.env.NODE_ENV || 'development';
  }

  /**
   * Logging level
   *
   * Controls the verbosity of application logging. Invalid values fallback to 'info'.
   *
   * **Environment Variable**: `LOG_LEVEL`
   * **Default**: `'info'`
   * **Valid Values**: 'debug' | 'info' | 'warn' | 'error'
   * **Purpose**: Control logging verbosity
   * **Validation**: Invalid values fallback to 'info'
   *
   * @example
   * ```typescript
   * const logLevel = SimpleConfig.LOG_LEVEL;
   * console.log(logLevel); // 'info' (default)
   *
   * // Valid levels
   * // export LOG_LEVEL=debug  → 'debug' (most verbose)
   * // export LOG_LEVEL=info   → 'info' (normal)
   * // export LOG_LEVEL=warn   → 'warn' (warnings only)
   * // export LOG_LEVEL=error  → 'error' (errors only)
   *
   * // Invalid level fallback
   * // export LOG_LEVEL=trace  → 'info' (fallback to default)
   * ```
   */
  static get LOG_LEVEL(): 'debug' | 'info' | 'warn' | 'error' {
    const level = process.env.LOG_LEVEL || 'info';
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      return level as 'debug' | 'info' | 'warn' | 'error';
    }
    return 'info';
  }

  /**
   * Check if running in development environment
   *
   * Convenience method that returns true if NODE_ENV is 'development'.
   * Useful for enabling debug features, verbose logging, and development tools.
   *
   * @returns True if NODE_ENV === 'development', false otherwise
   *
   * @example
   * ```typescript
   * if (SimpleConfig.isDevelopment) {
   *   console.log('Development mode - enabling debug features');
   *   // Enable source maps, verbose logging, hot reload
   * }
   * ```
   */
  static get isDevelopment(): boolean {
    return this.NODE_ENV === 'development';
  }

  /**
   * Check if running in production environment
   *
   * Convenience method that returns true if NODE_ENV is 'production'.
   * Useful for enabling performance optimizations and disabling debug features.
   *
   * @returns True if NODE_ENV === 'production', false otherwise
   *
   * @example
   * ```typescript
   * if (SimpleConfig.isProduction) {
   *   console.log('Production mode - optimizations enabled');
   *   // Disable debug logging, enable caching, minify assets
   * }
   * ```
   */
  static get isProduction(): boolean {
    return this.NODE_ENV === 'production';
  }

  /**
   * Check if running in test environment
   *
   * Convenience method that returns true if NODE_ENV is 'test'.
   * Useful for enabling test-specific behavior like mocking and stubbing.
   *
   * @returns True if NODE_ENV === 'test', false otherwise
   *
   * @example
   * ```typescript
   * if (SimpleConfig.isTest) {
   *   console.log('Test mode - using in-memory database');
   *   // Use mock services, in-memory database, fast timeouts
   * }
   * ```
   */
  static get isTest(): boolean {
    return this.NODE_ENV === 'test';
  }

  /**
   * Validate required configuration exists
   *
   * Checks if all critical configuration values are set. In the current MCP server mode,
   * no configuration is strictly required since all values have sensible defaults:
   * - DATABASE_PATH has a default path
   * - CLAUDE_MODEL has a default value
   *
   * This method is provided for future extensibility when required configuration is added.
   *
   * @returns Array of missing configuration keys (currently always empty)
   *
   * @example
   * ```typescript
   * // Validate configuration on application startup
   * const missing = SimpleConfig.validateRequired();
   * if (missing.length > 0) {
   *   throw new Error(`Missing required config: ${missing.join(', ')}`);
   * } else {
   *   console.log('Configuration validated - all required values present');
   * }
   *
   * // Currently always passes (no required config)
   * console.log(missing); // []
   * ```
   */
  static validateRequired(): string[] {
    const missing: string[] = [];

    // DATABASE_PATH has a default value, no validation needed

    // Currently no absolutely required configuration (under MCP server mode)
    return missing;
  }

  /**
   * Get all configuration values (for debugging)
   *
   * Returns a complete snapshot of all configuration values with sensitive information
   * masked for security. Useful for debugging configuration issues, logging startup
   * state, or verifying environment variable loading.
   *
   * **Security Note**: API keys are automatically masked as '***masked***' or empty string
   * to prevent accidental exposure in logs or debug output.
   *
   * @returns Record of all configuration values (API keys masked)
   *
   * @example
   * ```typescript
   * // Debug configuration on startup (development mode only)
   * if (SimpleConfig.isDevelopment) {
   *   console.log('Configuration:', SimpleConfig.getAll());
   *   // {
   *   //   CLAUDE_MODEL: 'claude-sonnet-4-5-20250929',
   *   //   DATABASE_PATH: '/Users/username/.claude-code-buddy/database.db',
   *   //   NODE_ENV: 'development',
   *   //   LOG_LEVEL: 'info',
   *   //   isDevelopment: true,
   *   //   isProduction: false,
   *   //   isTest: false
   *   // }
   * }
   *
   * // Log configuration to file (safe - no API keys exposed)
   * const config = SimpleConfig.getAll();
   * fs.writeFileSync('config.json', JSON.stringify(config, null, 2));
   * ```
   */
  static getAll(): Record<string, string | boolean> {
    return {
      CLAUDE_MODEL: this.CLAUDE_MODEL,
      DATABASE_PATH: this.DATABASE_PATH,
      NODE_ENV: this.NODE_ENV,
      LOG_LEVEL: this.LOG_LEVEL,
      BEGINNER_MODE: this.BEGINNER_MODE,
      EVIDENCE_MODE: this.EVIDENCE_MODE,
      isDevelopment: this.isDevelopment,
      isProduction: this.isProduction,
      isTest: this.isTest,
    };
  }

  private static parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) {
      return defaultValue;
    }

    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) {
      return false;
    }

    return defaultValue;
  }
}

/**
 * Simplified Database Factory - Singleton Pattern with Connection Pooling
 *
 * Replaces the original complex credentials/DatabaseFactory system with a straightforward
 * singleton-based database connection manager. Provides optimized SQLite connections with
 * WAL mode, pragma settings, and connection pooling for improved performance.
 *
 * Features:
 * - **Singleton Pattern**: Cached database connections (one per unique path)
 * - **Connection Pooling**: Optional pooling for concurrent query scenarios
 * - **Connection Reuse**: Avoids creating duplicate connections to the same database
 * - **WAL Mode**: Write-Ahead Logging for better concurrency (production/development)
 * - **Performance Optimization**: Configured with optimal pragma settings
 * - **Resource Management**: Proper cleanup with closeAll() and close()
 * - **Test Mode Support**: In-memory databases for testing (`:memory:`)
 *
 * Optimization Settings:
 * - **busy_timeout**: 5 seconds (prevents immediate "database locked" errors)
 * - **journal_mode**: WAL (Write-Ahead Logging for better concurrency)
 * - **cache_size**: -10000 (10MB cache for query performance)
 * - **mmap_size**: 128MB (memory-mapped I/O)
 * - **foreign_keys**: ON (enforce referential integrity)
 *
 * Connection Pool Settings (configurable via environment):
 * - **DB_POOL_SIZE**: Maximum connections (default: 5)
 * - **DB_POOL_TIMEOUT**: Connection timeout in ms (default: 5000)
 * - **DB_POOL_IDLE_TIMEOUT**: Idle timeout in ms (default: 30000)
 *
 * @example
 * ```typescript
 * import { SimpleDatabaseFactory } from './simple-config.js';
 *
 * // Get database instance (singleton - reuses connection)
 * const db1 = SimpleDatabaseFactory.getInstance();
 * const db2 = SimpleDatabaseFactory.getInstance(); // Same instance as db1
 * console.log(db1 === db2); // true
 *
 * // Get pooled connection (recommended for concurrent queries)
 * const pooledDb = await SimpleDatabaseFactory.getPooledConnection();
 * try {
 *   const result = pooledDb.prepare('SELECT * FROM users').all();
 * } finally {
 *   SimpleDatabaseFactory.releasePooledConnection(pooledDb);
 * }
 *
 * // Check pool statistics
 * const stats = SimpleDatabaseFactory.getPoolStats();
 * console.log(stats); // { total: 5, active: 2, idle: 3, waiting: 0 }
 *
 * // Use custom database path
 * const customDb = SimpleDatabaseFactory.getInstance('/custom/path/db.sqlite');
 *
 * // Create test database (in-memory, no WAL mode)
 * const testDb = SimpleDatabaseFactory.createTestDatabase();
 * testDb.exec('CREATE TABLE test (id INTEGER PRIMARY KEY)');
 *
 * // Query database
 * const stmt = db1.prepare('SELECT * FROM users WHERE id = ?');
 * const user = stmt.get(1);
 *
 * // Cleanup on application shutdown
 * process.on('SIGTERM', async () => {
 *   await SimpleDatabaseFactory.closeAll();
 *   process.exit(0);
 * });
 * ```
 */
import Database from 'better-sqlite3';
import { ConnectionPool, type PoolStats } from '../db/ConnectionPool.js';

export class SimpleDatabaseFactory {
  /**
   * Singleton instances cache
   *
   * Maps database file paths to their corresponding Database instances.
   * Ensures only one connection per unique database path.
   *
   * @internal
   */
  private static instances: Map<string, Database.Database> = new Map();

  /**
   * Connection pools cache
   *
   * Maps database file paths to their corresponding ConnectionPool instances.
   * Used for pooled connection management.
   *
   * @internal
   */
  private static pools: Map<string, ConnectionPool> = new Map();

  /**
   * Create database connection (internal use)
   *
   * Internal method that creates a new SQLite database connection with optimized
   * pragma settings. Configures different settings for test vs production databases.
   *
   * Production/Development Configuration:
   * - WAL mode enabled (better concurrency)
   * - 10MB cache size (faster queries)
   * - 128MB memory-mapped I/O
   * - 5 second busy timeout
   * - Foreign key constraints enabled
   * - Verbose logging in development mode
   *
   * Test Configuration:
   * - No WAL mode (in-memory database)
   * - Standard cache size
   * - No memory-mapped I/O
   * - 5 second busy timeout
   * - Foreign key constraints enabled
   *
   * @param path - Database file path or ':memory:' for in-memory database
   * @param isTest - Whether this is a test database (disables WAL mode)
   * @returns Configured Database instance
   * @throws Error if database creation fails
   *
   * @internal
   *
   * @example
   * ```typescript
   * // Production database
   * const prodDb = SimpleDatabaseFactory['createDatabase']('/data/app.db', false);
   * // Configured with: WAL mode, 10MB cache, 128MB mmap
   *
   * // Test database
   * const testDb = SimpleDatabaseFactory['createDatabase'](':memory:', true);
   * // Configured with: Standard settings, no WAL mode
   * ```
   */
  private static createDatabase(path: string, isTest: boolean = false): Database.Database {
    try {
      this.ensureDirectoryExists(path);
      const db = new Database(path, {
        verbose: SimpleConfig.isDevelopment ? ((msg: unknown) => logger.debug('SQLite', { message: msg })) : undefined,
      });

      // Set busy timeout (5 seconds)
      db.pragma('busy_timeout = 5000');

      // Enable WAL mode for better performance (except test environment)
      if (!isTest) {
        try {
          db.pragma('journal_mode = WAL');
        } catch (error) {
          logger.warn(`WAL mode unavailable for ${path}. Falling back to default journal mode.`, {
            component: 'SimpleDatabaseFactory',
            method: 'createDatabase',
            path,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        // Increase cache size for better query performance (10MB)
        db.pragma('cache_size = -10000');
        // Enable memory-mapped I/O (128MB)
        db.pragma('mmap_size = 134217728');
      }

      // Enable foreign key constraints
      db.pragma('foreign_keys = ON');

      return db;
    } catch (error) {
      logger.error(`Failed to create database at ${path}:`, error);
      throw error;
    }
  }

  /**
   * Normalize database paths to prevent duplicate instances and handle "~".
   */
  private static normalizeDbPath(path?: string): string {
    const rawPath = path || SimpleConfig.DATABASE_PATH;

    if (rawPath === ':memory:' || rawPath.startsWith('file:')) {
      return rawPath;
    }

    return resolveUserPath(rawPath);
  }

  /**
   * Ensure the database directory exists before opening a connection.
   */
  private static ensureDirectoryExists(dbPath: string): void {
    if (dbPath === ':memory:' || dbPath.startsWith('file:')) {
      return;
    }

    const dir = path.dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Get database instance (Singleton pattern)
   *
   * Returns a singleton database instance for the specified path. If a connection
   * already exists and is open, it returns the cached instance. Otherwise, creates
   * a new connection and caches it.
   *
   * Resource Management:
   * - Checks if cached connection is still open
   * - Cleans up stale connections (closed but still in cache)
   * - Creates new connection only when necessary
   * - Caches connection for reuse
   *
   * @param path - Optional database file path (defaults to SimpleConfig.DATABASE_PATH)
   * @returns Singleton Database instance
   * @throws Error if database creation fails
   *
   * @example
   * ```typescript
   * // Default database (from SimpleConfig.DATABASE_PATH)
   * const db1 = SimpleDatabaseFactory.getInstance();
   * const db2 = SimpleDatabaseFactory.getInstance();
   * console.log(db1 === db2); // true (same instance)
   *
   * // Custom database path
   * const customDb = SimpleDatabaseFactory.getInstance('/custom/path/db.sqlite');
   *
   * // Use database
   * const stmt = db1.prepare('SELECT * FROM users WHERE id = ?');
   * const user = stmt.get(1);
   *
   * // Instance is cached - subsequent calls return same connection
   * const db3 = SimpleDatabaseFactory.getInstance(); // Same as db1
   * ```
   */
  static getInstance(path?: string): Database.Database {
    const dbPath = this.normalizeDbPath(path);
    const existingDb = this.instances.get(dbPath);

    // If database exists and is open, return it
    if (existingDb?.open) {
      return existingDb;
    }

    // Close old connection if it exists but is not open (prevent resource leak)
    if (existingDb && !existingDb.open) {
      try {
        existingDb.close();
      } catch (error) {
        // Already closed or error, ignore
      }
      this.instances.delete(dbPath);
    }

    // Create new connection
    const newDb = this.createDatabase(dbPath, false);
    this.instances.set(dbPath, newDb);

    return newDb;
  }

  /**
   * Create test database (in-memory mode)
   *
   * Creates an in-memory SQLite database for testing purposes. In-memory databases
   * are faster, isolated, and automatically cleaned up when the connection closes.
   * WAL mode is disabled for in-memory databases.
   *
   * Test Database Characteristics:
   * - Path: ':memory:' (not persisted to disk)
   * - No WAL mode (in-memory databases don't support WAL)
   * - Standard cache and mmap settings
   * - Foreign key constraints enabled
   * - Isolated (doesn't affect production database)
   * - Automatically cleaned up on close
   *
   * @returns In-memory Database instance (not cached in singleton map)
   *
   * @example
   * ```typescript
   * // Create test database
   * const testDb = SimpleDatabaseFactory.createTestDatabase();
   *
   * // Setup test schema
   * testDb.exec(`
   *   CREATE TABLE users (
   *     id INTEGER PRIMARY KEY,
   *     name TEXT NOT NULL
   *   )
   * `);
   *
   * // Run tests
   * testDb.prepare('INSERT INTO users (name) VALUES (?)').run('Alice');
   * const user = testDb.prepare('SELECT * FROM users WHERE id = 1').get();
   * expect(user.name).toBe('Alice');
   *
   * // Cleanup (database destroyed when connection closes)
   * testDb.close();
   * ```
   */
  static createTestDatabase(): Database.Database {
    return this.createDatabase(':memory:', true);
  }

  /**
   * Get connection pool instance
   *
   * Returns or creates a connection pool for the specified database path.
   * Pool is configured using environment variables or defaults.
   *
   * @param path - Optional database file path (defaults to SimpleConfig.DATABASE_PATH)
   * @returns ConnectionPool instance
   *
   * @example
   * ```typescript
   * const pool = SimpleDatabaseFactory.getPool();
   * const db = await pool.acquire();
   * try {
   *   // ... use connection ...
   * } finally {
   *   pool.release(db);
   * }
   * ```
   */
  static getPool(path?: string): ConnectionPool {
    const dbPath = this.normalizeDbPath(path);
    let pool = this.pools.get(dbPath);

    if (!pool) {
      this.ensureDirectoryExists(dbPath);

      // Read pool configuration from environment variables with fallback to defaults
      const maxConnections = parseInt(process.env.DB_POOL_SIZE || '5', 10) || 5;
      const connectionTimeout = parseInt(process.env.DB_POOL_TIMEOUT || '5000', 10) || 5000;
      const idleTimeout = parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10) || 30000;

      pool = new ConnectionPool(
        dbPath,
        {
          maxConnections,
          connectionTimeout,
          idleTimeout,
        },
        SimpleConfig.isDevelopment ? logger : undefined
      );

      this.pools.set(dbPath, pool);
      logger.info(`Created connection pool for ${dbPath}`, {
        maxConnections,
        connectionTimeout,
        idleTimeout,
      });
    }

    return pool;
  }

  /**
   * Get pooled connection
   *
   * Convenience method to acquire a connection from the default pool.
   * Always release the connection using releasePooledConnection() when done.
   *
   * @param path - Optional database file path (defaults to SimpleConfig.DATABASE_PATH)
   * @returns Promise that resolves to a Database connection
   *
   * @example
   * ```typescript
   * const db = await SimpleDatabaseFactory.getPooledConnection();
   * try {
   *   const users = db.prepare('SELECT * FROM users').all();
   * } finally {
   *   SimpleDatabaseFactory.releasePooledConnection(db);
   * }
   * ```
   */
  static async getPooledConnection(path?: string): Promise<Database.Database> {
    const pool = this.getPool(path);
    return pool.acquire();
  }

  /**
   * Release pooled connection
   *
   * Returns a connection back to the pool. Must be called for every
   * connection acquired via getPooledConnection().
   *
   * @param db - Database connection to release
   * @param path - Optional database file path (defaults to SimpleConfig.DATABASE_PATH)
   *
   * @example
   * ```typescript
   * const db = await SimpleDatabaseFactory.getPooledConnection();
   * try {
   *   // ... use connection ...
   * } finally {
   *   SimpleDatabaseFactory.releasePooledConnection(db);
   * }
   * ```
   */
  static releasePooledConnection(db: Database.Database, path?: string): void {
    const dbPath = this.normalizeDbPath(path);
    const pool = this.pools.get(dbPath);

    if (!pool) {
      logger.error('Attempted to release connection to non-existent pool');
      return;
    }

    pool.release(db);
  }

  /**
   * Get pool statistics
   *
   * Returns statistics for the specified connection pool.
   *
   * @param path - Optional database file path (defaults to SimpleConfig.DATABASE_PATH)
   * @returns Pool statistics or null if pool doesn't exist
   *
   * @example
   * ```typescript
   * const stats = SimpleDatabaseFactory.getPoolStats();
   * if (stats) {
   *   console.log(`Active: ${stats.active}, Idle: ${stats.idle}, Waiting: ${stats.waiting}`);
   * }
   * ```
   */
  static getPoolStats(path?: string): PoolStats | null {
    const dbPath = this.normalizeDbPath(path);
    const pool = this.pools.get(dbPath);
    return pool ? pool.getStats() : null;
  }

  /**
   * Close all database connections and pools
   *
   * Closes all cached database connections and connection pools, then clears caches.
   * Should be called during application shutdown to ensure proper cleanup.
   * Errors during close are logged but don't prevent other connections from closing.
   *
   * Use Cases:
   * - Application shutdown (graceful cleanup)
   * - Test teardown (reset state)
   * - Forced resource cleanup
   *
   * @returns Promise that resolves when all cleanup is complete
   *
   * @example
   * ```typescript
   * // Graceful shutdown on SIGTERM
   * process.on('SIGTERM', async () => {
   *   console.log('Shutting down...');
   *   await SimpleDatabaseFactory.closeAll();
   *   process.exit(0);
   * });
   *
   * // Test cleanup
   * afterAll(async () => {
   *   await SimpleDatabaseFactory.closeAll();
   * });
   *
   * // Force cleanup during error recovery
   * try {
   *   // ... operations ...
   * } catch (error) {
   *   await SimpleDatabaseFactory.closeAll(); // Clean slate
   *   throw error;
   * }
   * ```
   */
  static async closeAll(): Promise<void> {
    // Close all singleton instances
    for (const [path, db] of this.instances.entries()) {
      try {
        db.close();
      } catch (error) {
        logger.error(`Failed to close database at ${path}:`, error);
      }
    }
    this.instances.clear();

    // Shutdown all connection pools
    const poolShutdowns: Promise<void>[] = [];
    for (const [path, pool] of this.pools.entries()) {
      poolShutdowns.push(
        pool.shutdown().catch((error) => {
          logger.error(`Failed to shutdown pool at ${path}:`, error);
        })
      );
    }

    await Promise.all(poolShutdowns);
    this.pools.clear();
  }

  /**
   * Close specific database connection and pool
   *
   * Closes a specific database connection and its pool, removing both from caches.
   * Subsequent getInstance() or getPool() calls for this path will create new instances.
   *
   * @param path - Optional database file path (defaults to SimpleConfig.DATABASE_PATH)
   * @returns Promise that resolves when cleanup is complete
   *
   * @example
   * ```typescript
   * // Close default database
   * await SimpleDatabaseFactory.close();
   *
   * // Close custom database
   * await SimpleDatabaseFactory.close('/custom/path/db.sqlite');
   *
   * // Next getInstance() will create new connection
   * const newDb = SimpleDatabaseFactory.getInstance(); // Fresh connection
   *
   * // Use case: Database file replacement
   * await SimpleDatabaseFactory.close('/data/old.db');
   * fs.renameSync('/data/new.db', '/data/old.db');
   * const db = SimpleDatabaseFactory.getInstance('/data/old.db'); // New file
   * ```
   */
  static async close(path?: string): Promise<void> {
    const dbPath = this.normalizeDbPath(path);

    // Close singleton instance
    const db = this.instances.get(dbPath);
    if (db) {
      try {
        db.close();
        this.instances.delete(dbPath);
      } catch (error) {
        logger.error(`Failed to close database at ${dbPath}:`, error);
      }
    }

    // Shutdown pool
    const pool = this.pools.get(dbPath);
    if (pool) {
      try {
        await pool.shutdown();
        this.pools.delete(dbPath);
      } catch (error) {
        logger.error(`Failed to shutdown pool at ${dbPath}:`, error);
      }
    }
  }
}
