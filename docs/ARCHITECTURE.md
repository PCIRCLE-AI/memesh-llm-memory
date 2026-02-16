# MeMesh Architecture

**Version**: 2.8.11
**Last Updated**: 2026-02-16
**Status**: Active

---

## Overview

MeMesh is a Model Context Protocol (MCP) server that enhances Claude Code with persistent memory, context-aware task execution, and knowledge management capabilities. It follows a layered architecture designed for extensibility, performance, and reliability.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Claude Code CLI                         │
└────────────────────────┬────────────────────────────────────┘
                         │ MCP Protocol (JSON-RPC over stdio)
┌────────────────────────┴────────────────────────────────────┐
│                    MCP Server Layer (src/mcp/)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Tool Handlers│  │   Resources  │  │   Prompts    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │                  │                  │
┌─────────┴──────────────────┴──────────────────┴─────────────┐
│                    Core Business Logic                       │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Memory System (src/memory/)                         │   │
│  │  ├─ UnifiedMemoryStore                               │   │
│  │  ├─ ProjectAutoTracker                               │   │
│  │  ├─ MistakePatternEngine                             │   │
│  │  └─ AutoTagger                                        │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Knowledge Graph (src/knowledge-graph/)              │   │
│  │  ├─ FTS5 Full-Text Search                            │   │
│  │  ├─ Vector Similarity Search                         │   │
│  │  └─ Entity Relationship Management                   │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Embeddings (src/embeddings/)                        │   │
│  │  ├─ Model Manager (Xenova/bge-small-en-v1.5)        │   │
│  │  └─ Vector Storage (sqlite-vec)                     │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬───────────────────────────────────┘
                           │
┌──────────────────────────┴───────────────────────────────────┐
│                   Data Persistence Layer                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Database (src/db/)                                  │   │
│  │  ├─ Connection Pool (better-sqlite3)                 │   │
│  │  ├─ Migrations & Schema                              │   │
│  │  └─ FTS5 + Vector Extensions                         │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

## Layer Details

### 1. MCP Server Layer (`src/mcp/`)

**Purpose**: Implements the Model Context Protocol specification to communicate with Claude Code.

**Components**:
- **server.ts**: MCP server initialization and lifecycle management
- **server-bootstrap.js**: Entry point for npm binary
- **ToolHandlers.ts**: Implements MCP tool handlers for buddy-* commands
- **BuddyCommands.ts**: Command definitions and routing logic
- **ToolDefinitions.ts**: MCP tool schema definitions
- **validation.ts**: Input validation using Zod schemas
- **ProgressReporter.ts**: Real-time progress updates to Claude Code

**Communication**: JSON-RPC 2.0 over stdio

---

### 2. Memory System (`src/memory/`)

**Purpose**: Persistent, context-aware memory management for Claude Code sessions.

**Components**:

#### UnifiedMemoryStore
- Central memory management interface
- CRUD operations for memories
- Semantic search using embeddings
- FTS5 full-text search integration

#### ProjectAutoTracker
- Automatic tracking of project context
- File change detection via chokidar
- Git integration for tracking commits

#### MistakePatternEngine
- Learns from user corrections
- Detects recurring mistakes
- Suggests improvements

#### AutoTagger
- Automatic tag generation for memories
- Category detection
- Relevance scoring

**Data Flow**:
```
User Input → Memory Ingestion → Vector Embedding → SQLite Storage
                                                     ↓
User Query ← Similarity Search ← Vector Search + FTS5 Search
```

---

### 3. Knowledge Graph (`src/knowledge-graph/`)

**Purpose**: Structured knowledge representation with relationships and semantic search.

**Features**:
- **FTS5 Full-Text Search**: Fast keyword-based search
- **Vector Similarity**: Semantic search using embeddings
- **Entity Relationships**: Graph-based entity connections
- **Hybrid Search**: Combines FTS5 and vector search for optimal results

**Database Schema**:
```sql
entities (id, type, content, metadata, embedding[384])
relationships (source_id, target_id, type, metadata)
fts_entities (content) -- FTS5 virtual table
```

---

### 4. Embeddings Layer (`src/embeddings/`)

**Purpose**: Convert text to vector representations for semantic search.

**Model**: `Xenova/bge-small-en-v1.5` (384 dimensions)
- Small footprint (~25 MB)
- Fast inference
- Good quality for code/technical text

**Components**:
- **ModelManager.ts**: Model loading and caching
- **EmbeddingService.ts**: Batch embedding generation
- **Integration**: sqlite-vec for vector storage and similarity search

---

### 5. Database Layer (`src/db/`)

**Purpose**: Persistent storage with connection pooling and migrations.

**Technology**: better-sqlite3 (synchronous SQLite)

**Features**:
- Connection pooling for concurrent access
- Migration system for schema evolution
- FTS5 extension for full-text search
- sqlite-vec extension for vector operations

