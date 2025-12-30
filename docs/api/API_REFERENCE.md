# Smart Agents MCP Server - API Reference

**Version**: 2.1.0
**Last Updated**: 2025-12-31
**Author**: Smart Agents Team

---

## Overview

Smart Agents is a **Claude-only** AI agent system built on the Model Context Protocol (MCP). The system provides intelligent agent routing, prompt enhancement, and evolution-based learning without multi-provider complexity.

**Architecture**: Claude Sonnet 4.5 → MCP Server → Agent Router → Domain Experts

---

## Current Implementation

For detailed API documentation, refer to the actual implementation:

### Core Components

1. **MCP Server** - Entry point for Claude Code integration
   - File: [src/mcp/server.ts](../../src/mcp/server.ts)
   - Handles MCP protocol communication
   - Exposes tools to Claude Code CLI

2. **Agent Registry** - 13 registered domain expert agents
   - File: [src/core/AgentRegistry.ts](../../src/core/AgentRegistry.ts)
   - Manages agent definitions and capabilities
   - Provides agent lookup and routing

3. **Router System** - Intelligent task routing
   - File: [src/orchestrator/router.ts](../../src/orchestrator/router.ts)
   - Routes tasks to appropriate agents
   - Orchestrates multi-agent workflows

4. **Prompt Enhancement** - Domain-expert prompt optimization
   - File: [src/orchestrator/PromptEnhancer.ts](../../src/orchestrator/PromptEnhancer.ts)
   - Enhances prompts with domain expertise
   - Applies learned patterns

5. **Evolution System** - Continuous improvement
   - Directory: [src/evolution/](../../src/evolution/)
   - Tracks agent performance
   - Learns from outcomes
   - Optimizes routing decisions

---

## MCP Tools

Smart Agents exposes the following tools via MCP:

### `analyze-task`
Analyzes a task and routes it to the appropriate domain expert agent.

**Parameters:**
- `task` (string): Description of the task to analyze
- `context` (optional object): Additional context for the task

**Returns:**
- `agent` (string): Recommended agent ID
- `reasoning` (string): Why this agent was selected
- `enhancedPrompt` (string): Domain-optimized prompt
- `confidence` (number): Confidence score (0-1)

### `enhance-prompt`
Enhances a prompt with domain expertise.

**Parameters:**
- `prompt` (string): Original prompt to enhance
- `agentId` (optional string): Specific agent to use

**Returns:**
- `enhancedPrompt` (string): Optimized prompt
- `improvements` (array): List of enhancements applied

### `list-agents`
Lists all available domain expert agents.

**Returns:**
- `agents` (array): List of agent definitions with capabilities

---

## Agent Types

Smart Agents includes 13 domain expert agents:

| Agent ID | Domain | Specialty |
|----------|--------|-----------|
| `architect-reviewer` | Architecture | System design, scalability, patterns |
| `code-reviewer` | Code Quality | Best practices, security, performance |
| `ui-designer` | Frontend | UI/UX, accessibility, responsive design |
| `test-automator` | Testing | Test strategies, coverage, automation |
| `debugger` | Debugging | Root cause analysis, systematic debugging |
| `performance-engineer` | Performance | Optimization, profiling, bottlenecks |
| `data-scientist` | Data | Analysis, ML, statistics |
| `devops-specialist` | DevOps | CI/CD, infrastructure, deployment |
| `technical-writer` | Documentation | Clear, comprehensive documentation |
| `research-analyst` | Research | Investigation, fact-finding |
| `risk-manager` | Security | Vulnerability assessment, compliance |
| `backend-developer` | Backend | APIs, databases, business logic |
| `frontend-developer` | Frontend | UI implementation, state management |

---

## Configuration

### Environment Variables

```bash
# Claude API Configuration
ANTHROPIC_API_KEY=your_api_key_here

# Evolution System (optional)
ENABLE_LEARNING=true
STORAGE_PATH=./data/evolution

# MCP Server (optional)
MCP_SERVER_NAME=smart-agents
MCP_SERVER_VERSION=2.1.0
```

### Configuration Files

- **Claude Code Config**: `~/.config/claude/claude_desktop_config.json`
  - Registers Smart Agents MCP server
  - Configures MCP connection settings

---

## Usage Examples

### Example 1: Code Review

