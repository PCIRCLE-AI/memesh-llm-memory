/**
 * SQLite Connection Pool for better-sqlite3
 *
 * Provides connection pooling for SQLite databases to improve performance
 * and resource management under concurrent query scenarios.
 *
 * Features:
 * - Configurable pool size (default: 5 connections)
 * - Connection timeout handling (default: 5000ms)
 * - Idle timeout for connection recycling (default: 30000ms)
 * - Queue management for waiting requests
 * - Health checks for stale connections
 * - Automatic connection recycling
 * - Graceful shutdown support
 *
 * Architecture:
 * - Pre-creates a pool of connections on initialization
 * - Uses FIFO queue for fair resource allocation
 * - Implements idle timeout to prevent stale connections
 * - Validates connections before returning to pool
 * - Thread-safe operation with promise-based API
 *
 * @example
 * ```typescript
 * // Create pool
 * const pool = new ConnectionPool('/path/to/db.sqlite', {
 *   maxConnections: 5,
 *   connectionTimeout: 5000,
 *   idleTimeout: 30000
 * });
 *
 * // Acquire connection
 * const db = await pool.acquire();
 * try {
 *   // Use connection
 *   const result = db.prepare('SELECT * FROM users').all();
 * } finally {
 *   // Always release back to pool
 *   pool.release(db);
 * }
 *
 * // Check pool health
 * const stats = pool.getStats();
 * console.log(stats); // { total: 5, active: 2, idle: 3, waiting: 0 }
 *
 * // Cleanup on shutdown
 * await pool.shutdown();
 * ```
 */

import Database from 'better-sqlite3';
import { logger } from '../utils/logger.js';
import type { ILogger } from '../utils/ILogger.js';

/**
 * Connection Pool Configuration Options
 *
 * Defines configurable parameters for connection pool behavior.
 * All timeouts are in milliseconds.
 */
export interface ConnectionPoolOptions {
  /**
   * Maximum number of connections in the pool
   *
   * Controls the size of the connection pool. Higher values allow more
   * concurrent queries but consume more memory.
   *
   * **Recommendations**:
   * - Development: 3-5 connections
   * - Production: 5-10 connections
   * - High-load: 10-20 connections
   *
   * **Default**: 5
   */
  maxConnections: number;

  /**
   * Maximum time to wait for an available connection (milliseconds)
   *
   * If a connection is not available within this timeout, acquire() will
   * reject with a timeout error. Prevents indefinite waiting.
   *
   * **Default**: 5000ms (5 seconds)
   */
  connectionTimeout: number;

  /**
   * Maximum idle time before connection is recycled (milliseconds)
   *
   * Connections idle longer than this timeout will be closed and recreated
   * to prevent stale connections and free up resources.
   *
   * **Default**: 30000ms (30 seconds)
   */
  idleTimeout: number;

  /**
   * Interval for health check sweep (milliseconds)
   *
   * How often to scan the pool for stale/idle connections.
   *
   * **Default**: 10000ms (10 seconds)
   */
  healthCheckInterval?: number;
}

/**
 * Pool Statistics
 *
 * Provides real-time metrics about the connection pool state.
 * Useful for monitoring, debugging, and capacity planning.
 */
export interface PoolStats {
  /**
   * Total number of connections in the pool
   *
   * This is the configured maxConnections value.
   */
  total: number;

  /**
   * Number of connections currently in use
   *
   * Connections that have been acquired and not yet released.
   */
  active: number;

  /**
   * Number of idle connections available
   *
   * Connections ready to be acquired immediately.
   */
  idle: number;

  /**
   * Number of requests waiting for a connection
   *
   * Indicates pool saturation. If this is consistently high,
   * consider increasing maxConnections.
   */
  waiting: number;

  /**
   * Total connections acquired since pool creation
   *
   * Lifetime counter, useful for usage tracking.
   */
  totalAcquired: number;

