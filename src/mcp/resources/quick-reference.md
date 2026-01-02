# Claude Code Buddy Quick Reference

**Version**: 0.1.0

## 🚀 Quick Commands

```bash
buddy_do "<task description>"      # Smart router (recommended)
buddy_agents                          # List all agents
buddy_agents --category development   # Filter by category
buddy_dashboard                       # View evolution metrics
buddy_skills                          # List all skills
buddy_uninstall                       # Uninstall claude-code-buddy
```

## 📋 Agent Quick Lookup

### 💻 Development (9 agents)

| Agent | Keywords | Use For |
|-------|----------|---------|
| **code-reviewer** | review, audit, quality | Code review, security audit, best practices |
| **test-writer** | test, coverage, TDD | Unit tests, integration tests, E2E tests |
| **debugger** | debug, bug, error, trace | Bug investigation, root cause analysis |
| **refactorer** | refactor, cleanup, patterns | Code refactoring, design patterns, clean code |
| **api-designer** | API, endpoint, REST, GraphQL | API design, RESTful principles, GraphQL |
| **db-optimizer** | database, query, SQL, index | Query optimization, schema design, indexes |
| **frontend-specialist** | React, Vue, UI, component | Frontend dev, React/Vue, responsive design |
| **backend-specialist** | backend, server, API logic | Backend APIs, business logic, microservices |
| **development-butler** | automate, CI/CD, workflow | Automation, CI/CD, dependency management |

### 🔍 Analysis (5 agents)

| Agent | Keywords | Use For |
|-------|----------|---------|
| **rag-agent** | search, find, semantic | Codebase search, vector search, semantic search |
| **research-agent** | research, compare, investigate | Technology research, comparative analysis |
| **architecture-agent** | architecture, design, scalability | System architecture, design patterns, scaling |
| **data-analyst** | data, metrics, analytics | Data analysis, metrics, visualization |
| **performance-profiler** | performance, profile, optimize | Performance profiling, bottleneck identification |

### 📚 Knowledge (1 agent)

| Agent | Keywords | Use For |
|-------|----------|---------|
| **knowledge-agent** | knowledge, organize, synthesize | Knowledge management, documentation organization |

### ⚙️ Operations (2 agents)

| Agent | Keywords | Use For |
|-------|----------|---------|
| **devops-engineer** | DevOps, deploy, infrastructure | CI/CD, infrastructure as code, deployment |
| **security-auditor** | security, vulnerability, audit | Security audits, vulnerability assessment |

### 🎨 Creative (2 agents)

| Agent | Keywords | Use For |
|-------|----------|---------|
| **technical-writer** | documentation, docs, guide | Technical writing, user guides, API docs |
| **ui-designer** | UI, UX, design, wireframe | UI/UX design, wireframes, accessibility |

### 🔧 Utility (2 agents)

| Agent | Keywords | Use For |
|-------|----------|---------|
| **migration-assistant** | migrate, upgrade, modernize | System migrations, framework upgrades |
| **api-integrator** | integrate, third-party, OAuth | API integration, OAuth, SDK implementation |

### 🤖 General (1 agent)

| Agent | Keywords | Use For |
|-------|----------|---------|
| **general-agent** | general, help, explain | General tasks, explanations, fallback |

## 🎯 Common Workflows

### Feature Development
```
1. api-designer     → Design endpoints
2. backend-specialist → Implement logic
3. test-writer      → Write tests
4. code-reviewer    → Review code
```

### Bug Fixing
```
1. debugger         → Find root cause
2. db-optimizer     → Fix query (if needed)
3. test-writer      → Add regression test
```

### Performance Optimization
```
1. performance-profiler → Identify bottlenecks
2. db-optimizer     → Optimize queries
3. frontend-specialist → Optimize UI
```

### Security Audit
```
1. security-auditor → Audit vulnerabilities
2. code-reviewer    → Review security issues
3. test-writer      → Security tests
```

## 💡 Quick Tips

### Choosing the Right Agent

**❓ Ask yourself**: "What is the primary goal?"

- **Write code** → frontend/backend-specialist
- **Review code** → code-reviewer
- **Fix bugs** → debugger
- **Write tests** → test-writer
- **Design** → api-designer / architecture-agent / ui-designer
- **Optimize** → db-optimizer / performance-profiler
- **Deploy** → devops-engineer
- **Research** → research-agent
- **Document** → technical-writer
- **Not sure** → Use `buddy_do` (smart router)

### Best Practice Patterns

✅ **DO**:
- Use descriptive task descriptions
- Let smart router auto-select agents
- Check dashboard for learned patterns
- Provide context in task description

❌ **DON'T**:
- Use vague descriptions ("fix bug")
- Skip context ("the login thing")
- Ignore evolution patterns
- Force wrong agent for task

## 🔄 Evolution Dashboard Metrics

```
buddy_dashboard --agents          # Agent performance
buddy_dashboard --patterns        # Learned workflows
buddy_dashboard --metrics         # Success rates
```

## 🎓 Skills System

```
buddy_skills                      # List all skills
buddy_skills --filter claude-code-buddy  # Only sa: skills
buddy_skills --filter user         # Only user skills
```

**Naming Convention**:
- `sa:<name>` → Claude Code Buddy generated
- `<name>` → User installed

## 🗑️ Uninstallation

```
buddy_uninstall                   # Complete removal
buddy_uninstall --keepData true   # Keep evolution data
buddy_uninstall --keepConfig true # Keep config files
buddy_uninstall --dryRun true     # Preview only
```

## 📚 Full Documentation

- **Complete Guide**: `@claude-code-buddy://usage-guide`
- **Examples**: `@claude-code-buddy://examples`
- **Best Practices**: `@claude-code-buddy://best-practices`

---

**Remember**: The smart router (`buddy_do`) learns from your patterns - the more you use it, the better it gets!