[2025-12-24T22:56:30.259Z] [INFO] 🎯 開始 P1 實作規劃...
 
[2025-12-24T22:56:30.260Z] [INFO] CollaborationManager: Initializing... 
[2025-12-24T22:56:30.260Z] [INFO] CollaborationManager: Initialized successfully 
[2025-12-24T22:56:30.261Z] [INFO] TeamCoordinator: Registered agent SQLite Architect (186c7b04-039a-4861-83ba-21638444cbd2) 
[2025-12-24T22:56:30.261Z] [INFO] CollaborationManager: Agent SQLite Architect registered and subscribed to messages 
[2025-12-24T22:56:30.261Z] [INFO] TeamCoordinator: Registered agent API Security Architect (0273d1bc-b6fc-41a7-b516-00f4901e87a9) 
[2025-12-24T22:56:30.261Z] [INFO] CollaborationManager: Agent API Security Architect registered and subscribed to messages 
[2025-12-24T22:56:30.261Z] [INFO] TeamCoordinator: Registered agent E2E Testing Architect (f5f74159-9ad9-413e-9b23-d504cc34b02e) 
[2025-12-24T22:56:30.261Z] [INFO] CollaborationManager: Agent E2E Testing Architect registered and subscribed to messages 
[2025-12-24T22:56:30.261Z] [INFO] ✅ 已註冊 3 個 Architecture Agents
 
[2025-12-24T22:56:30.261Z] [INFO] TeamCoordinator: Created team P1 Implementation Team (ccfd1676-9049-4e83-b872-5fba0d36b72e) with 3 members 
[2025-12-24T22:56:30.261Z] [INFO] ✅ 已創建規劃團隊: P1 Implementation Team
 
[2025-12-24T22:56:30.261Z] [INFO] 📋 開始執行 P1 規劃任務...
 
[2025-12-24T22:56:30.261Z] [INFO] CollaborationManager: Executing collaborative task: Plan P1 feature implementation: SQLite persistence, Rate limiting, API retry, E2E tests 
[2025-12-24T22:56:30.261Z] [INFO] TeamCoordinator: Selected team P1 Implementation Team for task 8c300617-1997-4e4e-a1be-3bc74f80f0ab (match: 100%) 
[2025-12-24T22:56:30.261Z] [INFO] TeamCoordinator: Assigned analyze_architecture to SQLite Architect (workload: 1) 
[2025-12-24T22:56:30.261Z] [INFO] TeamCoordinator: Assigned suggest_improvements to API Security Architect (workload: 1) 
[2025-12-24T22:56:30.261Z] [INFO] TeamCoordinator: Assigned evaluate_technology to E2E Testing Architect (workload: 1) 
[2025-12-24T22:56:30.261Z] [INFO] TeamCoordinator: Decomposed task 8c300617-1997-4e4e-a1be-3bc74f80f0ab into 3 subtasks 
[2025-12-24T22:56:30.261Z] [INFO] TeamCoordinator: Executing task 8c300617-1997-4e4e-a1be-3bc74f80f0ab with team P1 Implementation Team 
[2025-12-24T22:56:30.261Z] [INFO] TeamCoordinator: Executing 3 subtasks in parallel 
[2025-12-24T22:56:30.262Z] [INFO] TeamCoordinator: Executing subtask 81255f70-efb6-41a9-a185-7dbab14063b5 with agent SQLite Architect 
[2025-12-24T22:56:30.262Z] [INFO] ArchitectureAgent: SQLite Architect received message from coordinator 
[2025-12-24T22:56:30.262Z] [INFO] ArchitectureAgent: SQLite Architect received message from coordinator 
[2025-12-24T22:56:30.262Z] [INFO] TeamCoordinator: Executing subtask 0e42dbfd-2310-412b-bd06-39f09b2bd411 with agent API Security Architect 
[2025-12-24T22:56:30.262Z] [INFO] ArchitectureAgent: API Security Architect received message from coordinator 
[2025-12-24T22:56:30.262Z] [INFO] ArchitectureAgent: API Security Architect received message from coordinator 
[2025-12-24T22:56:30.262Z] [INFO] TeamCoordinator: Executing subtask 3b6820b3-cc26-415a-9002-b0eeda4e0ade with agent E2E Testing Architect 
[2025-12-24T22:56:30.262Z] [INFO] ArchitectureAgent: E2E Testing Architect received message from coordinator 
[2025-12-24T22:56:30.262Z] [INFO] ArchitectureAgent: E2E Testing Architect received message from coordinator 
[2025-12-24T22:57:17.887Z] [INFO] TeamCoordinator: Task 8c300617-1997-4e4e-a1be-3bc74f80f0ab completed in 47626ms 
[2025-12-24T22:57:17.889Z] [INFO] 
════════════════════════════════════════════════════════════════════════════════ 
[2025-12-24T22:57:17.889Z] [INFO] 📊 P1 實作規劃結果 
[2025-12-24T22:57:17.889Z] [INFO] ════════════════════════════════════════════════════════════════════════════════ 
[2025-12-24T22:57:17.889Z] [INFO] 
Session ID: 561c3bb5-12b0-4a93-ae8f-aa4d7bdb4c99 
[2025-12-24T22:57:17.889Z] [INFO] Team: P1 Implementation Team 
[2025-12-24T22:57:17.889Z] [INFO] Status: ✅ 規劃完成 
[2025-12-24T22:57:17.889Z] [INFO] Duration: 47.6s 
[2025-12-24T22:57:17.889Z] [INFO] Cost: $0.0000 
[2025-12-24T22:57:17.889Z] [INFO] 
📝 實作規劃： 
[2025-12-24T22:57:17.889Z] [INFO] ──────────────────────────────────────────────────────────────────────────────── 
[2025-12-24T22:57:17.889Z] [INFO] 
[SQLite Architect]
# P1 Feature Implementation Plan

