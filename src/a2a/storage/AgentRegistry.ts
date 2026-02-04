/**
 * Agent Registry
 * Shared SQLite registry for agent discovery
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

  private constructor(dbPath?: string) {
    // Use PathResolver for automatic fallback to legacy location
    const path = dbPath || getDataPath('a2a-registry.db');

    this.db = new Database(path);
    this.initializeSchema();
  }

  static getInstance(dbPath?: string): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry(dbPath);
    }
    return AgentRegistry.instance;
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
      const stmt = this.db.prepare(`
        UPDATE agents
        SET base_url = ?, port = ?, status = 'active', last_heartbeat = ?,
            capabilities = ?, metadata = ?, updated_at = ?
        WHERE agent_id = ?
      `);

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
      const stmt = this.db.prepare(`
        INSERT INTO agents (agent_id, base_url, port, status, last_heartbeat,
                           capabilities, metadata, created_at, updated_at)
        VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)
      `);

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
    const stmt = this.db.prepare(`
      SELECT * FROM agents WHERE agent_id = ?
    `);

    const row = stmt.get(agentId) as AgentRow | undefined;
    if (!row) return null;

    return this.rowToEntry(row);
  }

  listActive(): AgentRegistryEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM agents WHERE status = 'active' ORDER BY last_heartbeat DESC
    `);

    const rows = stmt.all() as AgentRow[];
    return rows.map((row) => this.rowToEntry(row));
  }

  listAll(): AgentRegistryEntry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM agents ORDER BY last_heartbeat DESC
    `);

    const rows = stmt.all() as AgentRow[];
    return rows.map((row) => this.rowToEntry(row));
  }

  heartbeat(agentId: string): boolean {
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE agents SET last_heartbeat = ?, status = 'active', updated_at = ?
      WHERE agent_id = ?
    `);

    const result = stmt.run(now, now, agentId);
    return result.changes > 0;
  }

  deactivate(agentId: string): boolean {
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE agents SET status = 'inactive', updated_at = ?
      WHERE agent_id = ?
    `);

    const result = stmt.run(now, agentId);
    return result.changes > 0;
  }

  cleanupStale(staleThresholdMs: number = 5 * 60 * 1000): number {
    const threshold = new Date(Date.now() - staleThresholdMs).toISOString();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE agents SET status = 'stale', updated_at = ?
      WHERE last_heartbeat < ? AND status = 'active'
    `);

    const result = stmt.run(now, threshold);
    return result.changes;
  }

  deleteStale(): number {
    const stmt = this.db.prepare(`
      DELETE FROM agents WHERE status = 'stale'
    `);

    const result = stmt.run();
    return result.changes;
  }

  close(): void {
    this.db.close();
    AgentRegistry.instance = null;
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
