# Smart-Agents V2.1 Design Document

**Date**: 2025-12-30
**Version**: 2.1
**Design Goal**: Enhance Claude Code vibe coding workflow with event-driven automation and essential development pipeline agents

---

## Executive Summary

Smart-Agents V2.1 is a **Prompt Enhancement System** with selective real implementations, designed to enhance Claude Code's natural workflow without introducing coordination overhead. Based on the V2.0 audit findings, this design maintains the proven prompt enhancement core while adding strategic automation through an event-driven butler and 12 essential agents covering the complete development pipeline from brainstorming to production launch.

**Key Principles**:
- ✅ **Working Solutions Only** - Only implement features proven to add value
- ✅ **Vibe Coding First** - Fast iteration without workflow interruptions
- ✅ **MCP-Native** - All agents leverage existing MCP tools
- ✅ **Balanced Approach** - Speed/simplicity + intelligent automation
- ✅ **Autonomous with Explanation** - Agents do tasks but explain decisions

---

## 1. System Overview & Architecture

### 1.1 Three-Layer Hybrid Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Prompt Enhancement Core (Proven in V2.0)         │
│  - AgentRegistry, PromptEnhancer, 22 agent personas        │
│  - Hooks system (session-start, post-tool-use, stop)       │
│  - Knowledge Graph for learning and memory                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 2: Event-Driven Development Butler (NEW)            │
│  - Automatic assistance at logical checkpoints             │
│  - Pattern detection and intelligent recommendations       │
│  - Zero-interruption automation                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: Selective Agent Implementations (5 Real + 7 Prompts) │
│  - Real: butler, test-writer, devops, pm, data-engineer   │
│  - Enhanced Prompts: 7 agents (architecture, code-review,  │
│    security, ui-design, marketing, product, ml-engineer)   │
│  - Optional: RAG agent (ChromaDB + OpenAI key required)    │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Design Rationale

**Why Hybrid?**
- **Proven Core**: V2.0 audit showed prompt enhancement works reliably
- **Strategic Automation**: Add real implementations only where they provide clear value
- **Maintainability**: 5 real agents vs 22 reduces complexity while covering essentials
- **Vibe Coding Compatible**: Event-driven butler assists without interrupting flow

**What Changed from V2.0?**
- ✅ Added event-driven butler for automated assistance
- ✅ Identified 12 essential agents (complete dev pipeline)
- ✅ 5 agents get real implementations (butler, test-writer, devops, pm, data-engineer)
- ✅ 7 agents enhanced as prompt templates (architecture, code-review, security, ui-design, marketing, product, ml-engineer)
- ✅ RAG agent as optional feature (ChromaDB + OpenAI key)
- ✅ All agents use MCP tools natively

---

## 2. The 12 Essential Agents (+ RAG)

### 2.1 Agent Classification

**Real Implementations (5 agents)**:

1. **development-butler** 🤖
   - **Purpose**: Event-driven automation at logical checkpoints
   - **Triggers**: before-commit, significant-change-detected, session-end, test-failure
   - **Actions**: Auto code review, test generation, documentation update, project organization
   - **Why Real**: Core innovation requiring complex state management and event detection

2. **test-writer** 🧪
   - **Purpose**: Intelligent test generation and coverage analysis
   - **Capabilities**: Unit tests, integration tests, E2E scenarios, TDD workflow
   - **Why Real**: Complex analysis of code structure and test patterns

3. **devops-engineer** 🚀
   - **Purpose**: CI/CD pipeline management and deployment automation
   - **Capabilities**: GitLab CI, GitHub Actions, Docker, K8s, AWS/GCP deployment
   - **Why Real**: Infrastructure-as-code requires file manipulation and API integration

4. **project-manager** 📋
   - **Purpose**: Task tracking, milestone management, progress reporting
   - **Capabilities**: Auto TODO updates, burndown charts, dependency tracking
   - **Why Real**: Persistent state management and automated tracking

5. **data-engineer** 📊
   - **Purpose**: Data pipeline building, ETL workflows, data quality
   - **Capabilities**: Pipeline design, data validation, transformation logic
   - **Why Real**: Complex data flow analysis and pipeline generation

**Enhanced Prompts (7 agents)**:

6. **architecture-agent** 🏗️ *(already exists, enhanced)*
   - **Purpose**: System architecture design and impact analysis
   - **Enhancement**: Enriched with dependency analysis patterns

