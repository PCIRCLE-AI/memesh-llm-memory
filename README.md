# Smart-Agents

> **Honest upfront**: This is NOT a collection of 23 separate AI agents. It's a **smart routing + prompt enhancement system** that makes Claude Code work better for your projects. Think of it as an intelligent copilot for your copilot.

## The Problem with Plain Claude Code

If you've been using Claude Code to build projects, you've probably hit these frustrations:

1. **Context Gets Lost** 🤯
   - You're debugging backend, then switch to frontend, Claude forgets what you were doing
   - Have to re-explain the same architecture decisions every session
   - "Wait, didn't we already fix this bug last week?"

2. **Repetitive Prompts** 😴
   - Typing "write unit tests for..." for the 50th time
   - Same boilerplate instructions again and again
   - Wish Claude would just "know" your project style

3. **No Memory Between Sessions** 🧠❌
   - Claude can't remember your previous sessions
   - Repeats the same mistakes you've already corrected
   - Can't learn from past successes or failures

4. **One-Size-Fits-All Responses** 👔
   - Same approach for "debug this bug" and "design this UI"
   - No specialized expertise for different tasks
   - You have to manually guide every conversation

5. **Manual Decision Making** 🤔
   - Should I use RAG for this? Knowledge graph? Just basic context?
   - Which approach works best for this specific problem?
   - Constant mental overhead

## What Smart-Agents Actually Is

**Smart-Agents is an MCP server that sits between you and Claude Code.**

Think of it as an intelligent layer that:
- 🧠 **Analyzes** your task requirements
- 🎯 **Routes** to the right "expert mode" (agent type)
- ✨ **Enhances** prompts with specialized context
- 📊 **Learns** from feedback to get better over time
- 💾 **Remembers** your project decisions and patterns

### The Architecture (Honest Explanation)

```
You ask Claude Code to do something
    ↓
Smart-Agents MCP Server analyzes the task
    ↓
Router selects the best "agent type" (expert mode)
    ↓
Prompt Enhancer generates specialized, optimized prompt
    ↓
Claude Code executes with your API subscription
    ↓
Feedback is collected for learning
```

**What we actually have:**

- **8 Real Agent Implementations** (actual separate code modules):
  1. **RAG Agent** - Retrieval-Augmented Generation for searching your codebase
  2. **Knowledge Graph** - Stores and retrieves project architecture decisions
  3. **Development Butler** - Workflow coordination and checkpoint detection
  4. **Test Writer** - Generates comprehensive test suites
  5. **DevOps Engineer** - CI/CD and deployment automation
  6. **Workflow Orchestrator** - Multi-step task coordination
  7. **N8n Integration** - Workflow automation integration
  8. **Opal Automation** - Security and access automation

- **30+ Agent Types via Prompt Enhancement** (specialized prompt templates):
  - code-reviewer, debugger, refactorer, api-designer, db-optimizer
  - frontend-specialist, backend-specialist, frontend-developer, backend-developer
  - research-agent, architecture-agent, data-analyst, performance-profiler
  - security-auditor, technical-writer, ui-designer, migration-assistant
  - project-manager, product-manager, data-engineer, ml-engineer
  - marketing-strategist, general-agent (fallback)
  - ...and more

**The Difference:**
- **Real implementations** = Full-featured modules with their own logic, storage, and APIs
- **Prompt-enhanced types** = Specialized prompts optimized for specific tasks
- Both work together seamlessly - you don't need to know the difference

## What Smart-Agents Solves (Real Benefits)

### 1. Smart Task Routing 🎯

**Before:**
```
You: "I need to optimize this database query"
Claude: [gives generic optimization advice]
```

**With Smart-Agents:**
```
Smart-Agents:
  → Detects it's a database optimization task
  → Routes to db-optimizer agent type
  → Enhances prompt with DB best practices context
  → Claude responds with specific, expert-level DB optimization
```

### 2. Automatic Context Enhancement ✨

Each agent type comes with pre-loaded expertise:

- **code-reviewer**: Code quality standards, common anti-patterns, security checks
- **debugger**: Systematic debugging methodologies, error pattern recognition
- **frontend-specialist**: UI/UX best practices, accessibility guidelines, responsive design
- **backend-specialist**: API design patterns, database optimization, security practices

**You get expert-level responses without writing expert-level prompts.**

### 3. Project Memory Systems 💾

Smart-Agents provides **three types of memory**:

