/**
 * Telemetry Store - Local SQLite Storage
 */
import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import { SimpleDatabaseFactory } from '../config/simple-config.js';
import type {
  TelemetryEvent,
  TelemetryConfig,
  EventFilters
} from './types';
import type { SQLParams } from '../evolution/storage/types.js';
import { NotFoundError } from '../errors/index.js';

export interface TelemetryStoreOptions {
  storagePath?: string;
}

export class TelemetryStore {
  private db!: Database.Database; // Will be initialized in initialize()
  private storagePath: string;
  private isInitialized: boolean = false;

  constructor(options: TelemetryStoreOptions = {}) {
    this.storagePath = options.storagePath ||
      path.join(os.homedir(), '.smart-agents', 'telemetry');
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return; // Already initialized
    }

    // Create directory first, then database
    await fs.ensureDir(this.storagePath);

    const dbPath = path.join(this.storagePath, 'telemetry.db');
    this.db = SimpleDatabaseFactory.getInstance(dbPath);
    this.isInitialized = true;

    // Create tables
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

    // Initialize config if not exists
    const existing = this.db.prepare('SELECT * FROM telemetry_config WHERE key = ?').get('config');
    if (!existing) {
      const defaultConfig: TelemetryConfig = {
        enabled: false,
        anonymous_id: uuid(),
        send_automatically: false
      };

      this.db.prepare('INSERT INTO telemetry_config (key, value) VALUES (?, ?)').run(
        'config',
        JSON.stringify(defaultConfig)
      );
    }
  }

  async getConfig(): Promise<TelemetryConfig> {
    const row = this.db.prepare('SELECT value FROM telemetry_config WHERE key = ?').get('config') as { value: string } | undefined;
    if (!row) {
      throw new NotFoundError(
        'Telemetry config not found',
        'telemetryConfig',
        'config',
        {
          component: 'TelemetryStore',
          method: 'getConfig',
          action: 'ensure database is initialized with default config',
        }
      );
    }
    return JSON.parse(row.value);
  }

  async updateConfig(updates: Partial<TelemetryConfig>): Promise<void> {
    const config = await this.getConfig();
    const updated = { ...config, ...updates };

    this.db.prepare('UPDATE telemetry_config SET value = ? WHERE key = ?').run(
      JSON.stringify(updated),
      'config'
    );
  }

  async storeEventLocally(event: TelemetryEvent): Promise<void> {
    const id = uuid();

    this.db.prepare(`
      INSERT INTO telemetry_events (id, event_type, event_data, anonymous_id, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      id,
      event.event,
      JSON.stringify(event),
      event.anonymous_id,
      event.timestamp
    );
  }

  async getLocalEvents(filters?: EventFilters): Promise<TelemetryEvent[]> {
    let query = 'SELECT event_data FROM telemetry_events WHERE 1=1';
    const params: SQLParams = [];

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

    const rows = this.db.prepare(query).all(...params) as { event_data: string }[];
    return rows.map(row => JSON.parse(row.event_data));
  }

  async archiveSentEvents(): Promise<void> {
    const now = new Date().toISOString();

    this.db.prepare(`
      UPDATE telemetry_events
      SET sent = 1, sent_at = ?
      WHERE sent = 0
    `).run(now);
  }

  async clearLocalData(): Promise<void> {
    this.db.prepare('DELETE FROM telemetry_events').run();
  }

  async getLastSentTime(): Promise<Date | null> {
    const row = this.db.prepare('SELECT MAX(sent_at) as last_sent FROM telemetry_events WHERE sent = 1').get() as { last_sent: string | null };
    return row.last_sent ? new Date(row.last_sent) : null;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
