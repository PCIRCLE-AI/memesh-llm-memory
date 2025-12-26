# Evolution System Phase 1 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build self-evolving agent system with privacy-first telemetry that tracks agent performance and learns from experience while protecting user privacy.

**Architecture:** OpenTelemetry-based tracing (Task → Execution → Spans) with dual storage layers: EvolutionStore (detailed agent data) and TelemetryStore (sanitized usage analytics). Zero-code instrumentation via Proxy pattern. Privacy-first: opt-in, local-first, preview before send.

**Tech Stack:** TypeScript, better-sqlite3, Express, Vitest, OpenTelemetry concepts

---

## Prerequisites

**Already Completed:**
- ✅ `src/evolution/storage/SQLiteStore.ts` (enhanced with migrations, validation, FTS, skills cache)
- ✅ `src/evolution/storage/migrations/MigrationManager.ts`
- ✅ `src/evolution/storage/validation.ts`
- ✅ `src/evolution/instrumentation/SpanTracker.ts`
- ✅ `src/evolution/instrumentation/withEvolutionTracking.ts`

**To Build:**
- Phase 1.1: Complete storage layer with telemetry support
- Phase 1.2: Telemetry collector with privacy sanitization
- Phase 1.3: Link & Tag management
- Phase 1.4: HTTP API (evolution + telemetry endpoints)
- Phase 1.5: Static HTML reports
- Phase 1.6: CLI tools

---

## Task 1: Telemetry Types and Interfaces

**Files:**
- Create: `src/telemetry/types.ts`
- Create: `tests/telemetry/types.test.ts`

### Step 1: Write failing test for telemetry event types

```typescript
// tests/telemetry/types.test.ts
import { describe, it, expect } from 'vitest';
import type {
  TelemetryEvent,
  AgentUsageEvent,
  SkillUsageEvent,
  ErrorEvent,
  isAgentUsageEvent,
  isErrorEvent
} from '../src/telemetry/types';

describe('Telemetry Types', () => {
  it('should identify agent usage events', () => {
    const event: AgentUsageEvent = {
      event: 'agent_execution',
      agent_type: 'code-reviewer',
      success: true,
      duration_ms: 3500,
      anonymous_id: 'test-id',
      timestamp: new Date().toISOString(),
      sdk_version: '1.0.0',
      node_version: 'v20.0.0',
      os_platform: 'darwin'
    };

    expect(isAgentUsageEvent(event)).toBe(true);
    expect(isErrorEvent(event)).toBe(false);
  });

  it('should identify error events', () => {
    const event: ErrorEvent = {
      event: 'error',
      error_type: 'TypeError',
      error_category: 'runtime',
      component: 'agents/code-reviewer',
      stack_trace_hash: 'abc123',
      anonymous_id: 'test-id',
      timestamp: new Date().toISOString(),
      sdk_version: '1.0.0',
      node_version: 'v20.0.0',
      os_platform: 'darwin'
    };

    expect(isErrorEvent(event)).toBe(true);
    expect(isAgentUsageEvent(event)).toBe(false);
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- tests/telemetry/types.test.ts`
Expected: FAIL - module not found

### Step 3: Implement telemetry types

