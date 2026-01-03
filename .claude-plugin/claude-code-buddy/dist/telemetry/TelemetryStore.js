import { v4 as uuid } from 'uuid';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { SimpleDatabaseFactory } from '../config/simple-config.js';
import { NotFoundError } from '../errors/index.js';
export class TelemetryStore {
    db;
    storagePath;
    isInitialized = false;
    constructor(options = {}) {
        this.storagePath = options.storagePath ||
            path.join(os.homedir(), '.claude-code-buddy', 'telemetry');
    }
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        await fs.ensureDir(this.storagePath);
        const dbPath = path.join(this.storagePath, 'telemetry.db');
        this.db = SimpleDatabaseFactory.getInstance(dbPath);
        this.isInitialized = true;
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS telemetry_config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS telemetry_events (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        event_data TEXT NOT NULL,
        anonymous_id TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        sent INTEGER DEFAULT 0,
        sent_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_events_type ON telemetry_events(event_type);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON telemetry_events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_sent ON telemetry_events(sent);
    `);
        const existing = this.db.prepare('SELECT * FROM telemetry_config WHERE key = ?').get('config');
        if (!existing) {
            const defaultConfig = {
                enabled: false,
                anonymous_id: uuid(),
                send_automatically: false
            };
            this.db.prepare('INSERT INTO telemetry_config (key, value) VALUES (?, ?)').run('config', JSON.stringify(defaultConfig));
        }
    }
    async getConfig() {
        const row = this.db.prepare('SELECT value FROM telemetry_config WHERE key = ?').get('config');
        if (!row) {
            throw new NotFoundError('Telemetry config not found', 'telemetryConfig', 'config', {
                component: 'TelemetryStore',
                method: 'getConfig',
                action: 'ensure database is initialized with default config',
            });
        }
        return JSON.parse(row.value);
    }
    async updateConfig(updates) {
        const config = await this.getConfig();
        const updated = { ...config, ...updates };
        this.db.prepare('UPDATE telemetry_config SET value = ? WHERE key = ?').run(JSON.stringify(updated), 'config');
    }
    async storeEventLocally(event) {
        const id = uuid();
        this.db.prepare(`
      INSERT INTO telemetry_events (id, event_type, event_data, anonymous_id, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, event.event, JSON.stringify(event), event.anonymous_id, event.timestamp);
    }
    async getLocalEvents(filters) {
        let query = 'SELECT event_data FROM telemetry_events WHERE 1=1';
        const params = [];
        if (filters?.event_type) {
            query += ' AND event_type = ?';
            params.push(filters.event_type);
        }
        if (filters?.start_date) {
            query += ' AND timestamp >= ?';
            params.push(filters.start_date.toISOString());
        }
        if (filters?.end_date) {
            query += ' AND timestamp <= ?';
            params.push(filters.end_date.toISOString());
        }
        if (filters?.sent !== undefined) {
            query += ' AND sent = ?';
            params.push(filters.sent ? 1 : 0);
        }
        query += ' ORDER BY timestamp DESC';
        if (filters?.limit) {
            query += ' LIMIT ?';
            params.push(filters.limit);
        }
        const rows = this.db.prepare(query).all(...params);
        return rows.map(row => JSON.parse(row.event_data));
    }
    async archiveSentEvents() {
        const now = new Date().toISOString();
        this.db.prepare(`
      UPDATE telemetry_events
      SET sent = 1, sent_at = ?
      WHERE sent = 0
    `).run(now);
    }
    async clearLocalData() {
        this.db.prepare('DELETE FROM telemetry_events').run();
    }
    async getLastSentTime() {
        const row = this.db.prepare('SELECT MAX(sent_at) as last_sent FROM telemetry_events WHERE sent = 1').get();
        return row.last_sent ? new Date(row.last_sent) : null;
    }
    async close() {
        this.db.close();
    }
}
//# sourceMappingURL=TelemetryStore.js.map