7. **code-reviewer** 🔍 *(already exists, enhanced)*
   - **Purpose**: Code quality review and security audit
   - **Enhancement**: Automated review checklists and best practices

8. **security-auditor** 🛡️
   - **Purpose**: Security vulnerability scanning and mitigation
   - **Enhancement**: OWASP Top 10, authentication/authorization patterns

9. **ui-designer** 🎨
   - **Purpose**: UI/UX design, responsive layouts, accessibility
   - **Enhancement**: Design system templates and component libraries

10. **marketing-strategist** 📈
    - **Purpose**: Marketing strategy, branding, go-to-market planning
    - **Enhancement**: Startup marketing playbooks and growth tactics

11. **product-manager** 🎯
    - **Purpose**: Product strategy, feature prioritization, roadmap planning
    - **Enhancement**: Product management frameworks and user research methods

12. **ml-engineer** 🤖
    - **Purpose**: ML model training, pipeline building, model optimization
    - **Enhancement**: ML best practices, training workflows, model evaluation

**Optional Feature**:

13. **RAG Agent** 🧠 *(optional, requires ChromaDB + OpenAI API key)*
    - **Purpose**: Enhanced context retrieval for better recommendations
    - **Implementation Status**: User indicated "i think this has been implemented"
    - **Phase 4 Verification**: Confirm existing implementation, integrate interactive enable/disable

### 2.2 Why This Set?

**Complete Development Pipeline Coverage**:
- **Brainstorming → Design**: architecture-agent, product-manager
- **Implementation**: code-reviewer, test-writer, development-butler
- **Quality Assurance**: security-auditor, test-writer
- **Deployment**: devops-engineer
- **Data/AI**: data-engineer, ml-engineer
- **Business/Marketing**: ui-designer, marketing-strategist, product-manager
- **Project Management**: project-manager
- **Enhanced Context** (optional): RAG agent

**Balanced Technical + Business**:
- 5 technical real implementations
- 3 business/creative enhanced prompts
- 2 AI/ML specialists
- 2 management roles
- 1 optional RAG enhancement

---

## 3. Event-Driven Development Butler

### 3.1 Core Innovation

The development-butler is the **key innovation** of V2.1, providing automated assistance at logical workflow checkpoints without interrupting the vibe coding flow.

**Checkpoint Detection**:

```typescript
enum Checkpoint {
  BEFORE_COMMIT = 'before-commit',           // Git add/commit detected
  SIGNIFICANT_CHANGE = 'significant-change', // 5+ files modified or architectural change
  SESSION_END = 'session-end',               // User ending session
  TEST_FAILURE = 'test-failure',             // Tests failed
  SECURITY_CONCERN = 'security-concern',     // Auth/crypto code modified
  PERFORMANCE_ISSUE = 'performance-issue'    // Slow operations detected
}
```

**Automated Actions**:

```typescript
interface ButlerAction {
  trigger: Checkpoint;
  action: () => Promise<void>;
  mode: 'silent' | 'notify' | 'ask';
}

const butlerWorkflows = [
  {
    trigger: Checkpoint.BEFORE_COMMIT,
    action: async () => {
      await runCodeReview();      // Invoke code-reviewer agent
      await checkTestCoverage();  // Invoke test-writer agent
      await updateDocs();         // Auto-update affected docs
      await validateNoSecrets();  // Security check
    },
    mode: 'notify' // Show what was checked
  },
  {
    trigger: Checkpoint.SIGNIFICANT_CHANGE,
    action: async () => {
      await analyzeImpact();         // Architecture impact analysis
      await suggestTests();          // Recommend test scenarios
      await updateArchitectureDocs(); // Update ARCHITECTURE.md
    },
    mode: 'notify'
  },
  {
    trigger: Checkpoint.SESSION_END,
    action: async () => {
      await saveProgress();       // Save to Knowledge Graph
      await generateSummary();    // Session summary
      await suggestNextSteps();   // Recommendations for next session
    },
    mode: 'silent' // Runs via stop.js hook
  }
];
```

### 3.2 Integration with Hooks

**Enhanced session-start.js**:
```javascript
// Pre-load relevant agent personas based on yesterday's work
const patterns = await knowledgeGraph.query("yesterday's work patterns");
if (patterns.includes('frontend')) {
  await loadAgent('ui-designer');
}
if (patterns.includes('testing')) {
  await loadAgent('test-writer');
}
```