```typescript
// src/telemetry/types.ts

/**
 * Base fields for all telemetry events
 */
export interface BaseTelemetryEvent {
  anonymous_id: string;      // UUID, NO user identification
  timestamp: string;         // ISO 8601
  sdk_version: string;       // smart-agents version
  node_version: string;      // Node.js version
  os_platform: string;       // 'darwin', 'linux', 'win32'
}

/**
 * Agent execution event
 */
export interface AgentUsageEvent extends BaseTelemetryEvent {
  event: 'agent_execution';
  agent_type: string;        // "code-reviewer", "debugger"
  agent_version?: string;
  success: boolean;
  duration_ms: number;
  cost?: number;
  task_type?: string;        // "bug_fix", "code_review"
  error_type?: string;       // Only if success=false
}

/**
 * Skill execution event
 */
export interface SkillUsageEvent extends BaseTelemetryEvent {
  event: 'skill_execution';
  skill_name: string;
  skill_version?: string;
  success: boolean;
  duration_ms: number;
  user_satisfaction?: number; // 1-5 stars
  used_with_agent?: string;
  task_type?: string;
}

/**
 * Feature usage event
 */
export interface FeatureUsageEvent extends BaseTelemetryEvent {
  event: 'feature_usage';
  feature_name: string;      // 'evolution_system', 'multi_agent'
  action: string;            // 'enabled', 'disabled', 'configured'
}

/**
 * Error event (sanitized)
 */
export interface ErrorEvent extends BaseTelemetryEvent {
  event: 'error';
  error_type: string;        // 'TypeError', 'NetworkError'
  error_category: string;    // 'network', 'config', 'runtime'
  component: string;         // 'evolution/storage', 'agents/code-reviewer'
  stack_trace_hash?: string; // SHA-256 hash of stack trace
}

/**
 * Performance event
 */
export interface PerformanceEvent extends BaseTelemetryEvent {
  event: 'performance';
  operation: string;         // 'pattern_learning', 'span_query'
  duration_ms: number;
  data_size?: number;
}

/**
 * Workflow event
 */
export interface WorkflowEvent extends BaseTelemetryEvent {
  event: 'workflow';
  workflow_type: string;     // 'code_review', 'debugging'
  steps_completed: number;
  total_steps: number;
  success: boolean;
}

/**
 * Union type of all telemetry events
 */
export type TelemetryEvent =
  | AgentUsageEvent
  | SkillUsageEvent
  | FeatureUsageEvent
  | ErrorEvent
  | PerformanceEvent
  | WorkflowEvent;

/**
 * Telemetry configuration
 */
export interface TelemetryConfig {
  enabled: boolean;           // Default: false (opt-in)
  anonymous_id: string;       // UUID
  send_automatically: boolean; // Default: false
  send_interval_hours?: number;
  last_sent?: Date;
}

/**
 * Type guards
 */
export function isAgentUsageEvent(event: TelemetryEvent): event is AgentUsageEvent {
  return event.event === 'agent_execution';
}

export function isSkillUsageEvent(event: TelemetryEvent): event is SkillUsageEvent {
  return event.event === 'skill_execution';
}

export function isErrorEvent(event: TelemetryEvent): event is ErrorEvent {
  return event.event === 'error';
}

export function isPerformanceEvent(event: TelemetryEvent): event is PerformanceEvent {
  return event.event === 'performance';
}

export function isWorkflowEvent(event: TelemetryEvent): event is WorkflowEvent {
  return event.event === 'workflow';
}

/**
 * Event filters for querying
 */
export interface EventFilters {
  event_type?: TelemetryEvent['event'];
  start_date?: Date;
  end_date?: Date;
  sent?: boolean;
  limit?: number;
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- tests/telemetry/types.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/telemetry/types.ts tests/telemetry/types.test.ts
git commit -m "feat(telemetry): add telemetry event types and type guards"
```

---

## Task 2: Privacy Sanitization

**Files:**
- Create: `src/telemetry/sanitization.ts`
- Create: `tests/telemetry/sanitization.test.ts`

### Step 1: Write failing test for sanitization

```typescript
// tests/telemetry/sanitization.test.ts
import { describe, it, expect } from 'vitest';
import {
  sanitizeEvent,
  looksLikeSensitive,
  hashValue,
  BANNED_FIELDS
} from '../src/telemetry/sanitization';

describe('Telemetry Sanitization', () => {
  it('should remove banned fields', () => {
    const event = {
      event: 'agent_execution',
      agent_type: 'code-reviewer',
      api_key: 'sk-secret-123',
      password: 'password123',
      email: 'user@example.com',
      file_content: 'const secret = "xyz"',
      duration_ms: 1000
    };

    const sanitized = sanitizeEvent(event);

    expect(sanitized.api_key).toBeUndefined();
    expect(sanitized.password).toBeUndefined();
    expect(sanitized.email).toBeUndefined();
    expect(sanitized.file_content).toBeUndefined();
    expect(sanitized.duration_ms).toBe(1000);
  });

  it('should hash sensitive-looking strings', () => {
    expect(looksLikeSensitive('sk-proj-abc123def456')).toBe(true);
    expect(looksLikeSensitive('Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')).toBe(true);
    expect(looksLikeSensitive('/Users/john/secret-project/api-key.txt')).toBe(true);
    expect(looksLikeSensitive('code-reviewer')).toBe(false);
  });

  it('should hash sensitive values', () => {
    const hashed = hashValue('sk-proj-secret-key-123');
    expect(hashed).not.toContain('secret');
    expect(hashed).toHaveLength(16);
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- tests/telemetry/sanitization.test.ts`
Expected: FAIL - module not found

### Step 3: Implement sanitization

