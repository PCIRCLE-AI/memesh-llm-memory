# Deployment Guide

**Claude Code Buddy (CCB) - Installation, Configuration, and Operations**

**Version**: 2.0.0
**Last Updated**: 2026-01-01

---

## Table of Contents

1. [System Requirements](#system-requirements)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Database Setup](#database-setup)
5. [MCP Integration](#mcp-integration)
6. [Backup and Restore](#backup-and-restore)
7. [Monitoring and Logging](#monitoring-and-logging)
8. [Troubleshooting](#troubleshooting)
9. [Upgrade Guide](#upgrade-guide)

---

## System Requirements

### Minimum Requirements

| Component | Requirement |
|-----------|-------------|
| **Node.js** | 18.0.0 or higher |
| **npm** | 9.0.0 or higher |
| **Memory** | 500MB available RAM |
| **Disk Space** | 200MB for installation + 1GB for data |
| **Operating System** | macOS 10.15+, Linux (Ubuntu 20.04+), Windows 10+ (WSL2 recommended) |

### Recommended Requirements

| Component | Recommendation |
|-----------|----------------|
| **Node.js** | 20.0.0 (LTS) |
| **Memory** | 2GB available RAM |
| **Disk Space** | 5GB for comfortable operation |
| **SSD** | Recommended for database performance |

### Dependencies

**Required**:
- Claude Code (as MCP client)
- Node.js and npm (runtime)

**Optional** (for specific features):
- **OpenAI API Key**: For RAG Agent with OpenAI embeddings (production quality)
- **Ollama**: For RAG Agent with local embeddings (privacy-focused)
- **Git**: For Git Assistant functionality

---

## Installation

### Quick Install (Automated)

**Recommended for most users**

```bash
# 1. Clone repository
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy

# 2. Run interactive installer (handles everything)
./scripts/install.sh
```

**What the installer does**:
1. ✅ Installs npm dependencies
2. ✅ Builds TypeScript project
3. ✅ Creates data directories
4. ✅ Initializes databases
5. ✅ Configures Claude Code MCP integration
6. ✅ Runs test suite
7. ✅ Displays configuration summary

### Manual Install

**For advanced users or custom setups**

```bash
# 1. Clone repository
git clone https://github.com/PCIRCLE-AI/claude-code-buddy.git
cd claude-code-buddy

# 2. Install dependencies
npm install

# 3. Build project
npm run build

# 4. Create data directories
mkdir -p data
mkdir -p backups

# 5. Initialize databases
node dist/init-databases.js  # If available

# 6. Configure Claude Code MCP
# See MCP Integration section below
```

### Verify Installation

```bash
# 1. Run test suite
npm test

# Expected: All tests pass (722/722)

# 2. Check build output
ls -la dist/

# Expected: Compiled JavaScript files

# 3. Test MCP server
node dist/mcp/server.js --test

# Expected: MCP server starts successfully
```

---

## Configuration

### Environment Variables

**Create `.env` file** (optional, only for RAG features):

```bash
# RAG Agent Configuration (Optional)
OPENAI_API_KEY=sk-...                    # OpenAI API key for embeddings
RAG_PROVIDER=openai                      # 'openai' | 'ollama' | 'huggingface'
RAG_WATCH_DIR=~/Documents/claude-code-buddy-knowledge/  # Drop Inbox directory

# Database Configuration
DATA_DIR=./data                          # Data storage directory
BACKUP_DIR=./backups                     # Backup storage directory

# Logging Configuration
LOG_LEVEL=info                           # 'debug' | 'info' | 'warn' | 'error'
LOG_FILE=./logs/ccb.log                  # Log file path

# Evolution System Configuration
EVOLUTION_ENABLED=true                   # Enable/disable self-learning
EVOLUTION_MIN_OBSERVATIONS=15            # Min executions before adaptation
EVOLUTION_CONFIDENCE_THRESHOLD=0.75      # Min confidence for applying patterns

# Cost Tracking Configuration
MONTHLY_BUDGET=50.00                     # Monthly budget in USD (optional)
BUDGET_WARNING_THRESHOLD=0.90            # Warn at 90% of budget
```

### Application Configuration

**File**: `src/config/simple-config.ts`

```typescript
export const SimpleConfig = {
  // Database paths
  database: {
    knowledgeGraph: './data/knowledge-graph.db',
    evolution: './data/evolution.db',
  },

  // Connection pool settings
  connectionPool: {
    maxConnections: 5,
    connectionTimeout: 5000,      // ms
    idleTimeout: 30000,           // ms
    healthCheckInterval: 10000,   // ms
  },

  // Rate limiting
  rateLimiter: {
    requestsPerMinute: 30,
  },

  // Evolution system
  evolution: {
    enabled: true,
    analysisThreshold: 15,        // Analyze after N executions
    confidenceThreshold: 0.75,
  },

  // Logging
  logging: {
    level: 'info',
    file: './logs/ccb.log',
    maxSize: '10m',               // 10 MB
    maxFiles: '7d',               // Keep 7 days
  },
};
```

**To modify configuration**:
1. Edit `src/config/simple-config.ts`
2. Rebuild: `npm run build`
3. Restart Claude Code

---

## Database Setup

### Automatic Initialization

Databases are automatically created on first run. No manual setup needed.

### Database Locations

```
data/
├── knowledge-graph.db       # Knowledge Graph storage
│   ├── entities             # Features, decisions, bug fixes, etc.
│   ├── observations         # Entity observations
│   ├── relations            # Entity relationships
│   └── observations_fts     # Full-text search index
│
└── evolution.db             # Evolution system storage
    ├── executions           # Execution metrics
    ├── patterns             # Learned patterns
    └── adaptations          # Applied adaptations
```

### Database Schema

**Knowledge Graph** (`knowledge-graph.db`):

```sql
-- Entities
CREATE TABLE entities (
  name TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Observations
CREATE TABLE observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (entity_name) REFERENCES entities(name) ON DELETE CASCADE
);

-- Relations
CREATE TABLE relations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_entity TEXT NOT NULL,
  to_entity TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (from_entity) REFERENCES entities(name) ON DELETE CASCADE,
  FOREIGN KEY (to_entity) REFERENCES entities(name) ON DELETE CASCADE
);

-- Full-text search index
CREATE VIRTUAL TABLE observations_fts USING fts5(content, entity_name);
```

**Evolution Storage** (`evolution.db`):

```sql
-- Executions
CREATE TABLE executions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  success INTEGER NOT NULL,  -- 0 or 1
  duration INTEGER NOT NULL,  -- milliseconds
  cost REAL NOT NULL,         -- dollars
  quality REAL NOT NULL,      -- 0.0 to 1.0
  timestamp INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Patterns
CREATE TABLE patterns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  pattern_type TEXT NOT NULL,  -- 'success', 'anti-pattern', 'optimization'
  confidence REAL NOT NULL,    -- 0.0 to 1.0
  description TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_parameters TEXT NOT NULL,  -- JSON
  impact_data TEXT NOT NULL,        -- JSON
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Indexes
CREATE INDEX idx_executions_agent ON executions(agent_id, task_type);
CREATE INDEX idx_executions_timestamp ON executions(timestamp);
CREATE INDEX idx_patterns_agent ON patterns(agent_id, task_type);
```

### Manual Database Operations

**Reset databases** (deletes all data):

```bash
# Backup first (recommended)
npm run db:backup

# Remove databases
rm data/knowledge-graph.db
rm data/evolution.db

# Restart CCB (databases will be recreated)
# Restart Claude Code
```

**Export data**:

```bash
# Export as SQL
sqlite3 data/knowledge-graph.db .dump > knowledge-graph.sql
sqlite3 data/evolution.db .dump > evolution.sql

# Export as CSV
sqlite3 -header -csv data/knowledge-graph.db "SELECT * FROM entities;" > entities.csv
```

**Import data**:

```bash
# From SQL dump
sqlite3 data/knowledge-graph.db < knowledge-graph.sql

# From CSV
sqlite3 data/knowledge-graph.db \
  ".mode csv" \
  ".import entities.csv entities"
```

---

## MCP Integration

### Configure Claude Code

**File**: `~/.claude/settings.local.json` (or Claude Code settings)

```json
{
  "mcpServers": {
    "claude-code-buddy": {
      "command": "node",
      "args": [
        "/absolute/path/to/claude-code-buddy/dist/mcp/server.js"
      ],
      "env": {
        "NODE_ENV": "production",
        "DATA_DIR": "/absolute/path/to/claude-code-buddy/data"
      }
    }
  }
}
```

**Important**:
- Use **absolute paths** (not relative)
- Replace `/absolute/path/to/` with your actual path
- Ensure `dist/mcp/server.js` exists (run `npm run build` if not)

### Verify MCP Integration

**1. Restart Claude Code** after configuration

**2. Check MCP server logs**:

```bash
# Claude Code logs MCP server output
# Check Claude Code console/logs for CCB startup messages
```

**3. Test with simple command**:

In Claude Code, try:
```
Use claude-code-buddy to list available agents
```

Expected response: List of 22 agents with descriptions

**4. Test smart routing**:

In Claude Code, try:
```
Use claude-code-buddy to review this code for security issues:
<paste code>
```

Expected response: Enhanced prompt from code-reviewer agent

---

## Backup and Restore

### Automated Backups

**Configure automated backups** (cron job):

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * cd /path/to/claude-code-buddy && npm run db:backup
```

**Backup script** (`scripts/backup.sh`):

```bash
#!/bin/bash
set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Backup databases
cp data/knowledge-graph.db "$BACKUP_DIR/knowledge-graph_$TIMESTAMP.db"
cp data/evolution.db "$BACKUP_DIR/evolution_$TIMESTAMP.db"

# Compress backups
gzip "$BACKUP_DIR/knowledge-graph_$TIMESTAMP.db"
gzip "$BACKUP_DIR/evolution_$TIMESTAMP.db"

# Clean old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.db.gz" -mtime +30 -delete

echo "Backup completed: $TIMESTAMP"
```

### Manual Backup

**Create backup**:

```bash
# Using MCP tool (from Claude Code)
Use claude-code-buddy to create database backup

# Or manually
cp data/knowledge-graph.db backups/knowledge-graph_$(date +%Y%m%d).db
cp data/evolution.db backups/evolution_$(date +%Y%m%d).db
```

**List backups**:

```bash
# Using MCP tool
Use claude-code-buddy to list database backups

# Or manually
ls -lh backups/
```

### Restore from Backup

**Restore procedure**:

```bash
# 1. Stop Claude Code

# 2. Backup current databases (safety)
cp data/knowledge-graph.db data/knowledge-graph.db.before_restore
cp data/evolution.db data/evolution.db.before_restore

# 3. Restore from backup
cp backups/knowledge-graph_20260101.db data/knowledge-graph.db
cp backups/evolution_20260101.db data/evolution.db

# 4. Verify database integrity
sqlite3 data/knowledge-graph.db "PRAGMA integrity_check;"
# Expected: ok

# 5. Restart Claude Code
```

**Using MCP tool** (from Claude Code):

```
Use claude-code-buddy to restore database from backup <backup-name>
```

---

## Monitoring and Logging

### Log Locations

```
logs/
├── ccb.log                  # Application log (rotated)
├── ccb.log.1                # Rotated log (previous day)
└── error.log                # Error-only log
```

### Log Format

**JSON Structured Logs**:

```json
{
  "timestamp": "2026-01-01T12:34:56.789Z",
  "level": "info",
  "message": "Task completed",
  "context": {
    "taskId": "task-1735689600-abc123",
    "agent": "code-reviewer",
    "duration": 1250,
    "cost": 0.075
  }
}
```

### Viewing Logs

**Tail logs** (real-time):

```bash
tail -f logs/ccb.log
```

**Search logs**:

```bash
# Find all errors
grep '"level":"error"' logs/ccb.log

# Find specific task
grep 'task-1735689600-abc123' logs/ccb.log

# Pretty print JSON logs
cat logs/ccb.log | jq '.'
```

### Evolution Dashboard

**View evolution metrics**:

In Claude Code:
```
Use claude-code-buddy evolution dashboard
```

**Output**:
```
┌─────────────────────────────────────────────────────────┐
│              Evolution System Dashboard                 │
├─────────────────────────────────────────────────────────┤
│ Total Agents: 22                                        │
│ Agents with Patterns: 15                                │
│ Total Patterns Learned: 67                              │
│ Total Executions: 482                                   │
│ Average Success Rate: 91%                               │
├─────────────────────────────────────────────────────────┤
│ Top Improving Agents:                                   │
│  1. code-reviewer: +15% success rate                    │
│  2. test-writer: +12% success rate                      │
│  3. debugger: +10% success rate                         │
└─────────────────────────────────────────────────────────┘
```

### Health Checks

**System health**:

```typescript
// In Claude Code
Use claude-code-buddy to get session health

// Output
{
  tokenUsage: 45000 / 200000 (22.5%),
  memoryUsage: 250MB / 500MB (50%),
  dbHealth: healthy,
  connectionPool: { active: 2, idle: 3, total: 5 },
  status: 'healthy'
}
```

**Database health**:

```bash
# Check database integrity
sqlite3 data/knowledge-graph.db "PRAGMA integrity_check;"
sqlite3 data/evolution.db "PRAGMA integrity_check;"

# Expected output: ok

# Check database size
ls -lh data/*.db
```

### Performance Metrics

**Key metrics to monitor**:

| Metric | Target | Alert If |
|--------|--------|----------|
| Task routing time | < 100ms | > 500ms |
| Database query time | < 20ms | > 100ms |
| Memory usage | < 300MB | > 450MB |
| Connection pool utilization | < 80% | > 95% |
| Evolution success rate | > 85% | < 70% |

---

## Troubleshooting

### Common Issues

#### Issue: "MCP server not starting"

**Symptoms**: Claude Code shows "MCP server connection failed"

**Diagnosis**:
```bash
# 1. Check if server.js exists
ls dist/mcp/server.js

# 2. Test server manually
node dist/mcp/server.js --test

# 3. Check Node.js version
node --version  # Should be >= 18.0.0
```

**Solutions**:
- Run `npm run build` to compile TypeScript
- Verify absolute path in `settings.local.json`
- Check Node.js version: `node --version`
- Review Claude Code logs for error messages

#### Issue: "Database locked"

**Symptoms**: `Error: SQLITE_BUSY: database is locked`

**Causes**:
- Multiple processes accessing database
- Connection not released properly
- Database corruption

**Solutions**:
```bash
# 1. Check for multiple CCB instances
ps aux | grep "dist/mcp/server.js"

# 2. Kill duplicate processes (if any)
pkill -f "dist/mcp/server.js"

# 3. Restart Claude Code

# 4. If persistent, check database integrity
sqlite3 data/knowledge-graph.db "PRAGMA integrity_check;"

# 5. If corrupted, restore from backup
cp backups/knowledge-graph_<date>.db data/knowledge-graph.db
```

#### Issue: "Rate limit exceeded"

**Symptoms**: `Error: Rate limit exceeded. Please try again in a moment.`

**Causes**:
- Too many rapid requests (> 30/minute)
- Infinite loop or automation

**Solutions**:
- Wait 60 seconds for rate limiter to reset
- Check for automated scripts or loops
- Increase rate limit in configuration (if needed):
  ```typescript
  // src/config/simple-config.ts
  rateLimiter: {
    requestsPerMinute: 60,  // Increase from 30
  }
  ```
- Rebuild: `npm run build`
- Restart Claude Code

#### Issue: "Budget exceeded"

**Symptoms**: `Task execution blocked: Monthly budget exceeded`

**Causes**:
- Monthly budget limit reached
- Large batch tasks

**Solutions**:
```bash
# 1. Check cost stats
# In Claude Code:
Use claude-code-buddy stats month

# 2. Review and adjust budget
# Edit .env or simple-config.ts:
MONTHLY_BUDGET=100.00  # Increase budget

# 3. Reset monthly tracking (if new month)
# Delete evolution.db and let it recreate:
rm data/evolution.db
# Restart Claude Code
```

#### Issue: "Evolution patterns not applying"

**Symptoms**: System not learning or improving

**Diagnosis**:
```typescript
// In Claude Code
Use claude-code-buddy evolution dashboard

// Check:
// - Are patterns being learned? (totalPatterns > 0)
// - Are executions being tracked? (totalExecutions > 0)
// - Are adaptations being applied?
```

**Solutions**:
- Ensure `EVOLUTION_ENABLED=true` in config
- Check minimum observations threshold (default: 15)
- Verify database writes:
  ```bash
  sqlite3 data/evolution.db "SELECT COUNT(*) FROM patterns;"
  ```
- Review logs for evolution errors:
  ```bash
  grep '"component":"AdaptationEngine"' logs/ccb.log | grep error
  ```

### Debug Mode

**Enable debug logging**:

```bash
# .env
LOG_LEVEL=debug

# Or in simple-config.ts
logging: {
  level: 'debug',
}

# Rebuild and restart
npm run build
# Restart Claude Code
```

**Debug output includes**:
- Detailed task analysis
- Agent selection reasoning
- Pattern analysis steps
- Database query execution
- Performance metrics

### Getting Help

**Before asking for help, collect**:
1. CCB version: `cat package.json | grep version`
2. Node.js version: `node --version`
3. Operating system: `uname -a` (macOS/Linux) or `ver` (Windows)
4. Error logs: Last 50 lines from `logs/error.log`
5. Steps to reproduce

**Where to get help**:
- GitHub Issues: https://github.com/PCIRCLE-AI/claude-code-buddy/issues
- GitHub Discussions: https://github.com/PCIRCLE-AI/claude-code-buddy/discussions
- Documentation: https://github.com/PCIRCLE-AI/claude-code-buddy/tree/main/docs

---

## Upgrade Guide

### Minor Version Upgrade (2.0.x → 2.0.y)

**Backward compatible, no breaking changes**

```bash
# 1. Backup databases (recommended)
npm run db:backup

# 2. Pull latest code
git pull origin main

# 3. Install new dependencies
npm install

# 4. Rebuild project
npm run build

# 5. Restart Claude Code
# No configuration changes needed
```

### Major Version Upgrade (2.0.x → 3.0.0)

**May include breaking changes, read CHANGELOG.md**

```bash
# 1. READ MIGRATION GUIDE
# Check docs/MIGRATION_v2_to_v3.md for breaking changes

# 2. Backup everything
npm run db:backup
cp .env .env.backup
cp -r data/ data.backup/

# 3. Pull latest code
git checkout v3.0.0

# 4. Install dependencies
npm install

# 5. Run migration script (if provided)
npm run migrate:v3

# 6. Update configuration
# Follow migration guide for config changes

# 7. Rebuild
npm run build

# 8. Test
npm test

# 9. Restart Claude Code
```

### Database Migration

**If schema changes occur**:

```bash
# 1. Backup current database
cp data/knowledge-graph.db data/knowledge-graph.db.pre_migration

# 2. Run migration script
node dist/migrations/migrate_vX_to_vY.js

# 3. Verify migration
npm run db:verify

# 4. If migration fails, rollback
cp data/knowledge-graph.db.pre_migration data/knowledge-graph.db
```

---

## Performance Tuning

### Database Optimization

**Analyze query performance**:

```bash
# Enable query logging
echo "PRAGMA query_only = ON;" | sqlite3 data/knowledge-graph.db

# Analyze slow queries
sqlite3 data/knowledge-graph.db "EXPLAIN QUERY PLAN SELECT ..."
```

**Rebuild indexes**:

```bash
sqlite3 data/knowledge-graph.db << EOF
REINDEX;
VACUUM;
ANALYZE;
EOF
```

### Connection Pool Tuning

**For high-load scenarios**:

```typescript
// src/config/simple-config.ts
connectionPool: {
  maxConnections: 10,        // Increase from 5
  connectionTimeout: 10000,  // Increase timeout
  idleTimeout: 60000,        // Increase idle timeout
}
```

**Monitor pool utilization**:

```typescript
// In code or logs
const stats = connectionPool.getStats();
console.log(`Utilization: ${stats.active}/${stats.total}`);
// If consistently near max, increase pool size
```

---

## Security Considerations

### File Permissions

**Protect sensitive files**:

```bash
# .env file (if used)
chmod 600 .env

# Database files
chmod 600 data/*.db

# Backup files
chmod 600 backups/*.db*
```

### Network Security

**CCB runs locally, no network exposure**:
- MCP server uses stdio transport (not TCP)
- No open ports
- No remote access
- All communication via Claude Code

### Data Privacy

**Local-first architecture**:
- All data stored locally
- No data sent to external services (except user's Claude API)
- Optional RAG features can use local embeddings (Ollama)

---

## Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: System architecture overview
- **[COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md)**: Component reference
- **[DATA_FLOW.md](./DATA_FLOW.md)**: Data flow and patterns
- **[CONTRIBUTING.md](./CONTRIBUTING.md)**: Development guidelines
- **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)**: Detailed troubleshooting

---

**Version**: 2.0.0
**Last Updated**: 2026-01-01
**Maintainer**: Claude Code Buddy Team
