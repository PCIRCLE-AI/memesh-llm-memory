# Architecture Documentation

**Comprehensive system architecture and design documentation for Smart Agents.**

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

**When to read**: Understanding how Smart Agents works internally

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
- Multi-model orchestration flows
- Failover decision trees
- Error propagation
- State management

**Status**: To be extracted from SYSTEM_ARCHITECTURE.md

---

## 🎯 Quick Reference

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 5: User Interface                                     │
│ Claude Code (existing) + Smart Agents MCP Server            │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 4: Skills Coordination Layer                          │
│ Multi-model agent orchestration                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: Smart Router (Quota-Aware)                         │
│ Complexity analysis + Provider selection                    │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Layer 2: Quota Manager                                      │
│ Real-time quota tracking + Failover triggers                │
└───────────────────────────┬─────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │                       │
                ↓                       ↓
        ┌──────────────┐        ┌──────────────┐
        │ Ollama       │        │ Cloud Models │
        │ (local)      │        │ Claude/Grok  │
        └──────────────┘        └──────────────┘
```

### Core Design Principles

1. **Quota-Aware Routing** - Never hit quota limits unexpectedly
2. **Graceful Degradation** - Always provide a working solution
3. **Cost Optimization** - Prefer cheaper models when sufficient
4. **Transparency** - Users see routing decisions
5. **Extensibility** - Easy to add new providers

---

## 🔗 Related Documentation

- **[API Reference](../api/API_REFERENCE.md)** - For API endpoint details
- **[Implementation Roadmap](../implementation/ROADMAP.md)** - For development timeline
- **[Resource Management](../guides/RESOURCE_MANAGEMENT.md)** - For performance tuning

---

**Last Updated**: 2025-12-26