```typescript
// src/telemetry/sanitization.ts
import crypto from 'crypto';

/**
 * Fields that must NEVER be included in telemetry
 */
export const BANNED_FIELDS = [
  // User identification
  'email',
  'username',
  'user_id',
  'ip_address',
  'mac_address',

  // Sensitive credentials
  'api_key',
  'password',
  'token',
  'secret',
  'auth_token',
  'bearer',
  'authorization',

  // Code and file contents
  'file_content',
  'code_content',
  'file_path',
  'directory_path',
  'absolute_path',

  // Specific project data
  'git_commit',
  'git_branch',
  'repository_url',
  'repo_url',

  // Detailed error info
  'error_message',  // Only error_type, not message
  'stack_trace',    // Only hash, not actual trace

  // Any custom user data
  'input_data',
  'output_data',
  'prompt_content',
  'llm_response',
  'user_input',
  'user_data',
];

/**
 * Patterns that indicate sensitive data
 */
const SENSITIVE_PATTERNS = [
  /sk-[a-zA-Z0-9-_]+/,           // API keys (OpenAI, etc.)
  /Bearer\s+[a-zA-Z0-9-_\.]+/,   // Bearer tokens
  /\/Users\/[^\/]+\//,            // macOS user paths
  /\/home\/[^\/]+\//,             // Linux user paths
  /C:\\Users\\[^\\]+\\/,          // Windows user paths
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // Email addresses
  /\d{3}-\d{2}-\d{4}/,           // SSN-like patterns
];

/**
 * Check if a string looks like sensitive data
 */
export function looksLikeSensitive(value: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Hash a sensitive value (SHA-256, first 16 chars)
 */
export function hashValue(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Sanitize a telemetry event
 * - Removes banned fields
 * - Hashes sensitive-looking strings
 * - Truncates long strings
 */
export function sanitizeEvent(event: any): any {
  const sanitized = { ...event };

  // Remove banned fields
  for (const field of BANNED_FIELDS) {
    if (field in sanitized) {
      delete sanitized[field];
    }
  }

  // Hash sensitive-looking strings
  for (const [key, value] of Object.entries(sanitized)) {
    if (typeof value === 'string') {
      // Hash if looks sensitive
      if (looksLikeSensitive(value)) {
        sanitized[key] = hashValue(value);
      }
      // Truncate very long strings
      else if (value.length > 1000) {
        sanitized[key] = value.substring(0, 1000) + '...[truncated]';
      }
    }
  }

  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeEvent(value);
    }
  }

  return sanitized;
}

/**
 * Hash a stack trace for grouping errors
 */
export function hashStackTrace(stackTrace: string): string {
  // Remove line numbers and file paths, keep only function names and structure
  const normalized = stackTrace
    .split('\n')
    .map(line => line.replace(/:\d+:\d+/g, ''))  // Remove line:col
    .map(line => line.replace(/\/[^\s]+\//g, ''))  // Remove paths
    .join('\n');

  return crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex')
    .substring(0, 16);
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- tests/telemetry/sanitization.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/telemetry/sanitization.ts tests/telemetry/sanitization.test.ts
git commit -m "feat(telemetry): add privacy sanitization with banned fields and hashing"
```

---

## Task 3: Telemetry Store (Local Storage)

**Files:**
- Create: `src/telemetry/TelemetryStore.ts`
- Create: `tests/telemetry/TelemetryStore.test.ts`

### Step 1: Write failing test for telemetry store

