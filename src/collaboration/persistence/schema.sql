-- src/collaboration/persistence/schema.sql
-- Smart Agents Collaboration Framework - Database Schema

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
    task,
    content='sessions',
    content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER IF NOT EXISTS sessions_fts_insert AFTER INSERT ON sessions BEGIN
    INSERT INTO sessions_fts(rowid, task) VALUES (new.rowid, new.task);
END;

CREATE TRIGGER IF NOT EXISTS sessions_fts_update AFTER UPDATE ON sessions BEGIN
    UPDATE sessions_fts SET task = new.task WHERE rowid = new.rowid;
END;

CREATE TRIGGER IF NOT EXISTS sessions_fts_delete AFTER DELETE ON sessions BEGIN
    DELETE FROM sessions_fts WHERE rowid = old.rowid;
END;

-- Insert initial schema version
INSERT OR IGNORE INTO schema_version (version, description)
VALUES (1, 'Initial schema with teams, sessions, and results');
