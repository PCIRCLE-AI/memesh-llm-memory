# Claude Code Buddy MCP Server - API Reference

**Version**: 2.2.0
**Last Updated**: 2026-01-20
**Author**: Claude Code Buddy Team

---

## Overview

Claude Code Buddy is a capability-routing system built on the Model Context Protocol (MCP). The system provides intelligent task routing, prompt enhancement, and evolution-based learning with a minimal dependency surface.

**Architecture**: Claude Code → MCP Server → Capability Router → Prompt Enhancer

---

## Current Implementation

For detailed API documentation, refer to the actual implementation:

### Core Components

1. **MCP Server** - Entry point for Claude Code integration
   - File: [src/mcp/server.ts](../../src/mcp/server.ts)
   - Handles MCP protocol communication
   - Exposes tools to Claude Code CLI

2. **Capability Registry** - Capability definitions for routing
   - File: [src/core/AgentRegistry.ts](../../src/core/AgentRegistry.ts)
   - Manages capability definitions and metadata
   - Provides capability lookup for routing

3. **Router System** - Intelligent task routing
   - File: [src/orchestrator/router.ts](../../src/orchestrator/router.ts)
   - Routes tasks to appropriate capabilities
   - Orchestrates multi-step workflows

4. **Prompt Enhancement** - Domain-expert prompt optimization
   - File: [src/orchestrator/PromptEnhancer.ts](../../src/orchestrator/PromptEnhancer.ts)
   - Enhances prompts with domain expertise
   - Applies learned patterns

5. **Evolution System** - Continuous improvement
   - Directory: [src/evolution/](../../src/evolution/)
   - Tracks capability performance
   - Learns from outcomes
   - Optimizes routing decisions

## Tools

Claude Code Buddy exposes 7 MCP tools:

| Tool | Category | Purpose |
|------|----------|---------|
| `buddy-do` | Routing | Route tasks to the right capability |
| `buddy-help` | Help | Command reference and examples |
| `buddy-remember` | Memory | Recall project memory |
| `get-session-health` | Health | Session health snapshot |
| `get-workflow-guidance` | Workflow | Next-step recommendations |
| `generate-smart-plan` | Planning | Implementation planning |
| `hook-tool-use` | Internal | Claude Code tool-use hooks (auto-ingested) |

---

## Configuration

### Environment Variables

```bash
# MCP server mode (default true)
MCP_SERVER_MODE=true

# Claude API key (only required if MCP_SERVER_MODE=false)
# ANTHROPIC_API_KEY=your_api_key_here

# Model configuration
CLAUDE_MODEL=claude-sonnet-4-5-20250929
CLAUDE_OPUS_MODEL=claude-opus-4-5-20251101

# Quota and cost controls
CLAUDE_DAILY_LIMIT=150
CLAUDE_MONTHLY_LIMIT=4500
MONTHLY_BUDGET_USD=50
COST_ALERT_THRESHOLD=0.8

# Logging and metrics
LOG_LEVEL=info
ENABLE_METRICS=true
METRICS_PORT=9090

# Guidance modes
BEGINNER_MODE=true
EVIDENCE_MODE=true

# Server and orchestrator
NODE_ENV=production
PORT=3000
ORCHESTRATOR_MODE=local
ORCHESTRATOR_MAX_MEMORY_MB=6144

# Local database (optional override)
# DATABASE_PATH=~/.claude-code-buddy/database.db
```

### Configuration Files

- **Claude Code Config**: `~/.claude.json`
  - Registers Claude Code Buddy MCP server
  - Configures MCP connection settings

---

## Usage Examples

### Example 1: Code Review

```typescript
// Claude Code automatically routes code review requests to the code review capability
const result = await claudeCode.chat("Review this authentication function for security issues");

// Behind the scenes:
// 1. Task analyzed → code review needed
// 2. Routed to code review capability
// 3. Prompt enhanced with security checklist
// 4. Claude generates comprehensive review
// 5. Result stored in evolution system
```

### Example 2: Architecture Design

```typescript
// Architecture questions routed to architecture capability
const result = await claudeCode.chat("Design a scalable API for handling 10M requests/day");

// Routing:
// 1. Task → architecture design
// 2. Capability → architecture
// 3. Enhanced with: scalability patterns, trade-offs, best practices
// 4. Result includes: architecture diagram, component breakdown, scaling strategy
```

### Example 3: Multi-Step Workflow

```typescript
// Complex tasks may involve multiple capabilities sequentially
const result = await claudeCode.chat("Build a new user authentication feature");

// Workflow:
// 1. architecture → Design authentication architecture
// 2. backend → Implement API endpoints
// 3. frontend → Build login UI
// 4. testing → Create test strategy
// 5. code review → Final security review
```

---

## Error Handling

All MCP tools return structured error responses:

```typescript
interface ErrorResponse {
  error: string;          // Error message
  code: string;           // Error code (e.g., 'TOOL_NOT_FOUND')
  details?: object;       // Additional error details
}
```

Common error codes:
- `TOOL_NOT_FOUND` - Requested tool doesn't exist
- `VALIDATION_FAILED` - Input validation failed
- `OPERATION_FAILED` - Operation failed during execution
- `API_REQUEST_FAILED` - Upstream API returned an error
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist

---

## Performance

**Typical Response Times:**
- Task analysis: ~100-200ms
- Prompt enhancement: ~50-100ms
- Capability routing: ~10-50ms
- Evolution system lookup: ~20-40ms

**Resource Usage:**
- Memory: ~50-100MB (base system)
- Storage: ~1-10MB (evolution data)
- Network: No direct API calls in MCP server mode

---

## Development

### Running the MCP Server

```bash
# Start in development mode
npm run mcp

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/mcp/server.js
```

### Adding New Capabilities (Internal)

1. Define capability metadata in `src/core/AgentRegistry.ts`
2. Add implementation or prompt template under `src/agents/` (internal)
3. Register routing rules for the new capability
4. Add tests under `tests/unit/`

### Evolution System

The evolution system automatically:
- Tracks which capabilities are used for which tasks
- Stores task outcomes (success/failure)
- Learns routing patterns over time
- Optimizes future capability selection

Data stored locally in SQLite (default: `~/.claude-code-buddy/database.db`, override with `DATABASE_PATH`).

---

## Migration Notes

### Simplified Routing (v2.0.0)

Claude Code Buddy streamlined routing to focus on capability-first prompt enhancement and reduced integration complexity.

**Migration Path**: No action needed. The system now emphasizes:
- ✅ Capability-focused routing
- ✅ Lower operational overhead
- ✅ More predictable behavior
- ✅ Easier debugging

---

## Further Documentation

- **User Guide**: [../USER_GUIDE.md](../USER_GUIDE.md) - End-user documentation
- **Commands**: [../COMMANDS.md](../COMMANDS.md) - Tool reference
- **Troubleshooting**: [../TROUBLESHOOTING.md](../TROUBLESHOOTING.md) - Common fixes
- **Docs Index**: [../README.md](../README.md) - Documentation map

---

## Version History

- **v2.2.0** (2026-01-20): Evidence guardrails, beginner mode, and quality gates
- **v2.0.0** (2026-01-19): MCP Server pattern with capability routing
- **v1.0.0** (2025-12-01): Initial release with basic routing

---

**For questions or issues, please see the project README or open a GitHub issue.**