```typescript
// tests/telemetry/TelemetryStore.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TelemetryStore } from '../src/telemetry/TelemetryStore';
import type { AgentUsageEvent, TelemetryConfig } from '../src/telemetry/types';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('TelemetryStore', () => {
  let store: TelemetryStore;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `telemetry-test-${Date.now()}`);
    await fs.ensureDir(testDir);
    store = new TelemetryStore({ storagePath: testDir });
    await store.initialize();
  });

  afterEach(async () => {
    await store.close();
    await fs.remove(testDir);
  });

  it('should initialize with disabled telemetry by default', async () => {
    const config = await store.getConfig();
    expect(config.enabled).toBe(false);
    expect(config.anonymous_id).toBeTruthy();
    expect(config.send_automatically).toBe(false);
  });

  it('should store events locally', async () => {
    const event: AgentUsageEvent = {
      event: 'agent_execution',
      agent_type: 'code-reviewer',
      success: true,
      duration_ms: 3500,
      anonymous_id: 'test-id',
      timestamp: new Date().toISOString(),
      sdk_version: '1.0.0',
      node_version: 'v20.0.0',
      os_platform: 'darwin'
    };

    await store.storeEventLocally(event);

    const events = await store.getLocalEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('agent_execution');
  });

  it('should filter events by type', async () => {
    await store.storeEventLocally({
      event: 'agent_execution',
      agent_type: 'code-reviewer',
      success: true,
      duration_ms: 1000,
      anonymous_id: 'test-id',
      timestamp: new Date().toISOString(),
      sdk_version: '1.0.0',
      node_version: 'v20.0.0',
      os_platform: 'darwin'
    });

    await store.storeEventLocally({
      event: 'error',
      error_type: 'TypeError',
      error_category: 'runtime',
      component: 'test',
      anonymous_id: 'test-id',
      timestamp: new Date().toISOString(),
      sdk_version: '1.0.0',
      node_version: 'v20.0.0',
      os_platform: 'darwin'
    });

    const agentEvents = await store.getLocalEvents({ event_type: 'agent_execution' });
    expect(agentEvents).toHaveLength(1);
    expect(agentEvents[0].event).toBe('agent_execution');
  });

  it('should enable and disable telemetry', async () => {
    await store.updateConfig({ enabled: true });
    let config = await store.getConfig();
    expect(config.enabled).toBe(true);

    await store.updateConfig({ enabled: false });
    config = await store.getConfig();
    expect(config.enabled).toBe(false);
  });

  it('should clear all local data', async () => {
    await store.storeEventLocally({
      event: 'agent_execution',
      agent_type: 'test',
      success: true,
      duration_ms: 100,
      anonymous_id: 'test-id',
      timestamp: new Date().toISOString(),
      sdk_version: '1.0.0',
      node_version: 'v20.0.0',
      os_platform: 'darwin'
    });

    await store.clearLocalData();

    const events = await store.getLocalEvents();
    expect(events).toHaveLength(0);
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- tests/telemetry/TelemetryStore.test.ts`
Expected: FAIL - module not found

### Step 3: Implement TelemetryStore

```typescript
// src/telemetry/TelemetryStore.ts
import Database from 'better-sqlite3';
import { v4 as uuid } from 'uuid';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import type {
  TelemetryEvent,
  TelemetryConfig,
  EventFilters
} from './types';

export interface TelemetryStoreOptions {
  storagePath?: string;
}

export class TelemetryStore {
  private db: Database.Database;
  private storagePath: string;

  constructor(options: TelemetryStoreOptions = {}) {
    this.storagePath = options.storagePath ||
      path.join(os.homedir(), '.smart-agents', 'telemetry');

    const dbPath = path.join(this.storagePath, 'telemetry.db');
    this.db = new Database(dbPath);
  }

  async initialize(): Promise<void> {
    await fs.ensureDir(this.storagePath);

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
      throw new Error('Telemetry config not found');
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
    const params: any[] = [];

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
```

### Step 4: Run test to verify it passes

Run: `npm test -- tests/telemetry/TelemetryStore.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/telemetry/TelemetryStore.ts tests/telemetry/TelemetryStore.test.ts
git commit -m "feat(telemetry): add local telemetry store with SQLite backend"
```

---

## Task 4: Telemetry Collector

**Files:**
- Create: `src/telemetry/TelemetryCollector.ts`
- Create: `tests/telemetry/TelemetryCollector.test.ts`

### Step 1: Write failing test for telemetry collector