  /**
   * Total connections released since pool creation
   *
   * Should closely match totalAcquired in healthy pools.
   */
  totalReleased: number;

  /**
   * Number of connection recycling operations
   *
   * Indicates how often idle connections are being cleaned up.
   */
  totalRecycled: number;

  /**
   * Number of acquire timeout errors
   *
   * High values indicate pool undersizing or slow queries.
   */
  timeoutErrors: number;
}

/**
 * Connection Metadata
 *
 * Tracks per-connection state for health monitoring.
 *
 * @internal
 */
interface ConnectionMetadata {
  /** The actual database connection */
  db: Database.Database;

  /** Timestamp when connection was last acquired */
  lastAcquired: number;

  /** Timestamp when connection was last released */
  lastReleased: number;

  /** Total number of times this connection has been used */
  usageCount: number;
}

/**
 * SQLite Connection Pool
 *
 * Manages a pool of SQLite database connections for improved performance
 * and resource utilization under concurrent workloads.
 *
 * **Thread Safety**: This implementation is NOT thread-safe at the JavaScript
 * level (single-threaded event loop), but handles async concurrency safely
 * using promises and queues.
 *
 * **Error Handling**: Failed connections are automatically removed and replaced.
 * Pool degradation is logged for monitoring.
 *
 * **Graceful Shutdown**: Call shutdown() before process exit to ensure all
 * connections are properly closed.
 */
export class ConnectionPool {
  private readonly dbPath: string;
  private readonly options: Required<ConnectionPoolOptions>;
  private readonly verboseLogger?: ILogger;
  private readonly pool: ConnectionMetadata[] = [];
  private readonly available: ConnectionMetadata[] = [];
  private readonly waiting: Array<{
    resolve: (db: Database.Database) => void;
    reject: (error: Error) => void;
    timeoutId: NodeJS.Timeout;
  }> = [];

  // Statistics
  private stats = {
    totalAcquired: 0,
    totalReleased: 0,
    totalRecycled: 0,
    timeoutErrors: 0,
  };

  private healthCheckTimer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  // ✅ FIX P1-16: Track consecutive health check errors for escalation
  private healthCheckErrorCount: number = 0;
  private readonly MAX_CONSECUTIVE_HEALTH_CHECK_ERRORS = 5;

  /**
   * Create a new connection pool
   *
   * Initializes the pool with the specified number of connections.
   * All connections are pre-created and configured with optimal settings.
   *
   * @param dbPath - Path to SQLite database file (or ':memory:')
   * @param options - Pool configuration options
   * @param verboseLogger - Optional logger for verbose SQLite output (development mode)
   * @throws Error if pool initialization fails
   *
   * @example
   * ```typescript
   * // Default configuration
   * const pool = new ConnectionPool('/data/app.db');
   *
   * // Custom configuration
   * const pool = new ConnectionPool('/data/app.db', {
   *   maxConnections: 10,
   *   connectionTimeout: 3000,
   *   idleTimeout: 60000,
   *   healthCheckInterval: 15000
   * });
   *
   * // With verbose logging
   * const pool = new ConnectionPool('/data/app.db', {}, myLogger);
   * ```
   */
  constructor(
    dbPath: string,
    options: Partial<ConnectionPoolOptions> = {},
    verboseLogger?: ILogger
  ) {
    this.dbPath = dbPath;
    this.verboseLogger = verboseLogger;
    this.options = {
      maxConnections: options.maxConnections ?? 5,
      connectionTimeout: options.connectionTimeout ?? 5000,
      idleTimeout: options.idleTimeout ?? 30000,
      healthCheckInterval: options.healthCheckInterval ?? 10000,
    };

    // Validate options
    if (this.options.maxConnections < 1) {
      throw new Error('maxConnections must be at least 1');
    }

    logger.info('Initializing connection pool', {
      dbPath: this.dbPath,
      maxConnections: this.options.maxConnections,
      connectionTimeout: this.options.connectionTimeout,
      idleTimeout: this.options.idleTimeout,
    });

    // Pre-create connections
    this.initializePool();

    // Start health check timer
    this.startHealthCheck();
  }