**Enhanced post-tool-use.js**:
```javascript
// Detect checkpoints in real-time
if (isSignificantChange(toolData)) {
  await developmentButler.trigger(Checkpoint.SIGNIFICANT_CHANGE);
}
if (isBeforeCommit(toolData)) {
  await developmentButler.trigger(Checkpoint.BEFORE_COMMIT);
}
```

**Enhanced stop.js**:
```javascript
// Trigger session-end workflow
await developmentButler.trigger(Checkpoint.SESSION_END);
await saveLearnedPatterns();
```

### 3.3 Zero-Interruption Principle

**Modes**:
- **Silent**: Runs in background, saves to Knowledge Graph (session-end)
- **Notify**: Shows summary after completion (before-commit, significant-change)
- **Ask**: Requests user confirmation for critical decisions (security concerns)

**User Control**:
```bash
# User can always override
claude butler disable             # Temporarily disable butler
claude butler set-mode silent     # Change all to silent mode
claude butler skip-checkpoint before-commit  # Skip specific checkpoint once
```

---

## 4. MCP Tool Integration Strategy

### 4.1 Available MCP Tools

```typescript
interface MCPToolkit {
  filesystem: {
    read_text_file, write_file, edit_file, create_directory,
    list_directory, move_file, search_files, get_file_info
  };
  memory: {
    create_entities, add_observations, create_relations,
    open_nodes, search_nodes, read_graph, delete_entities
  };
  bash: {
    execute_command // Git, npm, docker, etc.
  };
  perplexity: {
    search, reason, deep_research // Web research
  };
  playwright: {
    navigate, click, type, screenshot, snapshot // E2E testing
  };
  github: {
    create_repo, create_pr, manage_issues // Via Docker MCP
  };
}
```

### 4.2 Agent-to-Tool Mapping

**Real Implementation Agents** (direct MCP tool calls):

```typescript
class TestWriterAgent {
  async generateTests(filePath: string) {
    // Read source code
    const code = await mcp.filesystem.read_text_file({ path: filePath });

    // Analyze structure
    const analysis = await this.analyzeCode(code);

    // Generate test file
    const testCode = await this.generateTestCode(analysis);

    // Write test file
    await mcp.filesystem.write_file({
      path: filePath.replace('.ts', '.test.ts'),
      content: testCode
    });

    // Save to Knowledge Graph
    await mcp.memory.create_entities({
      entities: [{
        name: `${filePath} Test Coverage`,
        entityType: 'test_coverage',
        observations: [`Generated ${analysis.testCount} tests`, ...]
      }]
    });
  }
}
```

**Enhanced Prompt Agents** (prompt includes tool usage instructions):

```typescript
const codeReviewerPrompt = `
You are a senior code reviewer. When reviewing code:

1. Read the file using mcp__filesystem__read_text_file
2. Check git diff using bash tool: git diff --cached
3. Analyze for:
   - Security vulnerabilities (SQL injection, XSS, secrets)
   - Performance issues (O(n²) algorithms, N+1 queries)
   - Best practices (SOLID, DRY, proper error handling)
4. Save findings to Knowledge Graph using mcp__memory__create_entities
5. Return structured review with severity levels

Example workflow:
\`\`\`typescript
const code = await mcp__filesystem__read_text_file({ path: 'src/api.ts' });
const diff = await bash('git diff --cached src/api.ts');
// ... analyze ...
await mcp__memory__create_entities({
  entities: [{
    name: 'Code Review: src/api.ts',
    entityType: 'code_review',
    observations: ['🔴 Critical: SQL injection risk in line 45', ...]
  }]
});
\`\`\`
`;
```

### 4.3 MCP-First Principle

**All agents must**:
- ✅ Use MCP tools for file operations (no assumptions about file content)
- ✅ Save learnings to Knowledge Graph (persistent memory)
- ✅ Use bash tool for git/npm/docker commands
- ✅ Use perplexity for web research when needed
- ✅ Act as mentors/guides (explain decisions, not just execute)

**Benefits**:
- Consistent tool usage across all agents
- Persistent learning via Knowledge Graph
- No need to reinvent file I/O or git integration
- Seamless integration with Claude Code ecosystem

---

## 5. Data Flow & Integration Patterns

### 5.1 Complete Workflow

```
User Request: "Implement user authentication"
      ↓
session-start.js → Detects "authentication" keyword
      ↓
Loads: security-auditor, architecture-agent, test-writer
      ↓