```typescript
// Claude Code automatically routes code review requests to code-reviewer agent
const result = await claudeCode.chat("Review this authentication function for security issues");

// Behind the scenes:
// 1. Task analyzed → code review needed
// 2. Routed to code-reviewer agent
// 3. Prompt enhanced with security checklist
// 4. Claude generates comprehensive review
// 5. Result stored in evolution system
```

### Example 2: Architecture Design

```typescript
// Architecture questions routed to architect-reviewer
const result = await claudeCode.chat("Design a scalable API for handling 10M requests/day");

// Routing:
// 1. Task → architecture design
// 2. Agent → architect-reviewer
// 3. Enhanced with: scalability patterns, trade-offs, best practices
// 4. Result includes: architecture diagram, component breakdown, scaling strategy
```

### Example 3: Multi-Agent Workflow

```typescript
// Complex tasks may involve multiple agents sequentially
const result = await claudeCode.chat("Build a new user authentication feature");

// Workflow:
// 1. architect-reviewer → Design authentication architecture
// 2. backend-developer → Implement API endpoints
// 3. frontend-developer → Build login UI
// 4. test-automator → Create test strategy
// 5. code-reviewer → Final security review
```

---

## Error Handling

All MCP tools return structured error responses:

```typescript
interface ErrorResponse {
  error: string;          // Error message
  code: string;           // Error code (e.g., 'AGENT_NOT_FOUND')
  details?: object;       // Additional error details
}
```

Common error codes:
- `AGENT_NOT_FOUND` - Requested agent doesn't exist
- `INVALID_TASK` - Task description is invalid or empty
- `ROUTING_FAILED` - Unable to determine appropriate agent
- `API_ERROR` - Claude API returned an error
- `EVOLUTION_ERROR` - Error storing/retrieving learning data

---

## Performance

**Typical Response Times:**
- Task analysis: ~100-200ms
- Prompt enhancement: ~50-100ms
- Agent routing: ~10-50ms
- Evolution system lookup: ~20-40ms

**Resource Usage:**
- Memory: ~50-100MB (base system)
- Storage: ~1-10MB (evolution data)
- Network: Claude API calls only (no multi-provider overhead)

---

## Development

### Running the MCP Server

```bash
# Start in development mode
npm run mcp

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/mcp/server.js
```

### Adding New Agents

1. Define agent in `src/core/AgentRegistry.ts`
2. Create agent implementation in `src/agents/[agent-name]/`
3. Register agent with capabilities and routing rules
4. Add tests in `tests/unit/agents/`

### Evolution System

The evolution system automatically:
- Tracks which agents are used for which tasks
- Stores task outcomes (success/failure)
- Learns routing patterns over time
- Optimizes future agent selection

Data stored in SQLite database at `data/evolution/smart-agents.db`.

---

## Migration Notes

### Removed Features (v2.1.0)

Smart Agents has simplified to a **Claude-only** architecture. The following multi-provider features have been removed:

- ❌ Ollama integration
- ❌ Multi-provider routing
- ❌ Cost estimation/optimization
- ❌ Provider failover logic
- ❌ Quota management

**Rationale**: Claude Sonnet 4.5 provides excellent quality for all task types. Multi-provider complexity added minimal value while significantly increasing maintenance burden.

**Migration Path**: No action needed. The system now has:
- ✅ Simpler architecture
- ✅ Faster response times (no provider selection overhead)
- ✅ Fewer dependencies
- ✅ More predictable behavior
- ✅ Easier debugging

---

## Further Documentation

- **User Guide**: [../USER_GUIDE.md](../USER_GUIDE.md) - End-user documentation
- **Architecture**: [../architecture/OVERVIEW.md](../architecture/OVERVIEW.md) - System design
- **Evolution System**: [../architecture/EVOLUTION.md](../architecture/EVOLUTION.md) - Learning mechanism
- **Contributing**: [../../CONTRIBUTING.md](../../CONTRIBUTING.md) - Development guidelines

---

## Version History

- **v2.1.0** (2025-12-31): Removed multi-provider support, simplified to Claude-only
- **v2.0.0** (2025-12-30): MCP Server Pattern with 13 domain expert agents
- **v1.0.0** (2025-12-01): Initial release with basic agent routing

---

**For questions or issues, please see the project README or open a GitHub issue.**