## Executive Summary
Implementing 4 critical P1 features with estimated 14-20 hours total effort. Focus on production readiness: persistence, security, reliability, and testing.

---

## Feature 1: SQLite Persistence (4-6 hours)

### Implementation Strategy

#### 1.1 Database Schema Design

```sql
-- src/collaboration/persistence/schema.sql

-- Schema version management
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

-- Agent teams configuration
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Team members (agents)
CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id TEXT NOT NULL,
    agent_type TEXT NOT NULL, -- 'researcher', 'writer', 'coder', etc.
    agent_name TEXT NOT NULL,
    capabilities TEXT NOT NULL, -- JSON array
    config TEXT, -- JSON configuration
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    UNIQUE(team_id, agent_name)
);

-- Collaboration sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    team_id TEXT NOT NULL,
    task TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Session results and artifacts
CREATE TABLE IF NOT EXISTS session_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    agent_name TEXT NOT NULL,
    result_type TEXT NOT NULL, -- 'research', 'code', 'analysis', etc.
    content TEXT NOT NULL,
    metadata TEXT, -- JSON
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sessions_team ON sessions(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_results_session ON session_results(session_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);

-- Full-text search on tasks
CREATE VIRTUAL TABLE IF NOT EXISTS sessions_fts USING fts5(
    session_id,
    task,
    content='sessions',
    content_rowid='rowid'
);

-- Trigger to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS sessions_fts_insert AFTER INSERT ON sessions BEGIN
    INSERT INTO sessions_fts(session_id, task) VALUES (new.id, new.task);
END;

CREATE TRIGGER IF NOT EXISTS sessions_fts_update AFTER UPDATE ON sessions BEGIN
    UPDATE sessions_fts SET task = new.task WHERE session_id = new.id;
END;

CREATE TRIGGER IF NOT EXISTS sessions_fts_delete AFTER DELETE ON sessions BEGIN
    DELETE FROM sessions_fts WHERE session_id = old.id;
END;

-- Insert initial schema version
INSERT OR IGNORE INTO schema_version (version, description) 
VALUES (1, 'Initial schema with teams, sessions, and results');
```

#### 1.2 Database Layer Implementation