  /**
   * Initialize the connection pool
   *
   * Pre-creates all connections in the pool. Connections are created
   * synchronously to ensure pool is ready before constructor returns.
   *
   * @private
   */
  private initializePool(): void {
    for (let i = 0; i < this.options.maxConnections; i++) {
      try {
        const db = this.createConnection();
        const metadata: ConnectionMetadata = {
          db,
          lastAcquired: 0,
          lastReleased: Date.now(),
          usageCount: 0,
        };
        this.pool.push(metadata);
        this.available.push(metadata);
      } catch (error) {
        logger.error(`Failed to create connection ${i + 1}/${this.options.maxConnections}:`, error);
        throw new Error(`Pool initialization failed: ${error}`);
      }
    }

    logger.info(`Connection pool initialized with ${this.pool.length} connections`);
  }

  /**
   * Create a new database connection
   *
   * Internal method to create and configure SQLite connections.
   * Applies optimizations similar to SimpleDatabaseFactory.
   *
   * ✅ FIX HIGH-2: Removed retry logic to prevent event loop blocking
   * Retries are now handled by async callers (acquire, healthCheck, restorePoolSize)
   *
   * @returns Configured Database instance
   * @throws Error if connection creation fails
   *
   * @private
   */
  private createConnection(): Database.Database {
    const db = new Database(this.dbPath, {
      verbose: this.verboseLogger ? ((msg: unknown) => this.verboseLogger!.debug('SQLite', { message: msg })) : undefined,
    });

    // Set busy timeout (5 seconds)
    try {
      db.pragma('busy_timeout = 5000');
    } catch (error) {
      logger.warn('[ConnectionPool] Could not set busy_timeout pragma:', error);
    }

    // ✅ FIX LOW-3: Graceful degradation when pragmas fail
    // Enable WAL mode for better concurrency (except in-memory)
    if (this.dbPath !== ':memory:') {
      try {
        const journalMode = db.pragma('journal_mode = WAL', { simple: true }) as string;
        if (journalMode.toLowerCase() !== 'wal') {
          logger.warn('[ConnectionPool] Failed to enable WAL mode, using: ' + journalMode);
        }
      } catch (error) {
        logger.warn('[ConnectionPool] Could not set journal_mode to WAL:', error);
      }

      // Increase cache size for better query performance (10MB)
      try {
        db.pragma('cache_size = -10000');
      } catch (error) {
        logger.debug('[ConnectionPool] Could not set cache_size:', error);
      }

      // Enable memory-mapped I/O (128MB)
      try {
        db.pragma('mmap_size = 134217728');
      } catch (error) {
        logger.debug('[ConnectionPool] Could not set mmap_size:', error);
      }
    }

    // Enable foreign key constraints (critical - throw if this fails)
    db.pragma('foreign_keys = ON');

    return db;
  }

  /**
   * Create connection with retry logic (async)
   *
   * ✅ FIX HIGH-2: Async retry logic with proper delays (no event loop blocking)
   *
   * @param context - Context string for logging
   * @returns Configured Database instance
   * @throws Error if connection creation fails after all retries
   *
   * @private
   */
  private async createConnectionWithRetry(context: string): Promise<Database.Database> {
    const MAX_RETRIES = 3;
    const RETRY_DELAYS = [100, 300, 1000]; // Exponential backoff in ms

    let lastError: Error | undefined;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return this.createConnection();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable (SQLITE_BUSY or database locked)
        const isRetryable =
          lastError.message.includes('SQLITE_BUSY') ||
          lastError.message.includes('database is locked') ||
          lastError.message.includes('SQLITE_LOCKED');

        if (!isRetryable || attempt === MAX_RETRIES - 1) {
          // Not retryable or last attempt - throw error
          throw lastError;
        }

        // Wait before retry (async, no event loop blocking!)
        const delay = RETRY_DELAYS[attempt];
        logger.warn(`[ConnectionPool] ${context}: Connection creation failed, retrying...`, {
          attempt: attempt + 1,
          maxRetries: MAX_RETRIES,
          delay,
          error: lastError.message,
        });

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('Connection creation failed');
  }

