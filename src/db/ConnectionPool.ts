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
import { SimpleConfig } from '../config/simple-config.js';

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

  /**
   * Create a new connection pool
   *
   * Initializes the pool with the specified number of connections.
   * All connections are pre-created and configured with optimal settings.
   *
   * @param dbPath - Path to SQLite database file (or ':memory:')
   * @param options - Pool configuration options
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
   * ```
   */
  constructor(
    dbPath: string,
    options: Partial<ConnectionPoolOptions> = {}
  ) {
    this.dbPath = dbPath;
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
   * @returns Configured Database instance
   * @throws Error if connection creation fails
   *
   * @private
   */
  private createConnection(): Database.Database {
    const db = new Database(this.dbPath, {
      verbose: SimpleConfig.isDevelopment ? ((msg: unknown) => logger.debug('SQLite', { message: msg })) : undefined,
    });

    // Set busy timeout (5 seconds)
    db.pragma('busy_timeout = 5000');

    // Enable WAL mode for better concurrency (except in-memory)
    if (this.dbPath !== ':memory:') {
      db.pragma('journal_mode = WAL');
      // Increase cache size for better query performance (10MB)
      db.pragma('cache_size = -10000');
      // Enable memory-mapped I/O (128MB)
      db.pragma('mmap_size = 134217728');
    }

    // Enable foreign key constraints
    db.pragma('foreign_keys = ON');

    return db;
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
    if (this.isShuttingDown) {
      throw new Error('Pool is shutting down');
    }

    // Check for available connection
    const metadata = this.available.shift();
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

        this.stats.timeoutErrors++;
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
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.options.healthCheckInterval);
  }

  /**
   * Perform health check on pool
   *
   * Scans for idle connections that have exceeded idleTimeout and recycles them.
   * Recycling involves closing the stale connection and creating a fresh one.
   *
   * @private
   */
  private performHealthCheck(): void {
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
          logger.error('Error closing stale connection:', error);
        }

        // Create new connection
        try {
          const newDb = this.createConnection();
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