```typescript
// src/collaboration/persistence/database.ts

import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';
import { logger } from '../../utils/logger';

export interface Team {
  id: string;
  name: string;
  description?: string;
  created_at: Date;
  updated_at: Date;
  members: TeamMember[];
}

export interface TeamMember {
  id?: number;
  team_id: string;
  agent_type: string;
  agent_name: string;
  capabilities: string[];
  config?: Record<string, any>;
  added_at?: Date;
}

export interface Session {
  id: string;
  team_id: string;
  task: string;
  status: 'running' | 'completed' | 'failed';
  created_at: Date;
  completed_at?: Date;
  results?: SessionResult[];
}

export interface SessionResult {
  id?: number;
  session_id: string;
  agent_name: string;
  result_type: string;
  content: string;
  metadata?: Record<string, any>;
  created_at?: Date;
}

export class CollaborationDatabase {
  private db: Database | null = null;
  private readonly dbPath: string;
  private readonly schemaPath: string;

  constructor(dbPath: string = './data/collaboration.db') {
    this.dbPath = dbPath;
    this.schemaPath = join(__dirname, 'schema.sql');
  }

  /**
   * Initialize database connection and schema
   */
  async initialize(): Promise<void> {
    try {
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database,
      });

      // Enable foreign keys
      await this.db.exec('PRAGMA foreign_keys = ON');
      
      // Apply schema
      const schema = readFileSync(this.schemaPath, 'utf-8');
      await this.db.exec(schema);

      logger.info('Database initialized successfully', { path: this.dbPath });
    } catch (error) {
      logger.error('Failed to initialize database', { error });
      throw new Error(`Database initialization failed: ${error}`);
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      logger.info('Database connection closed');
    }
  }

  /**
   * Team Operations
   */

  async createTeam(team: Omit<Team, 'created_at' | 'updated_at' | 'members'>): Promise<Team> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.run(
        'INSERT INTO teams (id, name, description) VALUES (?, ?, ?)',
        team.id,
        team.name,
        team.description
      );

      const created = await this.getTeam(team.id);
      if (!created) throw new Error('Failed to retrieve created team');

      logger.info('Team created', { teamId: team.id, name: team.name });
      return created;
    } catch (error) {
      logger.error('Failed to create team', { error, team });
      throw error;
    }
  }

  async getTeam(teamId: string): Promise<Team | null> {
    if (!this.db) throw new Error('Database not initialized');

    const team = await this.db.get<Team>(
      'SELECT * FROM teams WHERE id = ?',
      teamId
    );

    if (!team) return null;

    // Load team members
    const members = await this.db.all<TeamMember[]>(
      'SELECT * FROM team_members WHERE team_id = ?',
      teamId
    );

    // Parse JSON fields
    team.members = members.map((m) => ({
      ...m,
      capabilities: JSON.parse(m.capabilities as any),
      config: m.config ? JSON.parse(m.config as any) : undefined,
    }));

    return team;
  }

  async listTeams(): Promise<Team[]> {
    if (!this.db) throw new Error('Database not initialized');

    const teams = await this.db.all<Team[]>('SELECT * FROM teams ORDER BY created_at DESC');

    // Load members for each team
    for (const team of teams) {
      const members = await this.db.all<TeamMember[]>(
        'SELECT * FROM team_members WHERE team_id = ?',
        team.id
      );
      team.members = members.map((m) => ({
        ...m,
        capabilities: JSON.parse(m.capabilities as any),
        config: m.config ? JSON.parse(m.config as any) : undefined,
      }));
    }

    return teams;
  }

  async addTeamMember(member: Omit<TeamMember, 'id' | 'added_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `INSERT INTO team_members (team_id, agent_type, agent_name, capabilities, config)
       VALUES (?, ?, ?, ?, ?)`,
      member.team_id,
      member.agent_type,
      member.agent_name,
      JSON.stringify(member.capabilities),
      member.config ? JSON.stringify(member.config) : null
    );

    // Update team updated_at
    await this.db.run(
      'UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      member.team_id
    );

    logger.info('Team member added', { teamId: member.team_id, agent: member.agent_name });
  }

  async removeTeamMember(teamId: string, agentName: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      'DELETE FROM team_members WHERE team_id = ? AND agent_name = ?',
      teamId,
      agentName
    );

    await this.db.run(
      'UPDATE teams SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      teamId
    );

    logger.info('Team member removed', { teamId, agent: agentName });
  }

  /**
   * Session Operations
   */

  async createSession(session: Omit<Session, 'created_at' | 'completed_at' | 'results'>): Promise<Session> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      'INSERT INTO sessions (id, team_id, task, status) VALUES (?, ?, ?, ?)',
      session.id,
      session.team_id,
      session.task,
      session.status
    );

    const created = await this.getSession(session.id);
    if (!created) throw new Error('Failed to retrieve created session');

    logger.info('Session created', { sessionId: session.id, teamId: session.team_id });
    return created;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    if (!this.db) throw new Error('Database not initialized');

    const session = await this.db.get<Session>(
      'SELECT * FROM sessions WHERE id = ?',
      sessionId
    );

    if (!session) return null;

    // Load results
    const results = await this.db.all<SessionResult[]>(
      'SELECT * FROM session_results WHERE session_id = ? ORDER BY created_at',
      sessionId
    );

    session.results = results.map((r) => ({
      ...r,
      metadata: r.metadata ? JSON.parse(r.metadata as any) : undefined,
    }));

    return session;
  }

  async updateSessionStatus(
    sessionId: string,
    status: Session['status'],
    completedAt?: Date
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `UPDATE sessions 
       SET status = ?, completed_at = ?
       WHERE id = ?`,
      status,
      completedAt?.toISOString(),
      sessionId
    );

    logger.info('Session status updated', { sessionId, status });
  }

  async addSessionResult(result: Omit<SessionResult, 'id' | 'created_at'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.run(
      `INSERT INTO session_results (session_id, agent_name, result_type, content, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      result.session_id,
      result.agent_name,
      result.result_type,
      result.content,
      result.metadata ? JSON.stringify(result.metadata) : null
    );

    logger.info('Session result added', { 
      sessionId: result.session_id, 
      agent: result.agent_name,
      type: result.result_type 
    });
  }

  async listRecentSessions(limit: number = 50): Promise<Session[]> {
    if (!this.db) throw new Error('Database not initialized');

    const sessions = await this.db.all<Session[]>(
      'SELECT * FROM sessions ORDER BY created_at DESC LIMIT ?',
      limit
    );

    // Load results for each session
    for (const session of sessions) {
      const results = await this.db.all<SessionResult[]>(
        'SELECT * FROM session_results WHERE session_id = ? ORDER BY created_at',
        session.id
      );
      session.results = results.map((r) => ({
        ...r,
        metadata: r.metadata ? JSON.parse(r.metadata as any) : undefined,
      }));
    }

    return sessions;
  }

  async searchSessions(query: string, limit: number = 20): Promise<Session[]> {
    if (!this.db) throw new Error('Database not initialized');

    const sessions = await this.db.all<Session[]>(
      `SELECT s.* FROM sessions s
       JOIN sessions_fts fts ON s.id = fts.session_id
       WHERE sessions_fts MATCH ?
       ORDER BY s.created_at DESC
       LIMIT ?`,
      query,
      limit
    );

    // Load results
    for (const session of sessions) {
      const results = await this.db.all<SessionResult[]>(
        'SELECT * FROM session_results WHERE session_id = ? ORDER BY created_at',
        session.id
      );
      session.results = results.map((r) => ({
        ...r,
        metadata: r.metadata ? JSON.parse(r.metadata as any) : undefined,
      }));
    }

    return sessions;
  }

  async getTeamSessions(teamId: string, limit: number = 50): Promise<Session[]> {
    if (!this.db) throw new Error('Database not initialized');

    const sessions = await this.db.all<Session[]>(
      'SELECT * FROM sessions WHERE team_id = ? ORDER BY created_at DESC LIMIT ?',
      teamId,
      limit
    );

    // Load results
    for (const session of sessions) {
      const results = await this.db.all<SessionResult[]>(
        'SELECT * FROM session_results WHERE session_id = ? ORDER BY created_at',
        session.id
      );
      session.results = results.map((r) => ({
        ...r,
        metadata: r.metadata ? JSON.parse(r.metadata as any) : undefined,
      }));
    }

    return sessions;
  }

  /**
   * Maintenance Operations
   */

  async vacuum(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    await this.db.exec('VACUUM');
    logger.info('Database vacuumed');
  }

  async getStats(): Promise<{
    teams: number;
    sessions: number;
    results: number;
    dbSize: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const teams = await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM teams');
    const sessions = await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM sessions');
    const results = await this.db.get<{ count: number }>('SELECT COUNT(*) as count FROM session_results');
    const dbSize = await this.db.get<{ size: number }>('SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()');

    return {
      teams: teams?.count
 
[2025-12-24T22:57:17.889Z] [INFO] 
[API Security Architect]
# Architecture Analysis: P1 Features Implementation

## Executive Summary
**Status**: ✅ Ready for Implementation  
**Total Estimated Effort**: 14-20 hours  
**Risk Level**: LOW (well-scoped, independent features)  
**Recommended Order**: 3 → 2 → 1 → 4 (retry → rate limit → persistence → E2E)

---

## Feature 1: SQLite Persistence

### Database Schema Design

```sql
-- src/collaboration/persistence/schema.sql

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now')),
    description TEXT NOT NULL
);

-- Agent teams configuration
CREATE TABLE IF NOT EXISTS teams (
    id TEXT PRIMARY KEY,  -- UUID
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    is_active INTEGER NOT NULL DEFAULT 1,
    metadata TEXT  -- JSON: custom config, tags, etc.
);

-- Team members (many-to-many: teams ↔ agents)
CREATE TABLE IF NOT EXISTS team_members (
    team_id TEXT NOT NULL,
    agent_type TEXT NOT NULL,  -- 'voice-rag', 'coordinator', etc.
    role TEXT,  -- 'leader', 'specialist', etc.
    capabilities TEXT NOT NULL,  -- JSON array: ['rag', 'transcription']
    added_at TEXT NOT NULL DEFAULT (datetime('now')),
    config TEXT,  -- JSON: agent-specific config
    PRIMARY KEY (team_id, agent_type),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- Collaboration sessions
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,  -- UUID
    team_id TEXT NOT NULL,
    task_description TEXT NOT NULL,
    status TEXT NOT NULL,  -- 'pending', 'running', 'completed', 'failed'
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    duration_ms INTEGER,  -- execution time
    error_message TEXT,
    results TEXT,  -- JSON: execution results
    FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- Session steps (detailed execution log)
CREATE TABLE IF NOT EXISTS session_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    step_number INTEGER NOT NULL,
    agent_type TEXT NOT NULL,
    action TEXT NOT NULL,
    input_data TEXT,  -- JSON
    output_data TEXT,  -- JSON
    started_at TEXT NOT NULL,
    completed_at TEXT,
    duration_ms INTEGER,
    status TEXT NOT NULL,  -- 'success', 'failed', 'skipped'
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sessions_team_id ON sessions(team_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_steps_session_id ON session_steps(session_id);
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);
CREATE INDEX IF NOT EXISTS idx_teams_active ON teams(is_active);

-- Initial schema version
INSERT INTO schema_version (version, description) VALUES (1, 'Initial schema');
```

### TypeScript Types

```typescript
// src/collaboration/persistence/types.ts

export interface TeamRecord {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  metadata?: Record<string, any>;
}

export interface TeamMemberRecord {
  team_id: string;
  agent_type: string;
  role?: string;
  capabilities: string[];  // Will be JSON in DB
  added_at: string;
  config?: Record<string, any>;
}

export interface SessionRecord {
  id: string;
  team_id: string;
  task_description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  error_message?: string;
  results?: Record<string, any>;
}

export interface SessionStepRecord {
  id: number;
  session_id: string;
  step_number: number;
  agent_type: string;
  action: string;
  input_data?: Record<string, any>;
  output_data?: Record<string, any>;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
  status: 'success' | 'failed' | 'skipped';
}

export interface QueryFilters {
  teamId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}
```

### Database Implementation

```typescript
// src/collaboration/persistence/database.ts

import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { TeamRecord, SessionRecord, SessionStepRecord, QueryFilters } from './types';

export class CollaborationDatabase {
  private db: Database | null = null;
  private readonly dbPath: string;

  constructor(dbPath: string = './data/collaboration.db') {
    this.dbPath = dbPath;
  }

  async initialize(): Promise<void> {
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });

    // Enable WAL mode for better concurrency
    await this.db.exec('PRAGMA journal_mode = WAL');
    await this.db.exec('PRAGMA synchronous = NORMAL');
    await this.db.exec('PRAGMA foreign_keys = ON');

    // Run schema
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    await this.db.exec(schema);
  }

  // === Teams ===
  async createTeam(team: Omit<TeamRecord, 'created_at' | 'updated_at'>): Promise<TeamRecord> {
    const result = await this.db!.run(
      `INSERT INTO teams (id, name, description, is_active, metadata)
       VALUES (?, ?, ?, ?, ?)`,
      team.id,
      team.name,
      team.description,
      team.is_active ? 1 : 0,
      team.metadata ? JSON.stringify(team.metadata) : null
    );

    return this.getTeam(team.id);
  }

  async getTeam(id: string): Promise<TeamRecord> {
    const row = await this.db!.get<any>(
      'SELECT * FROM teams WHERE id = ?',
      id
    );
    
    if (!row) throw new Error(`Team not found: ${id}`);
    return this.parseTeamRow(row);
  }

  async getTeamByName(name: string): Promise<TeamRecord | null> {
    const row = await this.db!.get<any>(
      'SELECT * FROM teams WHERE name = ?',
      name
    );
    
    return row ? this.parseTeamRow(row) : null;
  }

  async listTeams(activeOnly: boolean = true): Promise<TeamRecord[]> {
    const sql = activeOnly
      ? 'SELECT * FROM teams WHERE is_active = 1 ORDER BY name'
      : 'SELECT * FROM teams ORDER BY name';
    
    const rows = await this.db!.all<any[]>(sql);
    return rows.map(row => this.parseTeamRow(row));
  }

  async updateTeam(id: string, updates: Partial<TeamRecord>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      sets.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      sets.push('description = ?');
      values.push(updates.description);
    }
    if (updates.is_active !== undefined) {
      sets.push('is_active = ?');
      values.push(updates.is_active ? 1 : 0);
    }
    if (updates.metadata !== undefined) {
      sets.push('metadata = ?');
      values.push(JSON.stringify(updates.metadata));
    }

    sets.push('updated_at = datetime("now")');
    values.push(id);

    await this.db!.run(
      `UPDATE teams SET ${sets.join(', ')} WHERE id = ?`,
      ...values
    );
  }

  // === Team Members ===
  async addTeamMember(member: Omit<TeamMemberRecord, 'added_at'>): Promise<void> {
    await this.db!.run(
      `INSERT INTO team_members (team_id, agent_type, role, capabilities, config)
       VALUES (?, ?, ?, ?, ?)`,
      member.team_id,
      member.agent_type,
      member.role,
      JSON.stringify(member.capabilities),
      member.config ? JSON.stringify(member.config) : null
    );
  }

  async getTeamMembers(teamId: string): Promise<TeamMemberRecord[]> {
    const rows = await this.db!.all<any[]>(
      'SELECT * FROM team_members WHERE team_id = ? ORDER BY added_at',
      teamId
    );
    
    return rows.map(row => ({
      ...row,
      capabilities: JSON.parse(row.capabilities),
      config: row.config ? JSON.parse(row.config) : undefined
    }));
  }

  // === Sessions ===
  async createSession(session: Omit<SessionRecord, 'started_at'>): Promise<SessionRecord> {
    await this.db!.run(
      `INSERT INTO sessions (id, team_id, task_description, status, results)
       VALUES (?, ?, ?, ?, ?)`,
      session.id,
      session.team_id,
      session.task_description,
      session.status,
      session.results ? JSON.stringify(session.results) : null
    );

    return this.getSession(session.id);
  }

  async getSession(id: string): Promise<SessionRecord> {
    const row = await this.db!.get<any>(
      'SELECT * FROM sessions WHERE id = ?',
      id
    );
    
    if (!row) throw new Error(`Session not found: ${id}`);
    return this.parseSessionRow(row);
  }

  async updateSession(id: string, updates: Partial<SessionRecord>): Promise<void> {
    const sets: string[] = [];
    const values: any[] = [];

    if (updates.status !== undefined) {
      sets.push('status = ?');
      values.push(updates.status);
    }
    if (updates.completed_at !== undefined) {
      sets.push('completed_at = ?');
      values.push(updates.completed_at);
    }
    if (updates.duration_ms !== undefined) {
      sets.push('duration_ms = ?');
      values.push(updates.duration_ms);
    }
    if (updates.error_message !== undefined) {
      sets.push('error_message = ?');
      values.push(updates.error_message);
    }
    if (updates.results !== undefined) {
      sets.push('results = ?');
      values.push(JSON.stringify(updates.results));
    }

    values.push(id);

    await this.db!.run(
      `UPDATE sessions SET ${sets.join(', ')} WHERE id = ?`,
      ...values
    );
  }

  async querySessionsAsync(filters: QueryFilters): Promise<SessionRecord[]> {
    let sql = 'SELECT * FROM sessions WHERE 1=1';
    const params: any[] = [];

    if (filters.teamId) {
      sql += ' AND team_id = ?';
      params.push(filters.teamId);
    }
    if (filters.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters.startDate) {
      sql += ' AND started_at >= ?';
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      sql += ' AND started_at <= ?';
      params.push(filters.endDate);
    }

    sql += ' ORDER BY started_at DESC';

    if (filters.limit) {
      sql += ' LIMIT ?';
      params.push(filters.limit);
    }
    if (filters.offset) {
      sql += ' OFFSET ?';
      params.push(filters.offset);
    }

    const rows = await this.db!.all<any[]>(sql, ...params);
    return rows.map(row => this.parseSessionRow(row));
  }

  // === Session Steps ===
  async addSessionStep(step: Omit<SessionStepRecord, 'id'>): Promise<number> {
    const result = await this.db!.run(
      `INSERT INTO session_steps 
       (session_id, step_number, agent_type, action, input_data, output_data, 
        started_at, completed_at, duration_ms, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      step.session_id,
      step.step_number,
      step.agent_type,
      step.action,
      step.input_data ? JSON.stringify(step.input_data) : null,
      step.output_data ? JSON.stringify(step.output_data) : null,
      step.started_at,
      step.completed_at,
      step.duration_ms,
      step.status
    );

    return result.lastID!;
  }

  async getSessionSteps(sessionId: string): Promise<SessionStepRecord[]> {
    const rows = await this.db!.all<any[]>(
      'SELECT * FROM session_steps WHERE session_id = ? ORDER BY step_number',
      sessionId
    );
    
    return rows.map(row => ({
      ...row,
      input_data: row.input_data ? JSON.parse(row.input_data) : undefined,
      output_data: row.output_data ? JSON.parse(row.output_data) : undefined
    }));
  }

  // === Utilities ===
  private parseTeamRow(row: any): TeamRecord {
    return {
      ...row,
      is_active: Boolean(row.is_active),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    };
  }

  private parseSessionRow(row: any): SessionRecord {
    return {
      ...row,
      results: row.results ? JSON.parse(row.results) : undefined
    };
  }

  async close(): Promise<void> {
    await this.db?.close();
  }
}
```

### Migration System

```typescript
// src/collaboration/persistence/migrations.ts

