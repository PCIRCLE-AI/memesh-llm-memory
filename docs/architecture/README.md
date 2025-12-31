# Architecture Documentation

**Comprehensive system architecture and design documentation for Claude Code Buddy.**

---

## 📁 Documents in This Section

### [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)
Complete five-layer architecture specification including:
- Architecture philosophy and design principles
- Layer-by-layer breakdown (L1-L5)
- Provider integration patterns
- Quota management system
- Smart routing algorithm
- Data flow patterns
- Failover logic

**When to read**: Understanding how Claude Code Buddy works internally

---

### [ASYNC_EXECUTION.md](./ASYNC_EXECUTION.md)
Non-blocking asynchronous task execution design:
- Background task processing
- Job queue management
- Progress tracking
- WebSocket real-time updates
- Resource management

**When to read**: Implementing async features or troubleshooting performance

---

### [DATA_FLOW.md](./DATA_FLOW.md) (Planned)
Detailed data flow patterns:
- Request/response cycles
- Agent orchestration flows
- Error propagation
- State management

**Status**: To be extracted from SYSTEM_ARCHITECTURE.md

---

## 🎯 Quick Reference

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: User Interface                                     │
│ Claude Code (existing) + Claude Code Buddy MCP Server            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Skills Coordination Layer                          │
│ Domain-expert agent orchestration                           │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Agent Router & Task Analyzer                       │
│ Intelligent task routing to domain experts                  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Prompt Enhancement & Evolution System              │
│ Domain-expert prompts + Learning from outcomes              │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
                    ┌──────────────┐
                    │ Claude API   │
                    │ Sonnet 4.5   │
                    └──────────────┘
```

### Core Design Principles

1. **Simplicity First** - Claude-only architecture eliminates multi-provider complexity
2. **Domain Expertise** - Route tasks to specialized agents with domain knowledge
3. **Continuous Learning** - Evolution system optimizes routing over time
4. **Transparency** - Users see which agent handled their task
5. **Extensibility** - Easy to add new domain expert agents

---

## 🔗 Related Documentation

- **[API Reference](../api/API_REFERENCE.md)** - For API endpoint details
- **[Implementation Roadmap](../implementation/ROADMAP.md)** - For development timeline
- **[Resource Management](../guides/RESOURCE_MANAGEMENT.md)** - For performance tuning

---

**Last Updated**: 2025-12-31
