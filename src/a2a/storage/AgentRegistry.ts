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
import { execFile } from 'child_process';
import { promisify } from 'util';
import { logger } from '../../utils/logger.js';
import { getDataPath } from '../../utils/PathResolver.js';
import { safeJsonParse } from './jsonUtils.js';
import type {
  AgentRegistryEntry,
  RegisterAgentParams,
  AgentCapabilities,
} from '../types/index.js';

const execFileAsync = promisify(execFile);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database row interface
interface AgentRow {
  agent_id: string;
  base_url: string;
  port: number;
  status: string;
  last_heartbeat: string;
  process_pid: number | null;
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
  /**
   * Flag to prevent concurrent cleanup operations (race condition protection)
   */
  private cleanupInProgress = false;

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

    // Split schema into statements to handle migrations separately
    const statements = schema.split(';').filter((stmt) => stmt.trim());

    for (const statement of statements) {
      const trimmed = statement.trim();
      if (!trimmed) continue;

      // Handle ALTER TABLE migrations safely by checking if column exists first
      if (trimmed.toUpperCase().includes('ALTER TABLE') && trimmed.toUpperCase().includes('ADD COLUMN')) {
        // Extract column name from "ALTER TABLE xxx ADD COLUMN column_name ..."
        const columnMatch = trimmed.match(/ADD\s+COLUMN\s+(\w+)/i);
        if (columnMatch) {
          const columnName = columnMatch[1];
          const tableMatch = trimmed.match(/ALTER\s+TABLE\s+(\w+)/i);
          const tableName = tableMatch ? tableMatch[1] : 'agents';

          // SECURITY: Validate table name against allowlist to prevent SQL injection
          if (!AgentRegistry.VALID_TABLE_NAMES.includes(tableName.toLowerCase())) {
            logger.warn('[AgentRegistry] Skipping migration for unknown table', { tableName });
            continue;
          }

          // Check if column already exists using PRAGMA
          // Safe because tableName is validated against allowlist
          const columns = this.db
            .prepare(`PRAGMA table_info(${tableName})`)
            .all() as Array<{ name: string }>;

          if (columns.some((col) => col.name === columnName)) {
            // Column already exists, skip migration
            continue;
          }
        }
      }

      try {
        this.db.exec(trimmed);
      } catch (error) {
        // Still handle errors gracefully for edge cases
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (trimmed.includes('ALTER TABLE') && errorMsg.includes('duplicate column')) {
          continue;
        }
        throw error;
      }
    }
  }

  register(params: RegisterAgentParams): AgentRegistryEntry {
    const now = new Date().toISOString();

    // SECURITY: Validate PID if provided to prevent killing critical system processes
    if (params.processPid !== undefined && !AgentRegistry.isValidPid(params.processPid)) {
      throw new Error(
        `Invalid processPid: ${params.processPid}. PID must be an integer greater than 1.`
      );
    }

    // Use UPSERT (INSERT OR REPLACE) to avoid TOCTOU race condition
    // This is atomic - no window between check and insert/update
    // Preserves created_at from existing record if present
    const stmt = this.getStatement(
      'upsertAgent',
      `INSERT INTO agents (agent_id, base_url, port, status, last_heartbeat,
                          process_pid, capabilities, metadata, created_at, updated_at)
       VALUES (?, ?, ?, 'active', ?, ?, ?, ?,
               COALESCE((SELECT created_at FROM agents WHERE agent_id = ?), ?), ?)
       ON CONFLICT(agent_id) DO UPDATE SET
         base_url = excluded.base_url,
         port = excluded.port,
         status = 'active',
         last_heartbeat = excluded.last_heartbeat,
         process_pid = excluded.process_pid,
         capabilities = excluded.capabilities,
         metadata = excluded.metadata,
         updated_at = excluded.updated_at`
    );

    stmt.run(
      params.agentId,
      params.baseUrl,
      params.port,
      now,
      params.processPid || null,
      params.capabilities ? JSON.stringify(params.capabilities) : null,
      params.metadata ? JSON.stringify(params.metadata) : null,
      params.agentId,
      now,
      now
    );

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

  /**
   * TTY prefixes that indicate an active terminal session
   * - macOS: ttys00X
   * - Linux: pts/X (pseudo-terminal), ttyX (virtual console)
   */
  private static readonly ACTIVE_TTY_PATTERNS = [
    /^ttys\d+$/, // macOS: ttys000, ttys001, etc.
    /^pts\/\d+$/, // Linux: pts/0, pts/1, etc.
    /^tty\d+$/, // Linux: tty1, tty2, etc.
  ];

  /**
   * Patterns to identify MeMesh server processes (for safe process killing)
   * Used to verify a process is actually a MeMesh server before terminating it
   */
  private static readonly MEMESH_PROCESS_PATTERNS = [
    /server-bootstrap/i,
    /memesh/i,
    /mcp.*server/i,
    /claude-code-buddy/i,
  ];

  /**
   * Valid table names for schema migrations (SQL injection prevention)
   */
  private static readonly VALID_TABLE_NAMES = ['agents'];

  /**
   * Verify that a process is actually a MeMesh server before killing it.
   * This prevents accidentally killing unrelated processes due to PID recycling.
   *
   * @param pid - Process ID to verify
   * @returns true if process command line matches MeMesh server patterns
   */
  private async isMeMeshProcess(pid: number): Promise<boolean> {
    const cmdline = await this.getProcessCommandLine(pid);
    if (!cmdline) return false;

    return AgentRegistry.MEMESH_PROCESS_PATTERNS.some((pattern) => pattern.test(cmdline));
  }

  /**
   * Get the command line of a process by PID
   * @returns Command line string or null if process doesn't exist
   */
  private async getProcessCommandLine(pid: number): Promise<string | null> {
    try {
      if (process.platform === 'win32') {
        const { stdout } = await execFileAsync('wmic', [
          'process', 'where', `ProcessId=${pid}`, 'get', 'CommandLine', '/value',
        ]);
        return stdout || null;
      }

      // macOS / Linux: ps -p <pid> -o args=
      const { stdout } = await execFileAsync('ps', ['-p', String(pid), '-o', 'args=']);
      return stdout?.trim() || null;
    } catch {
      return null;
    }
  }

  /**
   * Validate a PID value for safety
   * @param pid - Process ID to validate
   * @returns true if PID is valid and safe to use
   */
  private static isValidPid(pid: number): boolean {
    // PID must be a positive integer greater than 1
    // PID 0 is the kernel, PID 1 is init/systemd - never kill these
    return Number.isInteger(pid) && pid > 1;
  }

  /**
   * Check if a process is active (has a controlling terminal)
   * Active session = TTY is ttys00X (macOS) or pts/X (Linux)
   * Orphaned process = TTY is ?? (no controlling terminal)
   *
   * @param pid - Process ID to check
   * @returns true if process is active (has TTY), false if orphaned or doesn't exist
   */
  private async isProcessActive(pid: number): Promise<boolean> {
    // Windows: processes don't have TTY in the same way, just check if process exists
    if (process.platform === 'win32') {
      return this.isWindowsProcessRunning(pid);
    }

    // macOS / Linux: check if process has an active TTY
    return this.hasActiveTty(pid);
  }

  /**
   * Check if a Windows process is running
   */
  private async isWindowsProcessRunning(pid: number): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync('tasklist', [
        '/FI', `PID eq ${pid}`, '/NH', '/FO', 'CSV',
      ]);
      return stdout.includes(String(pid));
    } catch {
      return false;
    }
  }

  /**
   * Check if a Unix/Linux process has an active TTY (not orphaned)
   */
  private async hasActiveTty(pid: number): Promise<boolean> {
    try {
      const { stdout } = await execFileAsync('ps', ['-p', String(pid), '-o', 'tty=']);
      if (!stdout) return false;

      const tty = stdout.trim();

      // Orphaned processes have TTY = ??, empty, or -
      if (tty === '??' || tty === '' || tty === '-') return false;

      return AgentRegistry.ACTIVE_TTY_PATTERNS.some((pattern) => pattern.test(tty));
    } catch (error) {
      logger.warn('[AgentRegistry] Failed to check process TTY', {
        pid,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  async cleanupStale(staleThresholdMs: number = 5 * 60 * 1000): Promise<number> {
    // Prevent concurrent cleanup operations (race condition protection)
    if (this.cleanupInProgress) {
      logger.debug('[AgentRegistry] Cleanup already in progress, skipping');
      return 0;
    }

    this.cleanupInProgress = true;
    try {
      return await this.performCleanup(staleThresholdMs);
    } finally {
      this.cleanupInProgress = false;
    }
  }

  /**
   * Internal cleanup implementation
   */
  private async performCleanup(staleThresholdMs: number): Promise<number> {
    const threshold = new Date(Date.now() - staleThresholdMs).toISOString();
    const now = new Date().toISOString();

    // Step 1: Mark agents with orphaned processes (no TTY) as stale
    const orphanCount = await this.cleanupOrphanedAgents(now);

    // Step 2: Mark agents with old heartbeats as stale (original behavior)
    const stmt = this.getStatement(
      'cleanupStale',
      "UPDATE agents SET status = 'stale', updated_at = ? WHERE last_heartbeat < ? AND status IN ('active', 'inactive')"
    );

    const result = stmt.run(now, threshold);
    return result.changes + orphanCount;
  }

  /**
   * Clean up agents with orphaned processes (no TTY or dead process)
   * @returns Number of agents marked as stale
   */
  private async cleanupOrphanedAgents(now: string): Promise<number> {
    let orphanCount = 0;
    const allAgents = this.listAll();

    for (const agent of allAgents) {
      // Skip agents that are already stale
      if (agent.status !== 'active' && agent.status !== 'inactive') continue;

      // Skip agents without a PID
      if (!agent.processPid) continue;

      // SECURITY: Validate PID before any operations
      if (!AgentRegistry.isValidPid(agent.processPid)) {
        logger.warn('[AgentRegistry] Skipping invalid PID in cleanup', {
          agentId: agent.agentId,
          processPid: agent.processPid,
        });
        continue;
      }

      // Skip if process is still active (has TTY)
      if (await this.isProcessActive(agent.processPid)) continue;

      // Process is orphaned - attempt to kill if it's a MeMesh process
      await this.tryKillOrphanedProcess(agent.agentId, agent.processPid);

      // Mark as stale in database regardless (the MeMesh process is gone either way)
      this.markAgentStale(agent.agentId, agent.processPid, now);
      orphanCount++;
    }

    return orphanCount;
  }

  /**
   * Attempt to kill an orphaned process if it's a MeMesh server
   * SECURITY: Verifies process identity before killing to prevent PID recycling attacks
   */
  private async tryKillOrphanedProcess(agentId: string, pid: number): Promise<void> {
    const isMeMesh = await this.isMeMeshProcess(pid);

    if (!isMeMesh) {
      logger.warn('[AgentRegistry] PID no longer belongs to MeMesh server, not killing', {
        agentId,
        processPid: pid,
      });
      return;
    }

    try {
      process.kill(pid, 'SIGTERM');
      logger.info('[AgentRegistry] Killed orphaned MeMesh process', {
        agentId,
        processPid: pid,
      });
    } catch (error) {
      // Process might already be dead, which is fine
      logger.debug('[AgentRegistry] Failed to kill orphaned process (may already be dead)', {
        agentId,
        processPid: pid,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Mark an agent as stale in the database
   */
  private markAgentStale(agentId: string, processPid: number, now: string): void {
    const stmt = this.getStatement(
      'markOrphanStale',
      "UPDATE agents SET status = 'stale', updated_at = ? WHERE agent_id = ?"
    );
    stmt.run(now, agentId);
    logger.info('[AgentRegistry] Marked orphaned agent as stale (no TTY)', {
      agentId,
      processPid,
    });
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
    const capabilities = safeJsonParse<AgentCapabilities>(row.capabilities, 'AgentRegistry');
    const metadata = safeJsonParse<Record<string, unknown>>(row.metadata, 'AgentRegistry');

    return {
      agentId: row.agent_id,
      baseUrl: row.base_url,
      port: row.port,
      status: row.status as 'active' | 'inactive' | 'stale',
      lastHeartbeat: row.last_heartbeat,
      processPid: row.process_pid || undefined,
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

  const cleanup = async (): Promise<void> => {
    try {
      // Mark agents as stale if:
      // 1. Process has no TTY (orphaned), OR
      // 2. Heartbeat is older than 5 minutes
      const markedStale = await registry.cleanupStale(5 * 60 * 1000);

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

  // Run cleanup immediately on start (async, don't await to avoid blocking)
  cleanup().catch((error) => {
    logger.error('[Agent Registry] Initial cleanup failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  });

  // Then run periodically
  cleanupTimer = setInterval(() => {
    cleanup().catch((error) => {
      logger.error('[Agent Registry] Periodic cleanup failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, intervalMs);

  // Allow Node.js process to exit even if this timer is still running
  // This prevents the cleanup timer from blocking graceful shutdown
  cleanupTimer.unref();

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