**RAG (Retrieval-Augmented Generation)**:
- Searches your actual codebase for relevant context
- "Show me how authentication is implemented" → finds the exact files and patterns
- No more "let me read this file... and this file... and this file..."

**Knowledge Graph**:
- Stores architectural decisions, component relationships, past solutions
- "Why did we choose PostgreSQL over MongoDB?" → recalls the decision rationale
- Builds a living map of your project's evolution

**Project Memory**:
- Remembers coding standards, naming conventions, project-specific patterns
- Learns your preferences over time
- Maintains context across sessions

### 4. Evolution & Learning 📈

The system **actively learns from your feedback**:

```typescript
// Performance Tracker monitors every task
- Success rate per agent type
- Token usage efficiency
- Response quality scores

// Learning Manager adapts strategies
- Which prompts work best for your project?
- Which agent types handle which tasks most effectively?
- How to reduce token usage while maintaining quality?

// Adaptation Engine applies improvements
- Automatically refines prompts based on feedback
- Adjusts routing decisions based on past performance
- Optimizes for your specific use case
```

**Translation:** It gets smarter the more you use it. Not by magic, but by systematic feedback loops.

### 5. Cost & Performance Tracking 💰

```bash
# See your API usage
npm run dashboard

# Outputs:
Total API Calls: 1,245
Total Tokens: 2.4M
Estimated Cost: $8.75
Success Rate: 94.2%
Average Response Time: 3.2s

# Per-agent breakdown
code-reviewer: 234 calls, 85% success
debugger: 123 calls, 92% success
...
```

**No surprises on your API bill.** Know exactly where your tokens are going.

### 6. Development Workflow Tools 🛠️

**Git Integration**:
```bash
# Friendly Git commands (for beginners)
save-work "Added login feature"
list-versions
go-back-to "yesterday"
show-changes
```

**Planning Engine**:
- Breaks down complex tasks into steps
- Generates execution plans
- Coordinates multi-step workflows

**Checkpoint Detection**:
- Automatically detects when you've completed major milestones
- Suggests documentation updates
- Prompts for testing and code review

## Honest Limitations 🚫

**What Smart-Agents CANNOT do:**

1. ❌ **It's not magic** - Still needs clear requirements from you
2. ❌ **Doesn't replace Claude API** - You still need your own Anthropic API key
3. ❌ **Not a replacement for learning** - You still need to understand what you're building
4. ❌ **Can't fix bad architecture** - Garbage in, garbage out still applies
5. ❌ **Limited by Claude's capabilities** - Can't make Claude do things it fundamentally can't
6. ❌ **Requires setup** - Not a one-click install (yet)
7. ❌ **Early stage** - This is v1.0, expect rough edges

**What Smart-Agents DOES do well:**

1. ✅ **Makes Claude Code more context-aware** for your project
2. ✅ **Reduces repetitive prompt writing** through task routing
3. ✅ **Provides better memory** between sessions
4. ✅ **Specialized expertise** via prompt enhancement
5. ✅ **Learns from your feedback** to improve over time
6. ✅ **Tracks costs and performance** so you stay in budget
7. ✅ **Coordinates complex workflows** that span multiple steps

## Quick Start (For Beginners)

### Prerequisites

