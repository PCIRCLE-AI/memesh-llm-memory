import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { logger } from '../../utils/logger.js';
import { getDataPath } from '../../utils/PathResolver.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
function safeJsonParse(jsonString) {
    if (!jsonString)
        return null;
    try {
        return JSON.parse(jsonString);
    }
    catch (error) {
        logger.error('[AgentRegistry] Invalid JSON data', {
            error: error instanceof Error ? error.message : String(error),
            jsonString: jsonString?.substring(0, 100),
        });
        return null;
    }
}
export class AgentRegistry {
    db;
    static instance = null;
    constructor(dbPath) {
        const path = dbPath || getDataPath('a2a-registry.db');
        this.db = new Database(path);
        this.initializeSchema();
    }
    static getInstance(dbPath) {
        if (!AgentRegistry.instance) {
            AgentRegistry.instance = new AgentRegistry(dbPath);
        }
        return AgentRegistry.instance;
    }
    initializeSchema() {
        const schemaPath = join(__dirname, 'registry-schemas.sql');
        const schema = readFileSync(schemaPath, 'utf-8');
        this.db.exec(schema);
    }
    register(params) {
        const now = new Date().toISOString();
        const existing = this.get(params.agentId);
        if (existing) {
            const stmt = this.db.prepare(`
        UPDATE agents
        SET base_url = ?, port = ?, status = 'active', last_heartbeat = ?,
            capabilities = ?, metadata = ?, updated_at = ?
        WHERE agent_id = ?
      `);
            stmt.run(params.baseUrl, params.port, now, params.capabilities ? JSON.stringify(params.capabilities) : null, params.metadata ? JSON.stringify(params.metadata) : null, now, params.agentId);
        }
        else {
            const stmt = this.db.prepare(`
        INSERT INTO agents (agent_id, base_url, port, status, last_heartbeat,
                           capabilities, metadata, created_at, updated_at)
        VALUES (?, ?, ?, 'active', ?, ?, ?, ?, ?)
      `);
            stmt.run(params.agentId, params.baseUrl, params.port, now, params.capabilities ? JSON.stringify(params.capabilities) : null, params.metadata ? JSON.stringify(params.metadata) : null, now, now);
        }
        return this.get(params.agentId);
    }
    get(agentId) {
        const stmt = this.db.prepare(`
      SELECT * FROM agents WHERE agent_id = ?
    `);
        const row = stmt.get(agentId);
        if (!row)
            return null;
        return this.rowToEntry(row);
    }
    listActive() {
        const stmt = this.db.prepare(`
      SELECT * FROM agents WHERE status = 'active' ORDER BY last_heartbeat DESC
    `);
        const rows = stmt.all();
        return rows.map((row) => this.rowToEntry(row));
    }
    listAll() {
        const stmt = this.db.prepare(`
      SELECT * FROM agents ORDER BY last_heartbeat DESC
    `);
        const rows = stmt.all();
        return rows.map((row) => this.rowToEntry(row));
    }
    heartbeat(agentId) {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
      UPDATE agents SET last_heartbeat = ?, status = 'active', updated_at = ?
      WHERE agent_id = ?
    `);
        const result = stmt.run(now, now, agentId);
        return result.changes > 0;
    }
    deactivate(agentId) {
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
      UPDATE agents SET status = 'inactive', updated_at = ?
      WHERE agent_id = ?
    `);
        const result = stmt.run(now, agentId);
        return result.changes > 0;
    }
    cleanupStale(staleThresholdMs = 5 * 60 * 1000) {
        const threshold = new Date(Date.now() - staleThresholdMs).toISOString();
        const now = new Date().toISOString();
        const stmt = this.db.prepare(`
      UPDATE agents SET status = 'stale', updated_at = ?
      WHERE last_heartbeat < ? AND status = 'active'
    `);
        const result = stmt.run(now, threshold);
        return result.changes;
    }
    deleteStale() {
        const stmt = this.db.prepare(`
      DELETE FROM agents WHERE status = 'stale'
    `);
        const result = stmt.run();
        return result.changes;
    }
    close() {
        this.db.close();
        AgentRegistry.instance = null;
    }
    rowToEntry(row) {
        const capabilities = safeJsonParse(row.capabilities);
        const metadata = safeJsonParse(row.metadata);
        return {
            agentId: row.agent_id,
            baseUrl: row.base_url,
            port: row.port,
            status: row.status,
            lastHeartbeat: row.last_heartbeat,
            capabilities: capabilities || undefined,
            metadata: metadata || undefined,
        };
    }
}
//# sourceMappingURL=AgentRegistry.js.map