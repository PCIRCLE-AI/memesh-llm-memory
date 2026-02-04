/**
 * Agent Registry
 * Shared SQLite registry for agent discovery
 *
 * This class implements the Singleton pattern to ensure a single database
 * connection is shared across all components. The singleton is tied to a
 * specific database path - attempting to get an instance with a different
 * path will throw an error.
 *
 * ## Usage
 *
 * ```typescript
 * // First call creates the instance
 * const registry = AgentRegistry.getInstance('/path/to/db');
 *
 * // Subsequent calls without path return the same instance
 * const same = AgentRegistry.getInstance(); // OK
 *
 * // Calling with same path is also OK
 * const stillSame = AgentRegistry.getInstance('/path/to/db'); // OK
 *
 * // Calling with DIFFERENT path throws an error
 * AgentRegistry.getInstance('/different/path'); // ERROR!
 * ```
 *
 * ## Testing
 *
 * For tests that need to reset the singleton, use `resetInstance()`:
 *
 * ```typescript
 * afterEach(() => {
 *   AgentRegistry.resetInstance(); // Closes DB and clears singleton
 * });
 * ```
 *
 * ## Thread Safety
 *
 * Node.js is single-threaded, but async operations can interleave. The
 * singleton creation and close operations are synchronous to avoid race
 * conditions. However, callers should ensure proper sequencing of
 * resetInstance() calls in cleanup code.
 */

import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';
import { getDataPath } from '../../utils/PathResolver.js';
import type {
  AgentRegistryEntry,
  RegisterAgentParams,
  AgentCapabilities,
} from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Safely parse JSON string, returning null if invalid
 */
function safeJsonParse<T>(jsonString: string | null | undefined): T | null {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    logger.error('[AgentRegistry] Invalid JSON data', {
      error: error instanceof Error ? error.message : String(error),
      jsonString: jsonString?.substring(0, 100),
    });
    return null;
  }
}

// Database row interface
interface AgentRow {
  agent_id: string;
  base_url: string;
  port: number;
  status: string;
  last_heartbeat: string;
  capabilities: string | null;
  metadata: string | null;
  created_at: string;
  updated_at: string;
}

export class AgentRegistry {
  private db: Database.Database;
  private static instance: AgentRegistry | null = null;
  /** Tracks the database path used to create the current instance */
  private static currentDbPath: string | undefined;
  /**
   * Prepared statement cache for performance optimization
   * Reduces statement compilation overhead for frequently used queries
   */
  private preparedStatements: Map<string, Database.Statement>;

  private constructor(dbPath?: string) {
    // Use PathResolver for automatic fallback to legacy location
    const path = dbPath || getDataPath('a2a-registry.db');

    this.db = new Database(path);
    this.preparedStatements = new Map();
    this.initializeSchema();
  }

  /**
   * Get or create a cached prepared statement
   * Reduces statement compilation overhead for frequently used queries
   *
   * @param key - Unique key for the statement cache
   * @param sql - SQL query to prepare
   * @returns Cached or newly prepared statement
   */
  private getStatement(key: string, sql: string): Database.Statement {
    let stmt = this.preparedStatements.get(key);
    if (!stmt) {
      stmt = this.db.prepare(sql);
      this.preparedStatements.set(key, stmt);
    }
    return stmt;
  }

  /**
   * Get the singleton instance of AgentRegistry.
   *
   * @param dbPath - Optional path to the SQLite database file.
   *                 If not provided, uses the default path from PathResolver.
   *
   * @returns The singleton AgentRegistry instance.
   *
   * @throws Error if called with a different dbPath than the existing instance.
   *         This prevents silent bugs where different parts of the code
   *         expect different databases.
   *
   * @example
   * ```typescript
   * // Create instance with custom path
   * const registry = AgentRegistry.getInstance('/tmp/test.db');
   *
   * // Get same instance (no path needed)
   * const same = AgentRegistry.getInstance();
   *
   * // This throws because instance exists with different path
   * AgentRegistry.getInstance('/other/path.db'); // Error!
   * ```
   */
  static getInstance(dbPath?: string): AgentRegistry {
    if (!AgentRegistry.instance) {
      // Resolve the path now so we can track it
      const resolvedPath = dbPath || getDataPath('a2a-registry.db');
      AgentRegistry.currentDbPath = resolvedPath;
      AgentRegistry.instance = new AgentRegistry(resolvedPath);
      return AgentRegistry.instance;
    }

    // Instance exists - validate the path if one was provided
    if (dbPath !== undefined) {
      const resolvedNewPath = dbPath;
      if (resolvedNewPath !== AgentRegistry.currentDbPath) {
        throw new Error(
          `AgentRegistry singleton already exists with path "${AgentRegistry.currentDbPath}". ` +
            `Cannot create with different path "${resolvedNewPath}". ` +
            `Call AgentRegistry.resetInstance() first if you need a different database.`
        );
      }
    }

    return AgentRegistry.instance;
  }