```typescript
// tests/telemetry/TelemetryCollector.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TelemetryCollector } from '../src/telemetry/TelemetryCollector';
import { TelemetryStore } from '../src/telemetry/TelemetryStore';
import type { AgentUsageEvent } from '../src/telemetry/types';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

describe('TelemetryCollector', () => {
  let collector: TelemetryCollector;
  let store: TelemetryStore;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `telemetry-collector-test-${Date.now()}`);
    await fs.ensureDir(testDir);
    store = new TelemetryStore({ storagePath: testDir });
    await store.initialize();
    collector = new TelemetryCollector(store);
  });

  afterEach(async () => {
    await store.close();
    await fs.remove(testDir);
  });

  it('should not record events when disabled', async () => {
    const event: Partial<AgentUsageEvent> = {
      event: 'agent_execution',
      agent_type: 'code-reviewer',
      success: true,
      duration_ms: 3500
    };

    await collector.recordEvent(event);

    const events = await store.getLocalEvents();
    expect(events).toHaveLength(0);
  });

  it('should record events when enabled', async () => {
    await store.updateConfig({ enabled: true });

    const event: Partial<AgentUsageEvent> = {
      event: 'agent_execution',
      agent_type: 'code-reviewer',
      success: true,
      duration_ms: 3500
    };

    await collector.recordEvent(event);

    const events = await store.getLocalEvents();
    expect(events).toHaveLength(1);
    expect(events[0].event).toBe('agent_execution');
    expect(events[0].anonymous_id).toBeTruthy();
    expect(events[0].timestamp).toBeTruthy();
    expect(events[0].sdk_version).toBeTruthy();
  });

  it('should sanitize events before storing', async () => {
    await store.updateConfig({ enabled: true });

    const event = {
      event: 'agent_execution',
      agent_type: 'code-reviewer',
      success: true,
      duration_ms: 1000,
      api_key: 'sk-secret-123',  // Should be removed
      password: 'password123'     // Should be removed
    };

    await collector.recordEvent(event);

    const events = await store.getLocalEvents();
    expect(events).toHaveLength(1);
    expect((events[0] as any).api_key).toBeUndefined();
    expect((events[0] as any).password).toBeUndefined();
  });

  it('should check if telemetry is enabled', async () => {
    expect(await collector.isEnabled()).toBe(false);

    await store.updateConfig({ enabled: true });
    expect(await collector.isEnabled()).toBe(true);
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- tests/telemetry/TelemetryCollector.test.ts`
Expected: FAIL - module not found

### Step 3: Implement TelemetryCollector

```typescript
// src/telemetry/TelemetryCollector.ts
import { TelemetryStore } from './TelemetryStore';
import { sanitizeEvent } from './sanitization';
import type { TelemetryEvent } from './types';
import { version } from '../../package.json';

export class TelemetryCollector {
  private store: TelemetryStore;

  constructor(store: TelemetryStore) {
    this.store = store;
  }

  /**
   * Record a telemetry event (only if enabled)
   */
  async recordEvent(event: Partial<TelemetryEvent>): Promise<void> {
    if (!await this.isEnabled()) {
      return;
    }

    const config = await this.store.getConfig();

    // Sanitize event (remove PII, secrets, code)
    const sanitized = sanitizeEvent(event);

    // Add common fields
    const fullEvent: TelemetryEvent = {
      ...sanitized,
      anonymous_id: config.anonymous_id,
      timestamp: new Date().toISOString(),
      sdk_version: version,
      node_version: process.version,
      os_platform: process.platform
    } as TelemetryEvent;

    // Store locally
    await this.store.storeEventLocally(fullEvent);
  }

  /**
   * Check if telemetry is enabled
   */
  async isEnabled(): Promise<boolean> {
    const config = await this.store.getConfig();
    return config.enabled;
  }

  /**
   * Enable telemetry (opt-in)
   */
  async enable(): Promise<void> {
    await this.store.updateConfig({ enabled: true });
  }

  /**
   * Disable telemetry (opt-out)
   */
  async disable(): Promise<void> {
    await this.store.updateConfig({ enabled: false });
  }

  /**
   * Get telemetry status
   */
  async getStatus(): Promise<{
    enabled: boolean;
    anonymous_id: string;
    local_events_count: number;
    last_sent: Date | null;
  }> {
    const config = await this.store.getConfig();
    const events = await this.store.getLocalEvents({ sent: false });
    const lastSent = await this.store.getLastSentTime();

    return {
      enabled: config.enabled,
      anonymous_id: config.anonymous_id,
      local_events_count: events.length,
      last_sent: lastSent
    };
  }

  /**
   * Clear all local telemetry data
   */
  async clearLocalData(): Promise<void> {
    await this.store.clearLocalData();
  }

  /**
   * Get local storage path
   */
  getLocalPath(): string {
    return (this.store as any).storagePath;
  }
}
```

### Step 4: Run test to verify it passes

Run: `npm test -- tests/telemetry/TelemetryCollector.test.ts`
Expected: PASS

### Step 5: Commit

```bash
git add src/telemetry/TelemetryCollector.ts tests/telemetry/TelemetryCollector.test.ts
git commit -m "feat(telemetry): add telemetry collector with privacy-first recording"
```

---

## Task 5: Integrate Telemetry with Evolution Tracking

**Files:**
- Modify: `src/evolution/instrumentation/withEvolutionTracking.ts`
- Modify: `tests/evolution/instrumentation/withEvolutionTracking.test.ts`

