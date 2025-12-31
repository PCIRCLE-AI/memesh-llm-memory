-- Knowledge Graph SQLite Schema

-- Entities table
CREATE TABLE IF NOT EXISTS entities (
  name TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
);

-- Observations table (one-to-many with entities)
CREATE TABLE IF NOT EXISTS observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (entity_name) REFERENCES entities(name) ON DELETE CASCADE
);

-- Relations table
CREATE TABLE IF NOT EXISTS relations (
  from_entity TEXT NOT NULL,
  to_entity TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  PRIMARY KEY (from_entity, to_entity, relation_type),
  FOREIGN KEY (from_entity) REFERENCES entities(name) ON DELETE CASCADE,
  FOREIGN KEY (to_entity) REFERENCES entities(name) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_observations_entity ON observations(entity_name);
CREATE INDEX IF NOT EXISTS idx_relations_from ON relations(from_entity);
CREATE INDEX IF NOT EXISTS idx_relations_to ON relations(to_entity);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);

-- Full-text search for observations (optional, for advanced search)
CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
  entity_name,
  content,
  content='observations',
  content_rowid='id'
);

-- Triggers to keep FTS table in sync
CREATE TRIGGER IF NOT EXISTS observations_ai AFTER INSERT ON observations BEGIN
  INSERT INTO observations_fts(rowid, entity_name, content)
  VALUES (new.id, new.entity_name, new.content);
END;

CREATE TRIGGER IF NOT EXISTS observations_ad AFTER DELETE ON observations BEGIN
  DELETE FROM observations_fts WHERE rowid = old.id;
END;

CREATE TRIGGER IF NOT EXISTS observations_au AFTER UPDATE ON observations BEGIN
  DELETE FROM observations_fts WHERE rowid = old.id;
  INSERT INTO observations_fts(rowid, entity_name, content)
  VALUES (new.id, new.entity_name, new.content);
END;