import type { Database } from 'sqlite';

export interface Migration {
  version: number;
  description: string;
  up: (db: Database) => Promise<void>;
  down: (db: Database) => Promise<void>;
}

export const migrations: Migration[] = [
  {
    version: 2,
    description: 'Add session tags for categorization',
    up: async (db) => {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS session_tags (
          session_id TEXT NOT NULL,
          tag TEXT NOT NULL,
          PRIMARY KEY (session_id, tag),
          FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_session_tags_tag ON session_tags(tag);
      `);
    },
    down: async (db) => {
      await db.exec('DROP TABLE IF EXISTS session_tags');
    }
  }
  // Future migrations go here
];

export async function runMigrations(db: Database): Promise<void> {
  const currentVersion = await db.get
 
[2025-12-24T22:57:17.890Z] [INFO] 
[E2E Testing Architect]
# P1 Feature Implementation - Technology Evaluation

## Executive Summary
**Recommendation**: Implement in order: Rate Limiting → API Retry → SQLite → E2E Tests
**Total Effort**: 14-20 hours
**Risk Level**: Low (all proven technologies)
**API Cost**: ~$0.50 (primarily testing)

---

## 1. SQLite Persistence

### Technology Stack
```typescript
// Recommended: better-sqlite3 (synchronous, faster)
import Database from 'better-sqlite3';

// Alternative: node-sqlite3 (async, more npm downloads)
import sqlite3 from 'sqlite3';
```

### Implementation Plan

**Schema Design**:
```sql
-- src/collaboration/persistence/schema.sql
CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  capabilities TEXT NOT NULL, -- JSON array
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS team_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id TEXT NOT NULL,
  agent_type TEXT NOT NULL,
  config TEXT, -- JSON config
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS collaboration_sessions (
  id TEXT PRIMARY KEY,
  team_id TEXT NOT NULL,
  task TEXT NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'running', 'completed', 'failed'
  results TEXT, -- JSON results
  error TEXT,
  created_at INTEGER NOT NULL,
  completed_at INTEGER,
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

CREATE INDEX idx_sessions_team ON collaboration_sessions(team_id);
CREATE INDEX idx_sessions_created ON collaboration_sessions(created_at DESC);
```

**Database Manager**:
```typescript
// src/collaboration/persistence/database.ts
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

export class CollaborationDB {
  private db: Database.Database;
  
  constructor(dbPath: string = './data/collaboration.db') {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Better concurrency
    this.initialize();
  }
  
  private initialize() {
    const schema = fs.readFileSync(
      path.join(__dirname, 'schema.sql'),
      'utf-8'
    );
    this.db.exec(schema);
  }
  
  // Team Operations
  createTeam(team: {
    id: string;
    name: string;
    description?: string;
    members: Array<{ type: string; config?: any }>;
  }) {
    const insert = this.db.prepare(`
      INSERT INTO teams (id, name, description, capabilities, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    const capabilities = team.members.map(m => m.type);
    const now = Date.now();
    
    insert.run(
      team.id,
      team.name,
      team.description || '',
      JSON.stringify(capabilities),
      now,
      now
    );
    
    // Insert members
    const insertMember = this.db.prepare(`
      INSERT INTO team_members (team_id, agent_type, config)
      VALUES (?, ?, ?)
    `);
    
    for (const member of team.members) {
      insertMember.run(
        team.id,
        member.type,
        member.config ? JSON.stringify(member.config) : null
      );
    }
  }
  
  getTeam(teamId: string) {
    const team = this.db.prepare(`
      SELECT * FROM teams WHERE id = ?
    `).get(teamId);
    
    if (!team) return null;
    
    const members = this.db.prepare(`
      SELECT agent_type, config FROM team_members WHERE team_id = ?
    `).all(teamId);
    
    return {
      ...team,
      capabilities: JSON.parse(team.capabilities),
      members: members.map(m => ({
        type: m.agent_type,
        config: m.config ? JSON.parse(m.config) : null
      }))
    };
  }
  
  // Session Operations
  createSession(session: {
    id: string;
    teamId: string;
    task: string;
  }) {
    this.db.prepare(`
      INSERT INTO collaboration_sessions 
      (id, team_id, task, status, created_at)
      VALUES (?, ?, ?, 'pending', ?)
    `).run(session.id, session.teamId, session.task, Date.now());
  }
  
  updateSession(sessionId: string, updates: {
    status?: string;
    results?: any;
    error?: string;
  }) {
    const fields: string[] = [];
    const values: any[] = [];
    
    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.results) {
      fields.push('results = ?');
      values.push(JSON.stringify(updates.results));
    }
    if (updates.error) {
      fields.push('error = ?');
      values.push(updates.error);
    }
    if (updates.status === 'completed' || updates.status === 'failed') {
      fields.push('completed_at = ?');
      values.push(Date.now());
    }
    
    values.push(sessionId);
    
    this.db.prepare(`
      UPDATE collaboration_sessions 
      SET ${fields.join(', ')}
      WHERE id = ?
    `).run(...values);
  }
  
  getRecentSessions(limit: number = 10) {
    return this.db.prepare(`
      SELECT s.*, t.name as team_name
      FROM collaboration_sessions s
      JOIN teams t ON s.team_id = t.id
      ORDER BY s.created_at DESC
      LIMIT ?
    `).all(limit);
  }
  
  searchSessions(filters: {
    teamId?: string;
    status?: string;
    searchTerm?: string;
  }) {
    let query = `
      SELECT s.*, t.name as team_name
      FROM collaboration_sessions s
      JOIN teams t ON s.team_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (filters.teamId) {
      query += ' AND s.team_id = ?';
      params.push(filters.teamId);
    }
    if (filters.status) {
      query += ' AND s.status = ?';
      params.push(filters.status);
    }
    if (filters.searchTerm) {
      query += ' AND s.task LIKE ?';
      params.push(`%${filters.searchTerm}%`);
    }
    
    query += ' ORDER BY s.created_at DESC LIMIT 50';
    
    return this.db.prepare(query).all(...params);
  }
  
  close() {
    this.db.close();
  }
}
```

**Migration System**:
```typescript
// src/collaboration/persistence/migrations.ts
export interface Migration {
  version: number;
  up: string;
  down: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    up: `
      -- Initial schema (from schema.sql)
    `,
    down: `
      DROP TABLE IF EXISTS collaboration_sessions;
      DROP TABLE IF EXISTS team_members;
      DROP TABLE IF EXISTS teams;
    `
  },
  // Future migrations here
];

export function runMigrations(db: Database.Database) {
  // Create migrations table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `);
  
  const currentVersion = db.prepare(
    'SELECT MAX(version) as version FROM schema_migrations'
  ).get()?.version || 0;
  
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      console.log(`Applying migration ${migration.version}...`);
      db.exec(migration.up);
      db.prepare(
        'INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)'
      ).run(migration.version, Date.now());
    }
  }
}
```

**Integration**:
```typescript
// src/collaboration/CollaborationManager.ts
import { CollaborationDB } from './persistence/database';

export class CollaborationManager {
  private db: CollaborationDB;
  
  constructor() {
    this.db = new CollaborationDB();
  }
  
  async createTeam(config: TeamConfig) {
    const team = new AgentTeam(config);
    
    // Persist to database
    this.db.createTeam({
      id: team.id,
      name: config.name,
      description: config.description,
      members: config.members
    });
    
    return team;
  }
  
  async executeTask(teamId: string, task: string) {
    const sessionId = `session_${Date.now()}`;
    
    // Create session record
    this.db.createSession({ id: sessionId, teamId, task });
    
    try {
      this.db.updateSession(sessionId, { status: 'running' });
      
      const team = await this.getTeam(teamId);
      const results = await team.execute(task);
      
      this.db.updateSession(sessionId, {
        status: 'completed',
        results
      });
      
      return results;
    } catch (error) {
      this.db.updateSession(sessionId, {
        status: 'failed',
        error: error.message
      });
      throw error;
    }
  }
}
```

### Testing
```typescript
// tests/unit/collaboration-db.test.ts
import { CollaborationDB } from '../../src/collaboration/persistence/database';
import fs from 'fs';

describe('CollaborationDB', () => {
  let db: CollaborationDB;
  const testDbPath = './data/test.db';
  
  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new CollaborationDB(testDbPath);
  });
  
  afterEach(() => {
    db.close();
  });
  
  it('should create and retrieve teams', () => {
    db.createTeam({
      id: 'team-1',
      name: 'Research Team',
      members: [
        { type: 'researcher' },
        { type: 'analyst' }
      ]
    });
    
    const team = db.getTeam('team-1');
    expect(team).toBeDefined();
    expect(team.name).toBe('Research Team');
    expect(team.members).toHaveLength(2);
  });
  
  it('should track session lifecycle', () => {
    db.createTeam({
      id: 'team-1',
      name: 'Test Team',
      members: [{ type: 'worker' }]
    });
    
    db.createSession({
      id: 'session-1',
      teamId: 'team-1',
      task: 'Test task'
    });
    
    db.updateSession('session-1', { status: 'running' });
    db.updateSession('session-1', {
      status: 'completed',
      results: { output: 'success' }
    });
    
    const sessions = db.getRecentSessions(1);
    expect(sessions[0].status).toBe('completed');
    expect(sessions[0].completed_at).toBeDefined();
  });
});
```

---

## 2. Rate Limiting

### Technology Stack
```typescript
// Recommended: express-rate-limit (simple, proven)
import rateLimit from 'express-rate-limit';

// Alternative: redis-backed for distributed systems
import RedisStore from 'rate-limit-redis';
```

### Implementation

**Rate Limiter Middleware**:
```typescript
// src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: {
    error: 'Too many requests, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// Strict limiter for voice endpoints
export const voiceLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Voice endpoint rate limit exceeded',
    retryAfter: '1 minute'
  },
  skipSuccessfulRequests: false, // Count all requests
  skipFailedRequests: false,
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Voice processing is rate-limited to 10 requests per minute.',
      retryAfter: req.rateLimit.resetTime
    });
  }
});