User works... (vibe coding)
      ↓
post-tool-use.js → Detects significant change (5+ files modified)
      ↓
development-butler.trigger(Checkpoint.SIGNIFICANT_CHANGE)
      ↓
Actions:
  - architecture-agent: Analyze impact (auth affects API, DB, frontend)
  - security-auditor: Check for vulnerabilities (password hashing, token storage)
  - test-writer: Suggest test scenarios (login, logout, token refresh)
      ↓
User: "git commit -m 'feat: add authentication'"
      ↓
post-tool-use.js → Detects before-commit
      ↓
development-butler.trigger(Checkpoint.BEFORE_COMMIT)
      ↓
Actions:
  - code-reviewer: Review auth code (security critical)
  - test-writer: Verify test coverage (≥80% for auth)
  - devops-engineer: Check CI/CD config (secrets management)
      ↓
Results displayed: "✅ Code review passed, ✅ 85% coverage, ⚠️ Add secrets to CI"
      ↓
User fixes secrets config
      ↓
Commit succeeds
      ↓
stop.js → Save session learnings to Knowledge Graph
```

### 5.2 RAG Agent Integration (Optional)

```typescript
interface RAGConfig {
  enabled: boolean;
  chromaDbPath: string;
  openaiApiKey: string; // Required if enabled
}

class RAGAgent {
  private chromaDB: ChromaDB;
  private openai: OpenAI;

  constructor(config: RAGConfig) {
    if (config.enabled) {
      this.chromaDB = new ChromaDB(config.chromaDbPath);
      this.openai = new OpenAI(config.openaiApiKey);
    }
  }

  async enhanceContext(userRequest: string): Promise<EnhancedContext> {
    if (!this.config.enabled) {
      return { original: userRequest, enhanced: userRequest };
    }

    // Query ChromaDB for relevant past context
    const similarPastWork = await this.chromaDB.query(userRequest, { topK: 5 });

    // Enhance prompt with retrieved context
    const enhanced = await this.openai.embedAndGenerate(
      userRequest,
      similarPastWork
    );

    return { original: userRequest, enhanced, sources: similarPastWork };
  }
}
```

**Interactive Enable/Disable** (user mentioned this was already implemented):
```bash
# User can toggle RAG
claude rag enable   # Prompts for OpenAI API key, ChromaDB path
claude rag disable  # Falls back to regular Knowledge Graph
claude rag status   # Shows enabled/disabled, API key status
```

### 5.3 Integration Patterns

**Pattern 1: Hooks ↔ Knowledge Graph**
```typescript
// session-start.js
const lastSession = await mcp.memory.search_nodes({ query: "yesterday session" });
const recommendedAgents = extractRecommendations(lastSession);
await loadAgents(recommendedAgents);

// stop.js
await mcp.memory.create_entities({
  entities: [{
    name: `Session ${new Date().toISOString()}`,
    entityType: 'session',
    observations: toolCallSummary
  }]
});
```

**Pattern 2: Agent ↔ MCP Tools**
```typescript
class DevOpsAgent {
  async setupCICD(projectType: 'nodejs' | 'python' | 'go') {
    // Read template
    const template = await mcp.filesystem.read_text_file({
      path: `templates/ci/${projectType}.yml`
    });

    // Customize
    const customized = this.customize(template, projectConfig);

    // Write CI config
    await mcp.filesystem.write_file({
      path: '.gitlab-ci.yml',
      content: customized
    });

    // Commit
    await mcp.bash({ command: 'git add .gitlab-ci.yml && git commit -m "ci: add CI/CD pipeline"' });
  }
}
```

**Pattern 3: Optional RAG Enhancement**
```typescript
async function handleUserRequest(request: string) {
  let context = request;

  // Optional RAG enhancement
  if (ragAgent.isEnabled()) {
    const enhanced = await ragAgent.enhanceContext(request);
    context = enhanced.enhanced;
    console.log(`🧠 RAG enhanced context with ${enhanced.sources.length} past examples`);
  }

  // Proceed with regular workflow
  await developmentButler.process(context);
}
```

---

## 6. Implementation Phases

### Phase 1: Core Infrastructure (Week 1-2)

**Goals**:
- ✅ Set up project structure for V2.1
- ✅ Update AgentRegistry with 12 essential agents
- ✅ Enhance PromptEnhancer with new agent prompts
- ✅ Update hooks (session-start, post-tool-use, stop)

**Deliverables**:
```
src/
  agents/
    development-butler/        # Stub implementation
    test-writer/               # Stub implementation
    devops-engineer/           # Stub implementation
    project-manager/           # Stub implementation
    data-engineer/             # Stub implementation
  prompts/
    architecture-agent.ts      # Enhanced prompt
    code-reviewer.ts           # Enhanced prompt
    security-auditor.ts        # Enhanced prompt
    ui-designer.ts             # Enhanced prompt
    marketing-strategist.ts    # Enhanced prompt
    product-manager.ts         # Enhanced prompt
    ml-engineer.ts             # Enhanced prompt
  core/
    AgentRegistry.ts           # Updated with 12 agents
    PromptEnhancer.ts          # Enhanced prompt loading
