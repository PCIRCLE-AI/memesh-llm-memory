-- A2A Agent Registry Database Schema
-- Path: ~/.claude-code-buddy/a2a-registry.db

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    agent_id TEXT PRIMARY KEY,
    base_url TEXT NOT NULL,
    port INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('active', 'inactive', 'stale')) DEFAULT 'active',
    last_heartbeat TEXT NOT NULL, -- ISO 8601 timestamp
    process_pid INTEGER, -- PID of the MeMesh server process for orphan detection
    capabilities TEXT, -- JSON string of AgentCapabilities
    metadata TEXT, -- JSON string
    created_at TEXT NOT NULL, -- ISO 8601 timestamp
    updated_at TEXT NOT NULL -- ISO 8601 timestamp
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_last_heartbeat ON agents(last_heartbeat);
CREATE INDEX IF NOT EXISTS idx_agents_port ON agents(port);

-- Migration: Add process_pid column if it doesn't exist (for existing databases)
-- SQLite doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN.
-- The AgentRegistry.initializeSchema() method checks PRAGMA table_info()
-- before executing this statement to avoid duplicate column errors.
ALTER TABLE agents ADD COLUMN process_pid INTEGER;