  /**
   * Reset the singleton instance, properly closing the database connection.
   *
   * This method is primarily intended for testing scenarios where you need
   * to create a fresh instance with a different database path.
   *
   * @remarks
   * - Always call this before creating a new instance with a different path
   * - This method is synchronous to avoid race conditions
   * - Safe to call multiple times (idempotent)
   *
   * @example
   * ```typescript
   * afterEach(() => {
   *   AgentRegistry.resetInstance();
   * });
   * ```
   */
  static resetInstance(): void {
    if (AgentRegistry.instance) {
      try {
        // Clear cached prepared statements (auto-finalized by better-sqlite3 on db.close())
        AgentRegistry.instance.preparedStatements.clear();
        AgentRegistry.instance.db.close();
      } catch (error) {
        // Log but don't throw - the DB might already be closed
        logger.warn('[AgentRegistry] Error closing database during reset', {
          error: error instanceof Error ? error.message : String(error),
        });
      }
      AgentRegistry.instance = null;
      AgentRegistry.currentDbPath = undefined;
    }
  }

  /**
   * Get the current database path used by the singleton instance.
   * Returns undefined if no instance exists.
   *
   * @returns The database path or undefined.
   */
  static getCurrentDbPath(): string | undefined {
    return AgentRegistry.currentDbPath;
  }