### Step 1: Write failing test for telemetry integration

```typescript
// tests/evolution/instrumentation/withEvolutionTracking.test.ts (add to existing tests)
import { TelemetryCollector } from '../../telemetry/TelemetryCollector';
import { TelemetryStore } from '../../telemetry/TelemetryStore';

describe('withEvolutionTracking - Telemetry Integration', () => {
  let telemetryStore: TelemetryStore;
  let telemetryCollector: TelemetryCollector;

  beforeEach(async () => {
    const testDir = path.join(os.tmpdir(), `telemetry-integration-${Date.now()}`);
    telemetryStore = new TelemetryStore({ storagePath: testDir });
    await telemetryStore.initialize();
    telemetryCollector = new TelemetryCollector(telemetryStore);

    // Enable telemetry for tests
    await telemetryStore.updateConfig({ enabled: true });
  });

  it('should emit telemetry on successful agent execution', async () => {
    const mockAgent = {
      id: 'test-agent',
      constructor: { name: 'TestAgent' },
      execute: vi.fn().mockResolvedValue({
        success: true,
        qualityScore: 0.95,
        cost: 0.002
      })
    };

    const trackedAgent = withEvolutionTracking(mockAgent as any, {
      telemetryCollector
    });

    await trackedAgent.execute({ task: 'test' });

    const events = await telemetryStore.getLocalEvents({ event_type: 'agent_execution' });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event: 'agent_execution',
      agent_type: 'TestAgent',
      success: true
    });
  });

  it('should emit error telemetry on agent failure', async () => {
    const mockAgent = {
      id: 'test-agent',
      constructor: { name: 'TestAgent' },
      execute: vi.fn().mockRejectedValue(new TypeError('Test error'))
    };

    const trackedAgent = withEvolutionTracking(mockAgent as any, {
      telemetryCollector
    });

    await expect(trackedAgent.execute({ task: 'test' })).rejects.toThrow();

    const events = await telemetryStore.getLocalEvents({ event_type: 'error' });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event: 'error',
      error_type: 'TypeError',
      component: 'agents/TestAgent'
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- tests/evolution/instrumentation/withEvolutionTracking.test.ts`
Expected: FAIL - telemetryCollector option not implemented

### Step 3: Modify withEvolutionTracking to support telemetry

```typescript
// src/evolution/instrumentation/withEvolutionTracking.ts (add telemetry support)
import type { TelemetryCollector } from '../../telemetry/TelemetryCollector';

export interface TrackingOptions {
  tracker?: SpanTracker;
  autoTags?: string[];
  sampleRate?: number;
  extractAttributes?: (input: any) => SpanAttributes;
  extractOutputAttributes?: (output: any) => SpanAttributes;
  spanName?: string;
  telemetryCollector?: TelemetryCollector; // NEW
}

export function withEvolutionTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options: TrackingOptions = {}
): T {
  const tracker = options.tracker || getGlobalTracker();
  const telemetry = options.telemetryCollector;

  return (async (...args: any[]) => {
    // ... existing tracking code ...

    const startTime = Date.now();

    try {
      const result = await fn(...args);
      const duration = Date.now() - startTime;

      // Record success
      span.setStatus({ code: 'OK' });
      span.setAttributes({
        'execution.success': true,
        ...outputAttributes,
      });

      // Emit telemetry (if enabled)
      if (telemetry) {
        await telemetry.recordEvent({
          event: 'agent_execution',
          agent_type: fn.name || 'unknown',
          success: true,
          duration_ms: duration,
          cost: result.cost,
          // NO: actual data, code, prompts
        });
      }

      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;

      // Record failure
      span.setStatus({
        code: 'ERROR',
        message: error.message,
      });

      span.setAttributes({
        'execution.success': false,
        'error.type': error.constructor.name,
        'error.message': error.message,
      });

      // Emit error telemetry (sanitized)
      if (telemetry) {
        await telemetry.recordEvent({
          event: 'error',
          error_type: error.constructor.name,
          error_category: categorizeError(error),
          component: `agents/${fn.name || 'unknown'}`,
          stack_trace_hash: error.stack ? hashStackTrace(error.stack) : undefined,
          // NO: actual error message, stack trace
        });
      }

      throw error;
    } finally {
      await span.end();
    }
  }) as T;
}

function categorizeError(error: Error): string {
  if (error.name.includes('Network')) return 'network';
  if (error.name.includes('Timeout')) return 'timeout';
  if (error.name.includes('Type')) return 'runtime';
  return 'unknown';
}
```