  /**
   * Validate that a connection is still functional
   *
   * Executes a simple query to verify the connection is responsive.
   *
   * @param db - Database connection to validate
   * @returns true if connection is valid, false otherwise
   *
   * @private
   */
  private isConnectionValid(db: Database.Database): boolean {
    try {
      // Simple query to test connection is responsive
      db.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get a valid connection from available pool, recycling invalid ones
   *
   * @returns ConnectionMetadata with valid connection, or undefined if none available
   * @private
   */
  private async getValidConnection(): Promise<ConnectionMetadata | undefined> {
    while (this.available.length > 0) {
      const metadata = this.available.shift()!;

      if (this.isConnectionValid(metadata.db)) {
        return metadata;
      }

      // Connection is invalid - recycle it
      logger.warn('Found invalid connection in pool - recycling', {
        usageCount: metadata.usageCount,
      });

      try {
        metadata.db.close();
      } catch {
        // Ignore close errors for invalid connections
      }

      // Create replacement connection
      try {
        // ✅ FIX HIGH-2: Use async retry to avoid blocking event loop
        const newDb = await this.createConnectionWithRetry('acquire fallback');
        const newMetadata: ConnectionMetadata = {
          db: newDb,
          lastAcquired: 0,
          lastReleased: Date.now(),
          usageCount: 0,
        };

        // Replace in pool
        const poolIndex = this.pool.indexOf(metadata);
        if (poolIndex !== -1) {
          this.pool[poolIndex] = newMetadata;
        }

        // Add replacement back to available and continue loop
        this.available.push(newMetadata);
        this.stats.totalRecycled++;
      } catch (error) {
        logger.error('Failed to create replacement connection:', error);
        // Pool degradation - connection lost
      }
    }

    return undefined;
  }

  /**
   * Acquire a connection from the pool
   *
   * Returns an available connection or waits for one to become available.
   * If no connection is available within connectionTimeout, throws an error.
   *
   * **IMPORTANT**: Always release the connection back to the pool when done,
   * preferably in a try/finally block to ensure release even on errors.
   *
   * @returns Promise that resolves to a Database connection
   * @throws Error if connection timeout or pool is shutting down
   *
   * @example
   * ```typescript
   * const db = await pool.acquire();
   * try {
   *   const users = db.prepare('SELECT * FROM users').all();
   *   // ... use connection ...
   * } finally {
   *   pool.release(db); // Always release
   * }
   * ```
   */
  async acquire(): Promise<Database.Database> {
    // ✅ FIX MEDIUM-3: Wrap entire acquisition in timeout to prevent hangs
    return Promise.race([
      this._acquireInternal(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => {
            // Track timeout error at outer level (Promise.race ensures this runs first)
            this.stats.timeoutErrors++;
            reject(new Error(`Connection acquisition timeout after ${this.options.connectionTimeout}ms`));
          },
          this.options.connectionTimeout
        )
      ),
    ]);
  }

  /**
   * ✅ FIX MEDIUM-3: Internal acquisition logic (extracted for timeout wrapping)
   * @private
   */
  private async _acquireInternal(): Promise<Database.Database> {
    if (this.isShuttingDown) {
      throw new Error('Pool is shutting down');
    }

    // Check for available valid connection
    const metadata = await this.getValidConnection();
    if (metadata) {
      metadata.lastAcquired = Date.now();
      metadata.usageCount++;
      this.stats.totalAcquired++;

      logger.debug('Connection acquired from pool', {
        active: this.pool.length - this.available.length,
        idle: this.available.length,
      });

      return metadata.db;
    }

    // No available connection - wait for one
    logger.debug('No available connection - queuing request', {
      waiting: this.waiting.length + 1,
    });

    return new Promise<Database.Database>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        // Remove from waiting queue
        const index = this.waiting.findIndex(w => w.timeoutId === timeoutId);
        if (index !== -1) {
          this.waiting.splice(index, 1);
        }

        // Note: timeoutErrors is tracked at outer Promise.race level in acquire()
        reject(new Error(`Connection acquisition timeout after ${this.options.connectionTimeout}ms`));
      }, this.options.connectionTimeout);