  private initializeSchema(): void {
    const schemaPath = join(__dirname, 'registry-schemas.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    this.db.exec(schema);
  }

  register(params: RegisterAgentParams): AgentRegistryEntry {
    const now = new Date().toISOString();

    const existing = this.get(params.agentId);

    if (existing) {
      // Use cached prepared statement for update
      const stmt = this.getStatement(
        'updateAgent',
        `UPDATE agents
         SET base_url = ?, port = ?, status = 'active', last_heartbeat = ?,
             capabilities = ?, metadata = ?, updated_at = ?
         WHERE agent_id = ?`
      );

      stmt.run(
        params.baseUrl,
        params.port,
        now,
        params.capabilities ? JSON.stringify(params.capabilities) : null,
        params.metadata ? JSON.stringify(params.metadata) : null,
        now,
        params.agentId
      );
    } else {
      // Use cached prepared statement for insert
      const stmt = this.getStatement(
        'insertAgent',
        `INSERT INTO agents (agent_id, base_url, port, status, last_heartbeat,
                            capabilities, metadata, created_at, updated_at)
         VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)`
      );

      stmt.run(
        params.agentId,
        params.baseUrl,
        params.port,
        now,
        params.capabilities ? JSON.stringify(params.capabilities) : null,
        params.metadata ? JSON.stringify(params.metadata) : null,
        now,
        now
      );
    }

    return this.get(params.agentId)!;
  }

  get(agentId: string): AgentRegistryEntry | null {
    // Use cached prepared statement
    const stmt = this.getStatement(
      'getAgent',
      'SELECT * FROM agents WHERE agent_id = ?'
    );

    const row = stmt.get(agentId) as AgentRow | undefined;
    if (!row) return null;

    return this.rowToEntry(row);
  }

  listActive(): AgentRegistryEntry[] {
    // Use cached prepared statement
    const stmt = this.getStatement(
      'listActiveAgents',
      "SELECT * FROM agents WHERE status = 'active' ORDER BY last_heartbeat DESC"
    );

    const rows = stmt.all() as AgentRow[];
    return rows.map((row) => this.rowToEntry(row));
  }

  listAll(): AgentRegistryEntry[] {
    // Use cached prepared statement
    const stmt = this.getStatement(
      'listAllAgents',
      'SELECT * FROM agents ORDER BY last_heartbeat DESC'
    );

    const rows = stmt.all() as AgentRow[];
    return rows.map((row) => this.rowToEntry(row));
  }

  heartbeat(agentId: string): boolean {
    const now = new Date().toISOString();

    // Use cached prepared statement
    const stmt = this.getStatement(
      'heartbeat',
      "UPDATE agents SET last_heartbeat = ?, status = 'active', updated_at = ? WHERE agent_id = ?"
    );

    const result = stmt.run(now, now, agentId);
    return result.changes > 0;
  }

  deactivate(agentId: string): boolean {
    const now = new Date().toISOString();

    // Use cached prepared statement
    const stmt = this.getStatement(
      'deactivate',
      "UPDATE agents SET status = 'inactive', updated_at = ? WHERE agent_id = ?"
    );

    const result = stmt.run(now, agentId);
    return result.changes > 0;
  }

  cleanupStale(staleThresholdMs: number = 5 * 60 * 1000): number {
    const threshold = new Date(Date.now() - staleThresholdMs).toISOString();
    const now = new Date().toISOString();

    // Use cached prepared statement
    // Mark both active and inactive agents as stale if heartbeat is old
    const stmt = this.getStatement(
      'cleanupStale',
      "UPDATE agents SET status = 'stale', updated_at = ? WHERE last_heartbeat < ? AND status IN ('active', 'inactive')"
    );

    const result = stmt.run(now, threshold);
    return result.changes;
  }

  deleteStale(): number {
    // Use cached prepared statement
    const stmt = this.getStatement(
      'deleteStale',
      "DELETE FROM agents WHERE status = 'stale'"
    );

    const result = stmt.run();
    return result.changes;
  }

  /**
   * Close the database connection and reset the singleton.
   *
   * @remarks
   * This method closes the database connection and clears the singleton
   * instance, allowing a new instance to be created with a different path.
   *
   * For consistency, prefer using `AgentRegistry.resetInstance()` for
   * cleanup in tests, as it provides the same functionality with better
   * error handling.
   *
   * @deprecated Consider using `AgentRegistry.resetInstance()` instead
   *             for better error handling and consistency.
   */
  close(): void {
    // Delegate to resetInstance for consistent cleanup
    // This ensures currentDbPath is also cleared
    AgentRegistry.resetInstance();
  }

  private rowToEntry(row: AgentRow): AgentRegistryEntry {
    const capabilities = safeJsonParse<AgentCapabilities>(row.capabilities);
    const metadata = safeJsonParse<Record<string, unknown>>(row.metadata);

    return {
      agentId: row.agent_id,
      baseUrl: row.base_url,
      port: row.port,
      status: row.status as 'active' | 'inactive' | 'stale',
      lastHeartbeat: row.last_heartbeat,
      capabilities: capabilities || undefined,
      metadata: metadata || undefined,
    };
  }
}

/**
 * Periodic cleanup timer for stale agents
 */
let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * Default cleanup interval: 5 minutes
 */
const DEFAULT_CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Start periodic cleanup of stale agents.
 * Runs every 5 minutes by default, configurable via AGENT_REGISTRY_CLEANUP_INTERVAL_MS.
 *
 * @example
 * ```typescript
 * // Start cleanup when server starts
 * startAgentRegistryCleanup();
 * ```
 */
export function startAgentRegistryCleanup(): void {
  if (cleanupTimer) {
    return; // Already running
  }

  const intervalMs =
    parseInt(process.env.AGENT_REGISTRY_CLEANUP_INTERVAL_MS || '', 10) ||
    DEFAULT_CLEANUP_INTERVAL_MS;

  const registry = AgentRegistry.getInstance();

  const cleanup = (): void => {
    try {
      // Mark agents as stale if heartbeat is older than 5 minutes
      const markedStale = registry.cleanupStale(5 * 60 * 1000);

      // Delete stale agents from registry
      const deleted = registry.deleteStale();

      if (markedStale > 0 || deleted > 0) {
        logger.info('[Agent Registry] Cleanup completed', {
          markedStale,
          deleted,
        });
      }
    } catch (error) {
      logger.error('[Agent Registry] Cleanup failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  // Run cleanup immediately on start
  cleanup();

  // Then run periodically
  cleanupTimer = setInterval(cleanup, intervalMs);

  logger.info('[Agent Registry] Periodic cleanup started', {
    intervalMs,
  });
}

/**
 * Stop periodic cleanup of stale agents.
 *
 * @example
 * ```typescript
 * // Stop cleanup when server stops
 * stopAgentRegistryCleanup();
 * ```
 */
export function stopAgentRegistryCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    logger.info('[Agent Registry] Periodic cleanup stopped');
  }
}