// File upload limiter
export const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5, // 5 uploads per minute
  message: {
    error: 'Upload rate limit exceeded',
    retryAfter: '1 minute'
  }
});

// Configurable rate limiter factory
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    message: {
      error: options.message,
      retryAfter: `${options.windowMs / 1000} seconds`
    },
    standardHeaders: true,
    legacyHeaders: false
  });
}

// Environment-based configuration
export const getRateLimitConfig = () => ({
  general: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100')
  },
  voice: {
    windowMs: parseInt(process.env.VOICE_RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.VOICE_RATE_LIMIT_MAX || '10')
  },
  upload: {
    windowMs: parseInt(process.env.UPLOAD_RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX || '5')
  }
});
```

**Server Integration**:
```typescript
// src/agents/voice-rag/server.ts
import express from 'express';
import { apiLimiter, voiceLimiter, uploadLimiter } from '../../middleware/rateLimiter';

const app = express();

// Apply general rate limiter to all routes
app.use('/api/', apiLimiter);

// Voice-specific rate limiting
app.post('/api/voice/transcribe', voiceLimiter, transcribeHandler);
app.post('/api/voice
 
[2025-12-24T22:57:17.890Z] [INFO] CollaborationManager: Shutting down... 
[2025-12-24T22:57:17.890Z] [INFO] ArchitectureAgent: SQLite Architect shutting down 
[2025-12-24T22:57:17.890Z] [INFO] ArchitectureAgent: API Security Architect shutting down 
[2025-12-24T22:57:17.890Z] [INFO] ArchitectureAgent: E2E Testing Architect shutting down 
[2025-12-24T22:57:17.890Z] [INFO] CollaborationManager: Shutdown complete 
[2025-12-24T22:57:17.890Z] [INFO] 
✅ P1 規劃完成！
 
[2025-12-24T22:57:17.890Z] [INFO] 📋 下一步：根據規劃執行實作任務 