hooks/
  session-start.js             # Enhanced with agent pre-loading
  post-tool-use.js             # Enhanced with checkpoint detection
  stop.js                      # Enhanced with butler integration
```

**Success Criteria**:
- All 12 agents registered in AgentRegistry
- Enhanced prompts loaded correctly
- Hooks updated and tested
- No regressions in existing functionality

### Phase 2: Event-Driven Butler (Week 3-4)

**Goals**:
- ✅ Implement development-butler core logic
- ✅ Implement checkpoint detection
- ✅ Integrate with hooks system
- ✅ Test automated workflows

**Deliverables**:
```typescript
// src/agents/development-butler/index.ts
export class DevelopmentButler {
  async trigger(checkpoint: Checkpoint): Promise<void>;
  async detectCheckpoint(toolData: ToolData): Checkpoint | null;
  async executeWorkflow(checkpoint: Checkpoint): Promise<WorkflowResult>;
}

// src/agents/development-butler/workflows/
before-commit.ts       # Code review + test coverage + docs
significant-change.ts  # Impact analysis + test suggestions
session-end.ts         # Save progress + generate summary
test-failure.ts        # Debug assistance + fix suggestions
```

**Success Criteria**:
- Butler correctly detects all checkpoint types
- Automated workflows execute successfully
- Zero-interruption mode works (silent/notify/ask modes)
- Knowledge Graph records all butler actions

### Phase 3: Essential Agents (Week 5-8)

**Goals**:
- ✅ Implement 4 remaining real agents (test-writer, devops, pm, data-engineer)
- ✅ Enhance 7 prompt-based agents
- ✅ Integrate all agents with MCP tools
- ✅ Test complete development pipeline

**Week 5-6**: test-writer + devops-engineer
```typescript
class TestWriterAgent {
  async generateUnitTests(filePath: string): Promise<void>;
  async generateIntegrationTests(apiEndpoints: string[]): Promise<void>;
  async analyzeTestCoverage(): Promise<CoverageReport>;
}

class DevOpsAgent {
  async setupCICD(platform: 'gitlab' | 'github'): Promise<void>;
  async deployToCloud(target: 'aws' | 'gcp'): Promise<void>;
  async setupDocker(): Promise<void>;
}
```

**Week 7**: project-manager
```typescript
class ProjectManagerAgent {
  async trackMilestone(name: string, tasks: Task[]): Promise<void>;
  async generateProgressReport(): Promise<Report>;
  async updateTODO(completed: string[], added: string[]): Promise<void>;
}
```

**Week 8**: data-engineer + enhanced prompts
```typescript
class DataEngineerAgent {
  async designPipeline(source: DataSource, target: DataTarget): Promise<Pipeline>;
  async generateETL(transformations: Transform[]): Promise<ETLCode>;
  async validateDataQuality(dataset: string): Promise<QualityReport>;
}

// Enhanced prompts for: architecture, code-review, security, ui-design,
// marketing, product, ml-engineer
```

**Success Criteria**:
- All 5 real agents fully implemented
- All 7 enhanced prompts tested
- Each agent uses MCP tools correctly
- Complete dev pipeline validated (brainstorming → deployment)

### Phase 4: RAG Agent (Week 9)

**Goals**:
- ✅ Verify existing RAG implementation (user said "i think this has been implemented")
- ✅ Integrate ChromaDB
- ✅ Add interactive enable/disable feature
- ✅ Test with/without OpenAI API key

**Investigation**:
```bash
# Check for existing RAG implementation
grep -r "RAG" src/
grep -r "ChromaDB" src/
grep -r "chroma" package.json
```

**Implementation** (if not exists):
```typescript
// src/agents/rag-agent/index.ts
export class RAGAgent {
  private config: RAGConfig;

