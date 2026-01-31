-- A2A Task Queue Database Schema
-- Path: ~/.claude-code-buddy/a2a-tasks-{agent_id}.db

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    state TEXT NOT NULL CHECK(state IN ('SUBMITTED', 'WORKING', 'INPUT_REQUIRED', 'COMPLETED', 'FAILED', 'CANCELED', 'REJECTED')),
    name TEXT,
    description TEXT,
    priority TEXT CHECK(priority IN ('low', 'normal', 'high', 'urgent')) DEFAULT 'normal',
    session_id TEXT,
    created_at TEXT NOT NULL, -- ISO 8601 timestamp
    updated_at TEXT NOT NULL, -- ISO 8601 timestamp
    metadata TEXT -- JSON string
);

-- Index for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_tasks_session_id ON tasks(session_id);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
    parts TEXT NOT NULL, -- JSON array of message parts
    created_at TEXT NOT NULL, -- ISO 8601 timestamp
    metadata TEXT, -- JSON string
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Index for message queries
CREATE INDEX IF NOT EXISTS idx_messages_task_id ON messages(task_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Artifacts table
CREATE TABLE IF NOT EXISTS artifacts (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    type TEXT NOT NULL, -- MIME type or custom type
    name TEXT,
    content TEXT NOT NULL, -- Text content or base64-encoded binary
    encoding TEXT DEFAULT 'utf-8' CHECK(encoding IN ('utf-8', 'base64')),
    size INTEGER, -- bytes
    created_at TEXT NOT NULL, -- ISO 8601 timestamp
    metadata TEXT, -- JSON string
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);

-- Index for artifact queries
CREATE INDEX IF NOT EXISTS idx_artifacts_task_id ON artifacts(task_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type);
CREATE INDEX IF NOT EXISTS idx_artifacts_created_at ON artifacts(created_at);