- **Node.js 18+** installed ([download](https://nodejs.org/))
- **Anthropic API Key** ([get one here](https://console.anthropic.com/))
- **Claude Code CLI** installed ([install guide](https://claude.com/claude-code))

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/smart-agents.git
cd smart-agents

# Install dependencies
npm install

# Copy example environment file
cp .env.example .env

# Edit .env file - Add your Anthropic API key
nano .env  # or use any text editor
```

Your `.env` file should look like:
```bash
ANTHROPIC_API_KEY=sk-ant-your-key-here
CLAUDE_MODEL=claude-sonnet-4-5-20250929

# Optional: OpenAI for RAG embeddings
OPENAI_API_KEY=sk-your-openai-key
```

### 2. Configure Claude Code to use Smart-Agents

Add to your Claude Code MCP settings (`~/.claude/config.json`):

```json
{
  "mcpServers": {
    "smart-agents": {
      "command": "node",
      "args": ["/path/to/smart-agents/dist/mcp/server.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

**Replace `/path/to/smart-agents` with your actual path.**

### 3. Build and Start

```bash
# Build the project
npm run build

# Start the MCP server
npm run mcp

# Or run in development mode
npm run dev
```

### 4. Test it in Claude Code

Open Claude Code and try:

```
"Analyze my codebase architecture"
"Generate tests for auth.ts"
"Optimize this database query"
"Review this pull request"
```

Smart-Agents will automatically:
- Analyze the task type
- Route to the appropriate agent
- Enhance the prompt with relevant context
- Return an expert-level response

## How to Use Effectively

### For Different Task Types

**Code Review:**
```
"Review this code for security vulnerabilities and best practices"
→ Routes to code-reviewer agent
→ Gets security checklist + quality standards context
```

**Debugging:**
```
"This function crashes with undefined error, help debug"
→ Routes to debugger agent
→ Gets systematic debugging methodology + error pattern recognition
```

**Frontend Design:**
```
"Design a responsive dashboard layout with dark mode"
→ Routes to frontend-specialist
→ Gets UI/UX patterns + accessibility guidelines + responsive design best practices
```

**Database Optimization:**
```
"Optimize this Prisma query that's taking 2 seconds"
→ Routes to db-optimizer
→ Gets query optimization patterns + indexing strategies + profiling techniques
```

### Providing Feedback

The system learns from your feedback:

```bash
# After a task completes
✅ Mark as successful (thumbs up)
❌ Mark as failure (thumbs down)
💬 Provide specific feedback

# This feedback is used to:
- Improve routing decisions
- Refine prompt enhancement
- Adapt to your coding style
- Optimize for your project patterns
```

## Architecture Deep Dive (For Curious Minds)

### Component Overview

```
┌─────────────────────────────────────────────────────────┐
│                     MCP Server                          │
│  (Integrates with Claude Code via Model Context        │
│   Protocol)                                             │
└────────────────┬────────────────────────────────────────┘
                 │
      ┌──────────▼──────────┐
      │   Router            │
      │  - Task Analysis    │
      │  - Agent Selection  │
      │  - Cost Estimation  │
      └──────────┬──────────┘
                 │
      ┌──────────▼──────────┐
      │  Agent Router       │
      │  - Capability Match │
      │  - Resource Check   │
      │  - Fallback Logic   │
      └──────────┬──────────┘
                 │
      ┌──────────▼──────────┐
      │  Prompt Enhancer    │
      │  - Template Loading │
      │  - Context Injection│
      │  - Optimization     │
      └──────────┬──────────┘
                 │
      ┌──────────▼──────────┐
      │  Claude Code        │
      │  (Your API)         │
      └──────────┬──────────┘
                 │
      ┌──────────▼──────────┐
      │  Feedback Loop      │
      │  - Performance Log  │
      │  - Learning Update  │
      │  - Adaptation Apply │
      └─────────────────────┘
```

### Real Agent Implementations

These have full-featured modules with their own logic:

**1. RAG Agent** (`src/agents/rag/`)
- **What it does**: Searches your codebase using vector embeddings
- **How it works**:
  - Indexes your code files into vector database (Vectra)
  - Retrieves relevant code snippets for queries
  - Re-ranks results for accuracy
- **Use case**: "Show me how authentication works" → finds auth-related files

**2. Knowledge Graph** (`src/agents/knowledge/`)
- **What it does**: Stores structured knowledge about your project
- **How it works**:
  - SQLite-based graph database
  - Stores entities (components, decisions, patterns) and relationships
  - Queries via semantic search
- **Use case**: "Why did we choose this architecture?" → recalls decision rationale

**3. Development Butler** (`src/agents/DevelopmentButler.ts`)
- **What it does**: Coordinates development workflow
- **How it works**:
  - Detects checkpoints (completed features, milestones)
  - Suggests next steps (tests, docs, code review)
  - Maintains development state
- **Use case**: Automatic workflow guidance throughout feature development

**4. Test Writer** (`src/agents/TestWriterAgent.ts`)
- **What it does**: Generates comprehensive test suites
- **How it works**:
  - Analyzes code structure and dependencies
  - Generates unit tests, integration tests, E2E tests
  - Uses CI/CD templates for test configuration
- **Use case**: "Generate tests for this module" → creates full test coverage

**5. DevOps Engineer** (`src/agents/DevOpsEngineerAgent.ts`)
- **What it does**: CI/CD and deployment automation
- **How it works**:
  - GitLab CI pipeline generation
  - Docker container configuration
  - Deployment script creation
- **Use case**: "Set up CI/CD pipeline" → generates complete pipeline config

### Evolution System Components

**Performance Tracker** (`src/evolution/PerformanceTracker.ts`)
```typescript
// Tracks every task execution
{
  agentId: 'code-reviewer',
  taskId: 'abc123',
  duration: 3200,        // milliseconds
  tokensUsed: 8500,
  success: true,
  userRating: 4.5        // 0-5 scale
}
```

**Learning Manager** (`src/evolution/LearningManager.ts`)
```typescript
// Learns patterns from historical data
{
  patternType: 'database-optimization',
  successRate: 0.92,     // 92% success
  avgTokens: 6500,
  preferredPromptTemplate: 'db-optimizer-v2',
  learningWeight: 0.75   // confidence level
}
```

**Adaptation Engine** (`src/evolution/AdaptationEngine.ts`)
```typescript
// Applies learned improvements
- Refines prompt templates based on feedback
- Adjusts routing decisions for edge cases
- Optimizes token usage patterns
- A/B tests new strategies
```

## Advanced Features

### Custom Skills

Create your own agent behaviors:

```typescript
// src/skills/my-custom-skill.ts
export const myCustomSkill = {
  name: 'my-custom-skill',
  description: 'Does something specific to my project',

  async execute(task: Task): Promise<AgentResponse> {
    // Your custom logic here
    return {
      success: true,
      message: 'Custom skill executed!',
      data: { /* results */ }
    };
  }
};
```

Register in `src/skills/index.ts` and it becomes available to the router.

### Integration with N8n and Opal

**N8n Workflow Integration** (`src/agents/N8nWorkflowAgent.ts`):
- Trigger N8n workflows from code
- Automate deployment, testing, notifications
- Integrate with external services

**Opal Access Automation** (`src/agents/OpalAutomationAgent.ts`):
- Manage security access requests
- Automate permission workflows
- Integrate with your access control systems

### Git Integration (Beginner-Friendly)

```bash
# User-friendly Git commands
save-work "Completed login feature"
list-versions
go-back-to "yesterday"
show-changes
backup-now
```

Powered by `src/hooks/FriendlyGitCommands.ts` - wraps complex Git commands in simple, intuitive operations.

## Configuration

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-your-key-here
CLAUDE_MODEL=claude-sonnet-4-5-20250929

# Optional (for RAG)
OPENAI_API_KEY=sk-your-openai-key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Quota Limits
CLAUDE_DAILY_LIMIT=150          # requests per day
CLAUDE_MONTHLY_LIMIT=4500       # requests per month

# Cost Control
MONTHLY_BUDGET_USD=50           # your monthly budget
COST_ALERT_THRESHOLD=0.8        # alert at 80% budget

# Logging
LOG_LEVEL=info
ENABLE_METRICS=true
METRICS_PORT=9090

# Orchestrator
ORCHESTRATOR_MODE=local         # or 'distributed'
ORCHESTRATOR_MAX_MEMORY_MB=6144 # 6GB limit
```

### Agent Evolution Config

```typescript
// src/evolution/AgentEvolutionConfig.ts

// Each agent type has tunable parameters:
{
  agentId: 'code-reviewer',
  category: 'development',
  confidenceThreshold: 0.75,     // min confidence to use this agent
  minObservationsForAdaptation: 15,  // min data points before adapting
  learningWeights: {
    successRate: 0.4,            // 40% weight to success rate
    userFeedback: 0.35,          // 35% weight to user ratings
    performanceMetrics: 0.25     // 25% weight to speed/efficiency
  }
}
```

Adjust these to tune how aggressively the system adapts to your feedback.

## Troubleshooting

### Common Issues

**1. "Module not found" errors**
```bash
# Rebuild the project
npm run build
```

**2. "ANTHROPIC_API_KEY not set"**
```bash
# Check your .env file exists
ls -la .env

# Verify the key is set
cat .env | grep ANTHROPIC_API_KEY
```

**3. "MCP server not responding"**
```bash
# Check Claude Code MCP settings
cat ~/.claude/config.json

# Restart Claude Code
# Verify the path in config.json matches your smart-agents location
```

**4. "Out of memory" errors**
```bash
# Reduce max memory in .env
ORCHESTRATOR_MAX_MEMORY_MB=4096  # reduce from 6144 to 4096

# Or close other applications to free up RAM
```

**5. RAG agent not finding files**
```bash
# Re-index your codebase
npm run rag:index

# Check RAG configuration
cat .env | grep OPENAI
```

### Debug Mode

Enable detailed logging:

```bash
# In .env
LOG_LEVEL=debug
ENABLE_METRICS=true

# Run in debug mode
npm run dev
```

Check logs in `~/.smart-agents/logs/`

## Development

### Project Structure

```
smart-agents/
├── src/
│   ├── agents/           # 8 real agent implementations
│   │   ├── rag/         # RAG agent (vector search)
│   │   ├── knowledge/   # Knowledge Graph agent
│   │   ├── DevelopmentButler.ts
│   │   ├── TestWriterAgent.ts
│   │   ├── DevOpsEngineerAgent.ts
│   │   └── ...
│   ├── core/            # Core infrastructure
│   │   ├── AgentRegistry.ts    # Agent definitions
│   │   ├── PromptEnhancer.ts   # Prompt enhancement
│   │   └── MCPToolInterface.ts # MCP integration
│   ├── orchestrator/    # Task routing logic
│   │   ├── router.ts           # Main router
│   │   ├── AgentRouter.ts      # Agent selection
│   │   └── TaskAnalyzer.ts     # Task analysis
│   ├── evolution/       # Learning & adaptation
│   │   ├── PerformanceTracker.ts
│   │   ├── LearningManager.ts
│   │   └── AdaptationEngine.ts
│   ├── mcp/            # MCP server implementation
│   │   └── server.ts
│   ├── skills/         # Custom skills system
│   ├── planning/       # Multi-step planning
│   ├── hooks/          # Git and workflow hooks
│   └── errors/         # Error handling
├── dist/               # Compiled JavaScript
├── tests/              # Test suites (713 tests)
├── docs/               # Documentation
├── .env.example        # Example environment file
└── package.json
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- src/agents/rag/

# Watch mode
npm test -- --watch

# Coverage report
npm test -- --coverage
```

### Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See `CONTRIBUTING.md` for detailed guidelines.

## Roadmap

### v1.1 (Next Release)
- [ ] Web UI for dashboard and config
- [ ] One-click installation script
- [ ] More pre-built skills
- [ ] Better error messages for beginners
- [ ] Video tutorials

### v1.2 (Future)
- [ ] Cloud-hosted option (no local setup)
- [ ] Team collaboration features
- [ ] Advanced cost optimization
- [ ] More integration options (GitHub Actions, Jenkins, etc.)
- [ ] Mobile app for monitoring

### v2.0 (Vision)
- [ ] Multi-model support (Claude + GPT-4 + local models)
- [ ] Visual workflow builder
- [ ] Marketplace for community skills
- [ ] Enterprise features (SSO, audit logs, compliance)

## FAQ

**Q: Do I need to be a software engineer to use this?**
A: No! If you can use Claude Code, you can use Smart-Agents. It's designed to make Claude Code easier, not harder.

**Q: Will this make my API bills explode?**
A: No. Smart-Agents has built-in cost tracking and budget limits. It actually helps reduce costs by optimizing token usage.

**Q: How is this different from just using Claude Code?**
A: Claude Code is great, but it treats every task the same. Smart-Agents adds task routing, memory, and learning - making Claude more context-aware for your specific project.

**Q: Can I use this with my existing Claude Code setup?**
A: Yes! Smart-Agents runs as an MCP server alongside Claude Code. Your existing workflows continue working.

**Q: Is my code private?**
A: Yes. Everything runs locally on your machine (except the Claude API calls you're already making). Your code never leaves your computer.

**Q: What if I don't like it?**
A: Just remove it from your MCP config. No lock-in, no vendor dependency.

**Q: How much does it cost?**
A: Smart-Agents is free and open-source. You only pay for Claude API usage (same as using Claude Code directly).

**Q: Can I customize the agents?**
A: Yes! The prompt templates are in `src/core/PromptEnhancer.ts`. The evolution config is in `src/evolution/AgentEvolutionConfig.ts`. Customize to your heart's content.

## Support

- **Documentation**: This README + docs in `docs/`
- **Issues**: [GitHub Issues](https://github.com/yourusername/smart-agents/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/smart-agents/discussions)
- **Discord**: [Join our community](https://discord.gg/smart-agents) (coming soon)

## License

AGPL-3.0 License - see [LICENSE](LICENSE) file for details.

This project is licensed under the GNU Affero General Public License v3.0. This means if you modify and deploy this as a network service, you must make the modified source code available to users.

## Acknowledgments

- Built with [Model Context Protocol (MCP)](https://github.com/anthropics/mcp)
- Powered by [Claude API](https://www.anthropic.com/claude)
- Inspired by the amazing Claude Code community
- Special thanks to early testers and contributors

---

**Built with ❤️ for Claude Code users who want their AI copilot to be smarter, not louder.**

**Remember: This is v1.0. We're honest about limitations and actively improving. Your feedback makes this better for everyone.**