      this.waiting.push({ resolve, reject, timeoutId });
    });
  }

  /**
   * Release a connection back to the pool
   *
   * Returns the connection to the available pool. If there are waiting
   * requests, the connection is immediately given to the next waiting request.
   *
   * **Important**: Only release connections that were acquired from this pool.
   * Releasing a foreign connection will cause undefined behavior.
   *
   * @param db - Database connection to release
   *
   * @example
   * ```typescript
   * const db = await pool.acquire();
   * try {
   *   // ... use connection ...
   * } finally {
   *   pool.release(db); // Always release in finally
   * }
   * ```
   */
  release(db: Database.Database): void {
    if (this.isShuttingDown) {
      logger.warn('Attempted to release connection during shutdown - ignoring');
      return;
    }

    // Find the connection metadata
    const metadata = this.pool.find(m => m.db === db);
    if (!metadata) {
      logger.error('Attempted to release unknown connection - ignoring');
      return;
    }

    metadata.lastReleased = Date.now();
    this.stats.totalReleased++;

    // Guard against double release (prevents duplicate available entries)
    const availableIndex = this.available.indexOf(metadata);
    if (availableIndex !== -1) {
      logger.warn('Connection already released - ignoring duplicate release');
      return;
    }

    // Check if there are waiting requests
    const waiting = this.waiting.shift();
    if (waiting) {
      clearTimeout(waiting.timeoutId);
      metadata.lastAcquired = Date.now();
      metadata.usageCount++;
      this.stats.totalAcquired++;

      logger.debug('Connection immediately reassigned to waiting request', {
        waiting: this.waiting.length,
      });

      waiting.resolve(db);
      return;
    }

    // No waiting requests - return to available pool
    this.available.push(metadata);

    logger.debug('Connection released back to pool', {
      active: this.pool.length - this.available.length,
      idle: this.available.length,
    });
  }

  /**
   * Get pool statistics
   *
   * Returns real-time metrics about the pool state. Useful for monitoring,
   * debugging, and capacity planning.
   *
   * @returns Current pool statistics
   *
   * @example
   * ```typescript
   * const stats = pool.getStats();
   * console.log(`Pool: ${stats.active} active, ${stats.idle} idle, ${stats.waiting} waiting`);
   *
   * if (stats.waiting > stats.total * 0.5) {
   *   console.warn('Pool is saturated - consider increasing maxConnections');
   * }
   * ```
   */
  getStats(): PoolStats {
    return {
      total: this.pool.length,
      active: this.pool.length - this.available.length,
      idle: this.available.length,
      waiting: this.waiting.length,
      totalAcquired: this.stats.totalAcquired,
      totalReleased: this.stats.totalReleased,
      totalRecycled: this.stats.totalRecycled,
      timeoutErrors: this.stats.timeoutErrors,
    };
  }

  /**
   * Start health check timer
   *
   * Periodically scans the pool for idle connections that exceed idleTimeout
   * and recycles them to prevent stale connections.
   *
   * @private
   */
  private startHealthCheck(): void {
    // ✅ FIX BUG-5: Clear existing timer before creating new one to prevent duplicates
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }

    // ✅ FIX BUG-5: Wrap performHealthCheck in try-catch to prevent timer breakage
    // ✅ FIX P1-16: Track consecutive errors and escalate on persistent failures
    // ✅ FIX HIGH-2: Handle async performHealthCheck
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck()
        .then(() => {
          // Reset error count on successful health check
          this.healthCheckErrorCount = 0;
        })
        .catch((error) => {
          this.healthCheckErrorCount++;

          logger.error('[ConnectionPool] Health check error:', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            consecutiveErrors: this.healthCheckErrorCount,
          });

          // ✅ FIX P1-16: Escalate after consecutive failures
          if (this.healthCheckErrorCount >= this.MAX_CONSECUTIVE_HEALTH_CHECK_ERRORS) {
            logger.error(
              `[ConnectionPool] Health check failed ${this.healthCheckErrorCount} times consecutively - shutting down pool`,
              {
                dbPath: this.dbPath,
                maxErrors: this.MAX_CONSECUTIVE_HEALTH_CHECK_ERRORS,
              }
            );

            // Clear the timer to prevent further checks
            if (this.healthCheckTimer) {
              clearInterval(this.healthCheckTimer);
              this.healthCheckTimer = null;
            }

            // Initiate graceful shutdown
            this.shutdown().catch((shutdownError) => {
              logger.error('[ConnectionPool] Shutdown after health check failures failed:', {
                error: shutdownError instanceof Error ? shutdownError.message : String(shutdownError),
              });
            });
          }
        });
    }, this.options.healthCheckInterval);
  }

  /**
   * Perform health check on pool
   *
   * Scans for idle connections that have exceeded idleTimeout and recycles them.
   * Recycling involves closing the stale connection and creating a fresh one.
   *
   * ✅ FIX MEDIUM-1: Skip health check if pool is shutting down
   * ✅ FIX HIGH-2: Made async to use non-blocking retry logic
   *
   * @private
   */
  private async performHealthCheck(): Promise<void> {
    // ✅ FIX MEDIUM-1: Don't perform health checks during shutdown
    if (this.isShuttingDown) {
      return;
    }

    const now = Date.now();
    let recycledCount = 0;

    // Check idle connections
    for (let i = this.available.length - 1; i >= 0; i--) {
      const metadata = this.available[i];
      const idleTime = now - metadata.lastReleased;

      if (idleTime > this.options.idleTimeout) {
        logger.debug('Recycling idle connection', {
          idleTime,
          usageCount: metadata.usageCount,
        });

        // Remove from available
        this.available.splice(i, 1);

        // Close stale connection
        try {
          metadata.db.close();
        } catch (error) {
          // ✅ FIX MEDIUM-1: Implement proper error recovery for zombie connections
          logger.error('Error closing stale connection:', error);

          // Force cleanup: remove zombie connection from pool to prevent accumulation
          const poolIndex = this.pool.indexOf(metadata);
          if (poolIndex !== -1) {
            this.pool.splice(poolIndex, 1);
            logger.warn('[ConnectionPool] Removed zombie connection from pool', {
              poolSize: this.pool.length,
              targetSize: this.options.maxConnections,
            });
          }
        }

        // Create new connection
        try {
          // ✅ FIX HIGH-2: Use async retry to avoid blocking event loop
          const newDb = await this.createConnectionWithRetry('health check');
          const newMetadata: ConnectionMetadata = {
            db: newDb,
            lastAcquired: 0,
            lastReleased: now,
            usageCount: 0,
          };

          // Replace in pool
          const poolIndex = this.pool.indexOf(metadata);
          if (poolIndex !== -1) {
            this.pool[poolIndex] = newMetadata;
          }

          // Add back to available
          this.available.push(newMetadata);
          recycledCount++;
          this.stats.totalRecycled++;
        } catch (error) {
          logger.error('Failed to create replacement connection:', error);
          // Pool degradation - connection lost
        }
      }
    }

    if (recycledCount > 0) {
      logger.info(`Recycled ${recycledCount} idle connections`);
    }

    // ✅ FIX MAJOR-7: Restore pool to target size after degradation
    await this.restorePoolSize();
  }

  /**
   * ✅ FIX MAJOR-7: Restore degraded pool to maxConnections target
   * ✅ FIX HIGH-2: Made async to use non-blocking retry logic
   *
   * When connection recycling fails, the pool can degrade (shrink from 5 → 4 → 3 → 1).
   * This method detects degradation and attempts to restore the pool to its configured size.
   *
   * Called from performHealthCheck() to ensure pool maintains target size over time.
   */
  private async restorePoolSize(): Promise<void> {
    const currentSize = this.pool.length;
    const targetSize = this.options.maxConnections;
    const deficit = targetSize - currentSize;

    if (deficit > 0) {
      logger.warn('[ConnectionPool] Pool degraded - attempting restoration', {
        currentSize,
        targetSize,
        deficit,
      });

      let restored = 0;
      for (let i = 0; i < deficit; i++) {
        try {
          // ✅ FIX HIGH-2: Use async retry to avoid blocking event loop
          const newDb = await this.createConnectionWithRetry('pool restoration');
          const metadata: ConnectionMetadata = {
            db: newDb,
            lastAcquired: 0,
            lastReleased: Date.now(),
            usageCount: 0,
          };

          this.pool.push(metadata);
          this.available.push(metadata);
          restored++;
        } catch (error) {
          logger.error('[ConnectionPool] Failed to restore pool connection:', error);

          // If we can't create ANY connections, pool is critically degraded
          if (this.pool.length === 0) {
            throw new Error(
              'Connection pool completely degraded - no connections available. ' +
              'Database may be locked or inaccessible.'
            );
          }

          // Stop trying after first failure to avoid excessive error logging
          break;
        }
      }

      if (restored > 0) {
        logger.info('[ConnectionPool] Restored pool connections', {
          restored,
          newSize: this.pool.length,
        });
      }
    }
  }

  /**
   * Shutdown the connection pool
   *
   * Gracefully closes all connections and clears the pool. Should be called
   * during application shutdown to ensure proper cleanup.
   *
   * **Important**: This is irreversible. Once shutdown, the pool cannot be reused.
   * Create a new pool instance if needed.
   *
   * @returns Promise that resolves when all connections are closed
   *
   * @example
   * ```typescript
   * // Graceful shutdown
   * process.on('SIGTERM', async () => {
   *   console.log('Shutting down...');
   *   await pool.shutdown();
   *   process.exit(0);
   * });
   * ```
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn('Pool already shutting down');
      return;
    }

    this.isShuttingDown = true;
    logger.info('Shutting down connection pool');

    // Stop health check
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }

    // Reject all waiting requests
    for (const waiting of this.waiting) {
      clearTimeout(waiting.timeoutId);
      waiting.reject(new Error('Pool is shutting down'));
    }
    this.waiting.length = 0;

    // Close all connections
    const closePromises = this.pool.map(async (metadata) => {
      try {
        metadata.db.close();
      } catch (error) {
        logger.error('Error closing connection during shutdown:', error);
      }
    });

    await Promise.all(closePromises);

    // Clear pools
    this.pool.length = 0;
    this.available.length = 0;

    logger.info('Connection pool shutdown complete');
  }

  /**
   * Check if pool is healthy
   *
   * Returns true if the pool has the expected number of connections
   * and no degradation has occurred.
   *
   * @returns true if pool is healthy, false if degraded
   *
   * @example
   * ```typescript
   * if (!pool.isHealthy()) {
   *   console.error('Pool degradation detected!');
   *   // Alert monitoring, restart pool, etc.
   * }
   * ```
   */
  isHealthy(): boolean {
    return this.pool.length === this.options.maxConnections;
  }
}