  async enable(openaiApiKey: string, chromaDbPath?: string): Promise<void>;
  async disable(): Promise<void>;
  async query(prompt: string): Promise<EnhancedContext>;
  isEnabled(): boolean;
}

// CLI integration
// claude rag enable   → prompts for API key
// claude rag disable  → disables RAG
// claude rag status   → shows enabled/disabled
```

**Testing**:
```typescript
describe('RAGAgent', () => {
  it('gracefully handles missing OpenAI key', async () => {
    const agent = new RAGAgent({ enabled: true, openaiApiKey: '' });
    const result = await agent.query('test');
    expect(result.enhanced).toBe(result.original); // Falls back to original
  });

  it('enhances context when enabled with valid key', async () => {
    const agent = new RAGAgent({ enabled: true, openaiApiKey: validKey });
    const result = await agent.query('implement auth');
    expect(result.sources.length).toBeGreaterThan(0);
  });
});
```

**Success Criteria**:
- RAG agent works with ChromaDB
- Interactive enable/disable via CLI
- Gracefully handles missing API key
- Enhances context when enabled

### Phase 5: Polish & Documentation (Week 10)

**Goals**:
- ✅ Integration testing (complete workflows)
- ✅ Performance optimization
- ✅ Documentation updates
- ✅ User guide

**Integration Tests**:
```typescript
describe('Complete Development Workflow', () => {
  it('handles feature request → commit', async () => {
    // 1. User request
    const request = "Add user authentication";

    // 2. session-start loads relevant agents
    await sessionStart();
    expect(loadedAgents).toContain('security-auditor');

    // 3. User implements feature (simulated)
    await simulateCodeChanges(['src/auth.ts', 'src/api/login.ts']);

    // 4. Significant change detected
    const checkpoint = await butler.detectCheckpoint(toolData);
    expect(checkpoint).toBe(Checkpoint.SIGNIFICANT_CHANGE);

    // 5. Butler triggers workflow
    const result = await butler.executeWorkflow(checkpoint);
    expect(result.actions).toContain('impact-analysis');

    // 6. Before commit
    await bash('git add .');
    const commitCheckpoint = await butler.detectCheckpoint({ command: 'git commit' });
    expect(commitCheckpoint).toBe(Checkpoint.BEFORE_COMMIT);

    // 7. Code review + tests
    const review = await butler.executeWorkflow(commitCheckpoint);
    expect(review.codeReview.passed).toBe(true);
    expect(review.testCoverage).toBeGreaterThanOrEqual(80);
  });
});
```

**Documentation**:
- `README.md`: Updated architecture overview
- `ARCHITECTURE.md`: V2.1 architecture details
- `docs/agents/`: Individual agent documentation
- `docs/guides/butler-usage.md`: Development butler guide
- `docs/guides/rag-setup.md`: RAG agent setup guide

**Success Criteria**:
- All integration tests pass
- Performance benchmarks meet targets
- Documentation complete and accurate
- User guide validated

---

## 7. Testing & Validation Strategy

### 7.1 Unit Testing

**Each Agent**:
```typescript
describe('TestWriterAgent', () => {
  it('generates unit tests for TypeScript functions', async () => {
    const agent = new TestWriterAgent();
    const testCode = await agent.generateUnitTests('src/utils.ts');
    expect(testCode).toContain('describe(');
    expect(testCode).toContain('it(');
    expect(testCode).toContain('expect(');
  });

  it('calculates test coverage correctly', async () => {
    const coverage = await agent.analyzeTestCoverage();
    expect(coverage.percentage).toBeGreaterThanOrEqual(0);
    expect(coverage.percentage).toBeLessThanOrEqual(100);
  });
});
```

**Development Butler**:
```typescript
describe('DevelopmentButler', () => {
  it('detects before-commit checkpoint', async () => {
    const toolData = { toolName: 'Bash', command: 'git commit -m "test"' };
    const checkpoint = await butler.detectCheckpoint(toolData);
    expect(checkpoint).toBe(Checkpoint.BEFORE_COMMIT);
  });

  it('executes workflow without errors', async () => {
    const result = await butler.executeWorkflow(Checkpoint.BEFORE_COMMIT);
    expect(result.success).toBe(true);
    expect(result.actions.length).toBeGreaterThan(0);
  });
});
```

**RAG Agent** (requires OpenAI API key):
```typescript
describe('RAGAgent', () => {
  it('falls back gracefully without API key', async () => {
    const agent = new RAGAgent({ enabled: true, openaiApiKey: '' });
    const result = await agent.query('test');
    expect(result.enhanced).toBe(result.original);
  });

  it('enhances context with valid API key', async () => {
    // Skip if no API key in env
    if (!process.env.OPENAI_API_KEY) {
      console.log('⚠️ Skipping RAG tests - no API key');
      return;
    }

    const agent = new RAGAgent({
      enabled: true,
      openaiApiKey: process.env.OPENAI_API_KEY
    });
    const result = await agent.query('implement authentication');
    expect(result.sources.length).toBeGreaterThan(0);
  });
});
```

### 7.2 Integration Testing

**Complete Workflow** (brainstorming → deployment):
```typescript
describe('End-to-End Development Pipeline', () => {
  it('completes feature lifecycle', async () => {
    // 1. Brainstorming
    await productManagerAgent.defineFeature('User Profile');

    // 2. Architecture
    const design = await architectureAgent.design('User Profile');
    expect(design.components.length).toBeGreaterThan(0);

    // 3. Implementation (simulated)
    await simulateImplementation(design);

    // 4. Testing
    const tests = await testWriterAgent.generateTests(design.components);
    expect(tests.coverage).toBeGreaterThanOrEqual(80);

    // 5. Code Review
    const review = await codeReviewerAgent.review(design.components);
    expect(review.criticalIssues).toBe(0);

    // 6. Security Audit
    const security = await securityAuditorAgent.audit(design.components);
    expect(security.vulnerabilities.high).toBe(0);

    // 7. Deployment
    const deployment = await devOpsAgent.deploy('staging');
    expect(deployment.success).toBe(true);
  });
});
```

**Butler Integration**:
```typescript
describe('Butler Integration with Hooks', () => {
  it('session-start loads correct agents', async () => {
    // Simulate yesterday's work pattern
    await knowledgeGraph.create({
      name: 'Yesterday Frontend Work',
      entityType: 'work_pattern',
      observations: ['Modified 5 .tsx files', 'Used React hooks']
    });

    // Run session-start
    await sessionStartHook();

    // Verify correct agents loaded
    expect(loadedAgents).toContain('ui-designer');
    expect(loadedAgents).toContain('test-writer');
  });

  it('post-tool-use triggers butler checkpoints', async () => {
    // Simulate significant change
    const toolData = {
      toolName: 'Edit',
      args: { file_path: 'src/api/auth.ts' }
    };

    // Multiple edits
    for (let i = 0; i < 5; i++) {
      await postToolUseHook(toolData);
    }

    // Verify checkpoint triggered
    expect(butler.lastCheckpoint).toBe(Checkpoint.SIGNIFICANT_CHANGE);
  });
});
```

### 7.3 E2E Validation

**Scenario 1: New Feature Development**
```gherkin
Given I start a new coding session
When I say "implement JWT authentication"
Then session-start should load security-auditor and architecture-agent
And I implement the feature
Then butler detects significant change
And butler analyzes security implications
When I commit the code
Then butler triggers code review
And butler checks test coverage
And butler validates no secrets in code
Then commit succeeds with summary
```

**Scenario 2: Bug Fix**
```gherkin
Given I have a failing test
When butler detects test failure
Then butler suggests potential causes
And I fix the bug
Then butler verifies test passes
And butler checks for regression
When I commit the fix
Then butler ensures bug is documented in Knowledge Graph
```

**Scenario 3: RAG-Enhanced Development**
```gherkin
Given RAG is enabled with valid OpenAI key
When I request "implement OAuth integration"
Then RAG retrieves past OAuth implementations
And RAG enhances context with best practices
Then architecture-agent designs with RAG context
And implementation follows learned patterns
```

### 7.4 Performance Metrics

**Response Time Targets**:
- Checkpoint detection: < 100ms
- Butler workflow (before-commit): < 5s
- Agent invocation: < 2s
- Knowledge Graph query: < 500ms

**Resource Usage**:
- Memory: < 500MB per agent
- CPU: < 50% during butler workflows
- Disk I/O: Minimal (only for file operations)

**Reliability**:
- Agent success rate: > 95%
- Butler checkpoint accuracy: > 90%
- Zero session crashes

---

## 8. Success Criteria

### 8.1 Technical Success

- ✅ All 12 essential agents implemented (5 real + 7 enhanced prompts)
- ✅ Development butler working with all checkpoints
- ✅ RAG agent (optional) integrated with ChromaDB
- ✅ All agents use MCP tools natively
- ✅ Knowledge Graph persistent learning working
- ✅ Hooks system enhanced (session-start, post-tool-use, stop)
- ✅ Zero-interruption automation (silent/notify/ask modes)
- ✅ All unit tests passing (>80% coverage)
- ✅ All integration tests passing
- ✅ Performance metrics met

### 8.2 User Experience Success

- ✅ Vibe coding flow maintained (fast iteration, no interruptions)
- ✅ Autonomous with explanation (agents explain decisions)
- ✅ Complete dev pipeline coverage (brainstorming → deployment)
- ✅ Optional RAG enhancement works seamlessly
- ✅ User can override/disable butler at any time
- ✅ Clear documentation and user guide
- ✅ Real value added vs V2.0 (measured by user feedback)

### 8.3 "Working Solutions Only" Validation

- ✅ No phantom features (everything implemented actually works)
- ✅ No over-engineering (5 real agents, not 22)
- ✅ Proven in practice (tested with real development workflows)
- ✅ Maintainable (clear code, good tests, complete docs)
- ✅ No time wasted on useless code (every line adds value)

---

## Appendix A: Migration from V2.0

**What Stays**:
- ✅ AgentRegistry core (proven)
- ✅ PromptEnhancer core (proven)
- ✅ 5 existing agents: rag, architecture, code-reviewer, refactoring, doc-writer
- ✅ Knowledge Graph integration
- ✅ Hooks system structure

**What Changes**:
- ✅ Add 7 new agents (test-writer, devops, pm, data-engineer, ui-designer, marketing, product, ml-engineer)
- ✅ Add development-butler (new core component)
- ✅ Enhance hooks with checkpoint detection
- ✅ RAG agent becomes optional (ChromaDB + OpenAI key required)

**What Gets Removed**:
- ❌ 17 unused agent implementations (kept as prompts only)
- ❌ Complex multi-agent coordination (not needed with butler)
- ❌ Over-engineered frameworks (keep it simple)

**Migration Steps**:
1. Backup V2.0 codebase
2. Update AgentRegistry with 12 essential agents
3. Implement development-butler
4. Enhance hooks
5. Test thoroughly
6. Deploy to staging
7. User validation
8. Deploy to production

---

## Appendix B: Open Questions & Decisions

**Q1: Should RAG agent be auto-enabled if OpenAI key is present?**
- Decision: No, make it explicit opt-in (`claude rag enable`)
- Reason: User should control when AI services are used

**Q2: Should butler checkpoints be configurable per-user?**
- Decision: Yes, user can customize via `~/.claude/butler-config.json`
- Reason: Different workflows need different automation levels

**Q3: How to handle butler failures?**
- Decision: Log error, notify user, continue workflow
- Reason: Never block user's work due to butler issues

**Q4: Should all agents have access to all MCP tools?**
- Decision: Yes, but with usage guidelines in prompts
- Reason: Flexibility + clear best practices

**Q5: What if existing RAG implementation is different from design?**
- Decision: Phase 4 will investigate and adapt design to reality
- Reason: Work with what exists, enhance incrementally

---

## Conclusion

Smart-Agents V2.1 is designed to enhance Claude Code's natural workflow with intelligent, event-driven automation while maintaining the proven prompt enhancement core. By focusing on 12 essential agents, implementing 5 strategically, and introducing the development-butler innovation, this design provides complete development pipeline coverage from brainstorming to production launch without the complexity of full multi-agent execution.

**Core Strengths**:
- ✅ **Working Solutions Only** - Built on proven V2.0 architecture
- ✅ **Balanced Approach** - Right mix of simplicity and intelligence
- ✅ **Event-Driven Butler** - Core innovation for zero-interruption automation
- ✅ **MCP-Native** - Seamless integration with Claude Code ecosystem
- ✅ **Complete Pipeline** - Technical + business + AI/ML agents
- ✅ **Vibe Coding Compatible** - Fast iteration, no workflow disruption

**Next Steps**:
1. Review and validate this design
2. Create detailed implementation plan with `superpowers:writing-plans` skill
3. Begin Phase 1: Core Infrastructure
4. Iterate and improve based on real-world usage

---

**Document Status**: ✅ Complete
**Next Action**: User validation and approval
**Implementation Start**: After approval
