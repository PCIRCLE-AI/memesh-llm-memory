# MeMesh Plugin Project Instructions

## Documentation-Code Synchronization (MANDATORY)

**This is a permanent engineering discipline — not a one-time task.**

### The Rule

**Documentation MUST be updated BEFORE or WITH any code change. Never after. Never "later".**

Any code change that affects the following MUST include corresponding documentation updates in the same commit:

1. **Public API changes** — tool signatures, parameters, return types → `docs/api/API_REFERENCE.md`
2. **Architecture changes** — new modules, removed modules, dependency changes → `docs/ARCHITECTURE.md`
3. **New files or deleted files** — update relevant docs to reflect current file structure
4. **Configuration changes** — environment variables, settings → `docs/guides/SETUP.md`, `README.md`
5. **Behavior changes** — how features work → `docs/USER_GUIDE.md`, `docs/COMMANDS.md`

### Documentation Files and Their Contracts

| Document | Tracks | Must Match |
|----------|--------|------------|
| `docs/ARCHITECTURE.md` | System design, modules, data flow | Actual `src/` structure, classes, interfaces |
| `docs/api/API_REFERENCE.md` | MCP tool definitions, parameters | `src/mcp/ToolDefinitions.ts`, handler implementations |
| `docs/DEVELOPMENT.md` | Dev workflow, commands, testing | `package.json` scripts, actual project structure |
| `docs/COMMANDS.md` | CLI commands and MCP tools | Registered tool definitions |
| `README.md` | Project overview, quick start | Current version, features, installation |
| `plugin.json` | Plugin metadata | `package.json` version |

### Verification Checklist

Before claiming any task is complete, verify:

- [ ] All new/modified modules are documented in `docs/ARCHITECTURE.md`
- [ ] All API changes reflected in `docs/api/API_REFERENCE.md`
- [ ] Version numbers consistent across `package.json`, `plugin.json`, docs
- [ ] No documentation references deleted files, removed features, or old class names
- [ ] Code examples in docs actually compile and work

### Enforcement

**If a code change is committed without updating affected documentation, the work is NOT complete.**

---

## Project Architecture (v2.10.0)

### Key Modules

```
src/
├── embeddings/
│   ├── VectorSearchAdapter.ts    # Interface (Strategy pattern)
│   ├── SqliteVecAdapter.ts       # sqlite-vec implementation
│   ├── InMemoryVectorAdapter.ts  # Pure TS implementation (testing)
│   ├── EmbeddingService.ts       # LRU-cached encoding + batch
│   └── VectorExtension.ts       # Legacy (kept for backward compat)
├── knowledge-graph/
│   ├── index.ts                  # KnowledgeGraph (uses VectorSearchAdapter)
│   └── KGSearchEngine.ts        # FTS5 + semantic + hybrid search
├── memory/
│   ├── UnifiedMemoryStore.ts     # Central memory management
│   └── MemorySearchEngine.ts    # Search logic extracted from UMS
├── mcp/
│   ├── server-bootstrap.ts       # Entry point (3 modes: daemon/proxy/standalone)
│   ├── StdinBufferManager.ts    # Stdin buffering for MCP init
│   └── handlers/
│       ├── ToolHandlers.ts       # Facade (~130 lines)
│       ├── MemoryToolHandler.ts  # Memory-related tools
│       ├── SystemToolHandler.ts  # System tools (skills, tests, uninstall)
│       └── HookToolHandler.ts   # Hook integration tools
├── core/
│   ├── GitCommandParser.ts      # Git command detection logic
│   ├── HookIntegration.ts       # Hook lifecycle (uses GitCommandParser)
│   ├── CheckpointDetector.ts    # Checkpoint detection
│   └── MCPToolInterface.ts      # Tool interface base
└── db/
    └── DatabaseManager.ts        # SQLite connection + migrations
```

### Key Design Decisions

- **VectorSearchAdapter**: Strategy pattern decoupling vector search from sqlite-vec
- **sqlite-vec pinned to v0.1.3**: Stable release, not alpha (was v0.1.7-alpha.2)
- **Embedding LRU cache**: 500-entry cache in EmbeddingService.encode()
- **Batch transactions**: createEntitiesBatch() wraps multiple inserts in single transaction
- **ONNX preloading**: Daemon mode preloads model on startup (fire-and-forget)
- **Global error handlers**: unhandledRejection + uncaughtException in server-bootstrap.ts

### Embedding Model

- **Model**: `Xenova/all-MiniLM-L6-v2` (384 dimensions)
- **Runtime**: @xenova/transformers (ONNX inference)
- **NOT**: bge-small-en-v1.5 (docs may have been wrong previously)

---

## Development Standards

### Testing

- Framework: vitest
- All tests: `npm test` (2202+ tests across 121+ files)
- Single-thread mode to prevent worker leaks
- Tests MUST pass before any commit

### Git

- Branch strategy: `main` (production) ← `develop` (development)
- Commit format: `<type>(<scope>): <subject>`
- Never develop directly on main

### Dependencies

- sqlite-vec: pinned to exact `"0.1.3"` (not semver range)
- Native dependencies: better-sqlite3, sqlite-vec, onnxruntime-node
- Cloud-only mode when native deps unavailable

---

## Pre-Release Checklist (MANDATORY before npm publish)

### 1. Version Sync
- [ ] `package.json` version matches `plugin.json` version
- [ ] All README files reference correct version
- [ ] `docs/api/API_REFERENCE.md` header version is correct
- [ ] `docs/ARCHITECTURE.md` header version is correct

### 2. Tool List Accuracy
- [ ] `docs/api/API_REFERENCE.md` lists exactly the 8 tools defined in `src/mcp/ToolDefinitions.ts`
- [ ] `docs/COMMANDS.md` tool list matches ToolDefinitions.ts
- [ ] No phantom tools documented (tools that don't exist in code)
- [ ] No undocumented tools (tools in code but not in docs)

### 3. Architecture Doc Accuracy
- [ ] `docs/ARCHITECTURE.md` module tree matches actual `src/` structure
- [ ] No references to deleted modules (AutoTagger, SmartMemoryQuery, memesh-sync-remote, etc.)
- [ ] Hook list matches `hooks/hooks.json`
- [ ] Plugin config description matches `plugin.json`, `.mcp.json`

### 4. Naming Consistency
- [ ] Product name is "MeMesh Plugin" (not just "MeMesh") across all READMEs and docs
- [ ] GitHub About description says "MeMesh Plugin"

### 5. Build & Test
- [ ] `npm run build` succeeds
- [ ] `npm test` passes (all tests)
- [ ] `npm run typecheck` passes
- [ ] No TODO/FIXME/STUB in src/ files

### 6. Package Contents
- [ ] `package.json` `files` array includes all necessary files
- [ ] `npm pack --dry-run` output contains expected files
- [ ] postinstall script works: `node scripts/postinstall-new.js`

### 7. External Sync
- [ ] Obsidian `Projects/MeMesh-Plugin/` notes updated to current version
- [ ] MeMesh KG entities reflect current project status