### Step 4: Add hashStackTrace import

```typescript
// src/evolution/instrumentation/withEvolutionTracking.ts (add import)
import { hashStackTrace } from '../../telemetry/sanitization';
```

### Step 5: Run test to verify it passes

Run: `npm test -- tests/evolution/instrumentation/withEvolutionTracking.test.ts`
Expected: PASS

### Step 6: Commit

```bash
git add src/evolution/instrumentation/withEvolutionTracking.ts tests/evolution/instrumentation/withEvolutionTracking.test.ts
git commit -m "feat(evolution): integrate telemetry collection with evolution tracking"
```

---

## Task 6: Global Telemetry Instance

**Files:**
- Create: `src/telemetry/index.ts`
- Modify: `src/index.ts`

### Step 1: Create telemetry module exports

```typescript
// src/telemetry/index.ts
export { TelemetryStore } from './TelemetryStore';
export { TelemetryCollector } from './TelemetryCollector';
export { sanitizeEvent, hashStackTrace } from './sanitization';
export type * from './types';

import { TelemetryStore } from './TelemetryStore';
import { TelemetryCollector } from './TelemetryCollector';

let globalTelemetryCollector: TelemetryCollector | null = null;

/**
 * Get or create global telemetry collector
 */
export function getTelemetryCollector(): TelemetryCollector {
  if (!globalTelemetryCollector) {
    const store = new TelemetryStore();
    store.initialize().catch(console.error);
    globalTelemetryCollector = new TelemetryCollector(store);
  }
  return globalTelemetryCollector;
}

/**
 * Set global telemetry collector
 */
export function setTelemetryCollector(collector: TelemetryCollector): void {
  globalTelemetryCollector = collector;
}
```

### Step 2: Export from main index

```typescript
// src/index.ts (add to existing exports)
export * from './telemetry';
```

### Step 3: Commit

```bash
git add src/telemetry/index.ts src/index.ts
git commit -m "feat(telemetry): add global telemetry collector instance"
```

---

## Task 7: Link Management

**Files:**
- Create: `src/evolution/links/LinkManager.ts`
- Create: `tests/evolution/links/LinkManager.test.ts`

### Step 1: Write failing test for link management

```typescript
// tests/evolution/links/LinkManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { LinkManager } from '../src/evolution/links/LinkManager';
import { SpanTracker } from '../src/evolution/instrumentation/SpanTracker';
import { SQLiteStore } from '../src/evolution/storage/SQLiteStore';
import path from 'path';
import os from 'os';

describe('LinkManager', () => {
  let linkManager: LinkManager;
  let tracker: SpanTracker;
  let store: SQLiteStore;

  beforeEach(async () => {
    const dbPath = path.join(os.tmpdir(), `evolution-links-${Date.now()}.db`);
    store = new SQLiteStore({ dbPath });
    await store.initialize();

    tracker = new SpanTracker({ store });
    linkManager = new LinkManager(tracker, store);
  });

  it('should link reward to operation span', async () => {
    // Create operation span
    const task = await tracker.startTask({ test: 'task' });
    const execution = await tracker.startExecution();
    const span = tracker.startSpan({ name: 'code_review' });
    const spanId = span.spanId;
    await span.end();

    // Link reward
    await linkManager.linkReward(spanId, {
      value: 0.9,
      feedback: 'Excellent work',
      dimensions: { accuracy: 0.95, speed: 0.85 }
    });

    // Verify reward was recorded
    const rewards = await store.queryRewardsByOperationSpan(spanId);
    expect(rewards).toHaveLength(1);
    expect(rewards[0].value).toBe(0.9);
    expect(rewards[0].dimensions?.accuracy).toBe(0.95);
  });

  it('should query linked spans', async () => {
    const task = await tracker.startTask({ test: 'task' });
    const execution = await tracker.startExecution();
    const span = tracker.startSpan({ name: 'code_review' });
    const spanId = span.spanId;
    await span.end();

    await linkManager.linkReward(spanId, { value: 0.9 });

    const linkedSpans = await linkManager.queryRewardsForOperation(spanId);
    expect(linkedSpans).toHaveLength(1);
    expect(linkedSpans[0].name).toBe('evolution.reward');
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm test -- tests/evolution/links/LinkManager.test.ts`
Expected: FAIL - module not found