**Key Tables**:
- `memories`: Core memory storage
- `entities`: Knowledge graph entities
- `tags`: Memory categorization
- `sessions`: Session tracking
- `embeddings`: Vector embeddings

---

### 6. Integration Layer (`src/integrations/`)

**Purpose**: External system integrations and session management.

**Components**:
- **session-memory/**: Claude Code session integration
  - SessionMemoryParser: Parse session transcripts
  - SessionMemoryIngester: Import session data
  - SessionContextInjector: Inject context into new sessions

---

### 7. UI Layer (`src/ui/`)

**Purpose**: Rich terminal UI for progress indication and data visualization.

**Components**:
- **ProgressRenderer.ts**: Real-time progress bars
- **ResponseFormatter.ts**: Formatted output for buddy commands
- **design-tokens.ts**: Color palette and typography
- **accessibility.ts**: WCAG AA compliance, screen reader support

---

### 8. Core Utilities

#### Config (`src/config/`)
- Environment variable management
- Model configuration
- Database configuration

#### Errors (`src/errors/`)
- Custom error types
- Error classification
- Sanitization for telemetry

#### Types (`src/types/`)
- TypeScript type definitions
- Shared interfaces

#### Utils (`src/utils/`)
- Logger (winston)
- Rate limiter
- Validation helpers

---

## Data Flow Examples

### 1. Memory Storage Flow

```
buddy-do "implement auth"
  ↓
ToolHandler validates input
  ↓
UnifiedMemoryStore.create()
  ↓
Generate embedding (384-dim vector)
  ↓
Store in SQLite (memories + embeddings tables)
  ↓
Index in FTS5
  ↓
Auto-tag (category detection)
  ↓
Return success to Claude Code
```

### 2. Memory Retrieval Flow

```
buddy-remember "auth"
  ↓
UnifiedMemoryStore.search()
  ↓
Parallel search:
  ├─ FTS5 keyword search
  └─ Vector similarity search (cosine)
  ↓
Merge and rank results
  ↓
Format response (ResponseFormatter)
  ↓
Return to Claude Code
```

---

## Performance Characteristics

| Operation | Typical Latency | Notes |
|-----------|----------------|-------|
| Memory write | < 10ms | Including embedding generation |
| FTS5 search | < 5ms | Scales with corpus size |
| Vector search | < 20ms | 384-dim cosine similarity |
| Hybrid search | < 25ms | FTS5 + vector combined |
| Embedding generation | ~50ms | Batched for efficiency |

---

## Security & Privacy

1. **Local-First Architecture**: All data stored locally in `~/.memesh/`
2. **No External Calls**: Except configured AI providers (Anthropic)
3. **SQL Injection Prevention**: Parameterized queries only
4. **Input Validation**: Zod schemas for all user input
5. **Path Traversal Protection**: Validated file paths
6. **Screen Reader Support**: WCAG AA compliant UI

---

## Extension Points

### Adding New MCP Tools

1. Define tool schema in `ToolDefinitions.ts`
2. Implement handler in `ToolHandlers.ts`
3. Add validation schema
4. Update documentation

### Adding New Memory Types

1. Create new table in migration
2. Extend UnifiedMemoryStore interface
3. Implement CRUD operations
4. Add embedding support if needed

### Adding New Integrations

1. Create new directory in `src/integrations/`
2. Implement integration interface
3. Add configuration
4. Register with core system

---

## Testing Strategy

- **Unit Tests**: `vitest` for individual components
- **Integration Tests**: End-to-end memory flows
- **E2E Tests**: Full MCP protocol testing
- **Installation Tests**: Verify npm package installation

**Coverage Target**: ≥ 80% for critical paths

---

## Deployment

**Distribution**: npm package `@pcircle/memesh`

**Installation**:
```bash
npm install -g @pcircle/memesh
```

**Binary**: `dist/mcp/server-bootstrap.js` (executable)

**Claude Code Integration**: MCP configuration in `~/.claude/mcp_settings.json`

---

## Deployment Modes

MeMesh supports three deployment modes to accommodate different environments:

### 1. Standard Mode (Full Functionality)

**When**: better-sqlite3 is available

**Features**:
- ✅ Full local Knowledge Graph with SQLite
- ✅ All memory tools (buddy-do, buddy-remember, recall-memory, create-entities)
- ✅ Vector embeddings and semantic search
- ✅ FTS5 full-text search
- ✅ Optional cloud sync (when MEMESH_API_KEY is set)

**Architecture**:
```
Claude Code ─stdio─► MCP Server
                          │
                   ┌──────┴──────┐
                   ▼             ▼
            KnowledgeGraph  CloudSync
            (SQLite+Vec)    (Optional)
```

**Use Cases**:
- Claude Code CLI (recommended)
- Claude Code VS Code Extension
- Cursor (via MCP)
- Local development

---

### 2. Cloud-Only Mode (Partial Functionality)

**When**: better-sqlite3 unavailable + MEMESH_API_KEY is configured

**Features**:
- ✅ MCP server starts successfully
- ✅ Basic commands (buddy-help, list-skills)
- ✅ Cloud sync tools (memesh-cloud-sync)
- ❌ Local memory tools disabled (buddy-do, buddy-remember, recall-memory, create-entities, memesh-hook-tool-use)

**Error Messages**:
```
❌ Tool 'buddy-remember' is not available in cloud-only mode.

This MCP server is running without local SQLite storage (better-sqlite3 unavailable).

To use local memory tools:
1. Install better-sqlite3: npm install better-sqlite3
2. Restart the MCP server

OR use cloud sync tools instead:
- memesh-cloud-sync: Sync with cloud storage (requires MEMESH_API_KEY)
```

**Architecture**:
```
Claude Code ─stdio─► MCP Server (Cloud-Only)
                          │
                          ▼
                    CloudSync Only
                    (API calls)
```

**Use Cases**:
- Claude Desktop Cowork (sandbox environment)
- Environments where native modules cannot compile
- Read-only filesystems
- Cloud-first workflows (future)

**Limitations**:
- No local Knowledge Graph
- No vector embeddings
- No FTS5 search
- Memory tools return friendly errors

**Why Cloud-Only Mode Exists**:

Claude Desktop Cowork runs plugins in a restricted sandbox:
1. **Read-only filesystem** - Cannot write to plugin directories
2. **Blocked node-gyp compilation** - HTTP 403 when downloading Node.js headers
3. **No prebuilt binaries** - better-sqlite3, onnxruntime-node, sqlite-vec don't ship ARM64 Linux binaries
4. **Ephemeral storage** - `~/.memesh/` directory is session-scoped

Cloud-only mode allows the MCP server to start successfully and provide cloud sync functionality while gracefully degrading memory-dependent features.

---

### 3. Error Mode (Cannot Start)

**When**: Both better-sqlite3 unavailable AND no MEMESH_API_KEY

**Behavior**:
```
ConfigurationError: Cannot start MCP server without local SQLite or cloud configuration.

Please choose one of the following:
1. Install better-sqlite3: npm install better-sqlite3
2. Configure cloud access: export MEMESH_API_KEY="your-key"
3. Use global installation: npm install -g @pcircle/memesh

For detailed troubleshooting, see: docs/TROUBLESHOOTING.md
```

**Use Cases**: Configuration error, should not occur in normal usage

---

### Mode Detection Logic

**Implementation** (`src/mcp/ServerInitializer.ts`):

```typescript
const sqliteAvailability = await checkBetterSqlite3Availability();
const cloudEnabled = isCloudEnabled();

if (sqliteAvailability.available) {
  // Standard mode: Use local SQLite
  knowledgeGraph = KnowledgeGraph.createSync();
  projectMemoryManager = new ProjectMemoryManager(knowledgeGraph);
  cloudOnlyMode = false;
} else if (cloudEnabled) {
  // Cloud-only mode: Degrade gracefully
  logger.warn('[ServerInitializer] Running in cloud-only mode');
  knowledgeGraph = undefined;
  projectMemoryManager = undefined;
  cloudOnlyMode = true;
} else {
  // Error mode: Cannot start
  throw new ConfigurationError('Cannot start MCP server...');
}
```

**Availability Check**:
```typescript
async function checkBetterSqlite3Availability(): Promise<AvailabilityResult> {
  try {
    await import('better-sqlite3');
    return { available: true };
  } catch (error) {
    return {
      available: false,
      reason: 'better-sqlite3 module not available',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

---

### Future: Cloud-First Memory Architecture

**Goal**: Full Claude Desktop Cowork support through cloud-first architecture

**Planned Implementation**:
1. Cloud API endpoints for KG operations (create, recall, search)
2. Memory tools proxy to cloud in cloud-only mode
3. Shared KG accessible from any client
4. No local persistence needed (cloud as source of truth)

**Timeline**: Long-term (no ETA)

**Related Issues**: #73, #76, #77

See [docs/COWORK_SUPPORT.md](./COWORK_SUPPORT.md) for detailed Cowork support documentation.

---

## Future Architecture Considerations

- **Multi-Model Support**: Pluggable AI providers
- **Distributed Memory**: Sync across devices
- **Performance Optimization**: Caching layer for frequent queries
- **Plugin System**: User-defined extensions
- **Web Dashboard**: Browser-based memory management

---

## References

- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [MeMesh User Guide](./USER_GUIDE.md)
- [API Reference](./api/API_REFERENCE.md)
- [Contributing Guide](./CONTRIBUTING.md)

---

**Maintained by**: PCIRCLE-AI
**License**: AGPL-3.0