### Step 3: Implement LinkManager

```typescript
// src/evolution/links/LinkManager.ts
import { SpanTracker } from '../instrumentation/SpanTracker';
import type { EvolutionStore } from '../storage/EvolutionStore';
import type { Span, Reward } from '../storage/types';
import { v4 as uuid } from 'uuid';

export interface RewardInput {
  value: number; // 0-1
  feedback?: string;
  dimensions?: Record<string, number>;
}

export class LinkManager {
  constructor(
    private tracker: SpanTracker,
    private store: EvolutionStore
  ) {}

  /**
   * Link a reward to a previous operation span
   */
  async linkReward(
    operationSpanId: string,
    reward: RewardInput
  ): Promise<void> {
    // Create reward span
    const rewardSpan = this.tracker.startSpan({
      name: 'evolution.reward',
      attributes: {
        'reward.value': reward.value,
        'reward.feedback': reward.feedback,
        ...(reward.dimensions || {})
      },
      links: [{
        trace_id: '', // Will be filled by span tracker
        span_id: operationSpanId,
        attributes: { 'link.type': 'reward_for_operation' }
      }]
    });

    await rewardSpan.end();

    // Store reward record
    const rewardRecord: Reward = {
      id: uuid(),
      operation_span_id: operationSpanId,
      value: reward.value,
      dimensions: reward.dimensions,
      timestamp: Date.now(),
      created_at: new Date()
    };

    await this.store.recordReward(rewardRecord);
  }

  /**
   * Query all rewards for an operation
   */
  async queryRewardsForOperation(operationSpanId: string): Promise<Span[]> {
    return await this.store.queryLinkedSpans(operationSpanId);
  }

  /**
   * Get reward records by operation span
   */
  async getRewards(operationSpanId: string): Promise<Reward[]> {
    return await this.store.queryRewardsByOperationSpan(operationSpanId);
  }
}
```

### Step 4: Add missing methods to EvolutionStore

```typescript
// src/evolution/storage/EvolutionStore.ts (add methods)
export interface EvolutionStore {
  // ... existing methods ...

  // Rewards
  recordReward(reward: Reward): Promise<void>;
  queryRewardsByOperationSpan(operationSpanId: string): Promise<Reward[]>;
}
```

### Step 5: Implement reward methods in SQLiteStore

```typescript
// src/evolution/storage/SQLiteStore.ts (add methods)

async recordReward(reward: Reward): Promise<void> {
  validateReward(reward);

  this.db.prepare(`
    INSERT INTO rewards (id, operation_span_id, value, dimensions, timestamp, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    reward.id,
    reward.operation_span_id,
    reward.value,
    JSON.stringify(reward.dimensions || {}),
    reward.timestamp,
    reward.created_at.toISOString()
  );
}

async queryRewardsByOperationSpan(operationSpanId: string): Promise<Reward[]> {
  const rows = this.db.prepare(`
    SELECT * FROM rewards WHERE operation_span_id = ? ORDER BY timestamp DESC
  `).all(operationSpanId) as any[];

  return rows.map(row => ({
    id: row.id,
    operation_span_id: row.operation_span_id,
    value: row.value,
    dimensions: JSON.parse(row.dimensions),
    timestamp: row.timestamp,
    created_at: new Date(row.created_at)
  }));
}
```

### Step 6: Run test to verify it passes

Run: `npm test -- tests/evolution/links/LinkManager.test.ts`
Expected: PASS

### Step 7: Commit

```bash
git add src/evolution/links/LinkManager.ts tests/evolution/links/LinkManager.test.ts src/evolution/storage/EvolutionStore.ts src/evolution/storage/SQLiteStore.ts
git commit -m "feat(evolution): add link manager for reward tracking"
```

---

## Remaining Tasks Summary

**Task 8: Tag Management** - Add tag helpers and queries
**Task 9: HTTP API - Evolution Endpoints** - Express server with evolution routes
**Task 10: HTTP API - Telemetry Endpoints** - Telemetry status, enable, disable, preview
**Task 11: CLI - Telemetry Commands** - CLI for telemetry management
**Task 12: CLI - Evolution Commands** - CLI for evolution system
**Task 13: Static HTML Reports** - Generate evolution and telemetry reports
**Task 14: Integration Tests** - Full E2E tests
**Task 15: Documentation** - User and developer docs

---

## Execution Handoff

Plan complete and saved to `docs/plans/2025-12-27-evolution-system-phase1.md`.

**Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
