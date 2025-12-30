# Agent Reference

**Version**: 2.2.0
**Last Updated**: 2025-12-31

This document provides comprehensive API and usage documentation for all 20 agents in the Smart Agents system.

---

## Table of Contents

### Real Implementation Agents
- [TestWriterAgent](#testwriteragent) ✨
- [DevOpsEngineerAgent](#devopsengineeragent) ✨
- [DevelopmentButlerAgent](#developmentbutleragent)
- [KnowledgeGraphAgent](#knowledgegraphagent)
- [RAGAgent](#ragagent) (Optional)

### Enhanced Prompt Agents
- [CodeReviewerAgent](#coderevieweragent)
- [DebuggerAgent](#debuggeragent)
- [RefactorerAgent](#refactoreragent)
- [APIDesignerAgent](#apidesigneragent)
- [ArchitectureAgent](#architectureagent)
- [ResearchAgent](#researchagent)
- [DataAnalystAgent](#dataanalystagent)
- [SecurityAuditorAgent](#securityauditoragent)
- [UIDesignerAgent](#uidesigneragent)
- [MarketingStrategistAgent](#marketingstrategistagent)
- [ProductManagerAgent](#productmanageragent)
- [MLEngineerAgent](#mlengineera gent)

### Optional Features
- [Knowledge Synthesis](#knowledge-synthesis)

---

## Real Implementation Agents

### TestWriterAgent ✨

**Classification**: Real Implementation  
**MCP Tools**: filesystem, memory, bash  
**File**: `src/agents/TestWriterAgent.ts`

**Description**: Automated test generation agent with code analysis and TDD workflow integration.

**API**:
```typescript
class TestWriterAgent {
  constructor(mcp: MCPToolInterface);

  /**
   * Analyze source code and extract functions
   * @param sourceCode - Source code to analyze
   * @returns Code analysis with functions, parameters, return types
   */
  analyzeCode(sourceCode: string): CodeAnalysis;

  /**
   * Generate test file content for source code
   * @param filePath - Path to source file
   * @param sourceCode - Source code content
   * @returns Generated test code (vitest format)
   */
  async generateTests(filePath: string, sourceCode: string): Promise<string>;

  /**
   * Write test file automatically (src/x.ts → tests/x.test.ts)
   * @param sourcePath - Path to source file
   */
  async writeTestFile(sourcePath: string): Promise<void>;
}

interface CodeAnalysis {
  moduleName: string;
  functions: FunctionInfo[];
}

interface FunctionInfo {
  name: string;
  params: string[];
  returnType: string;
  edgeCases: string[];
}
```

**Usage Examples**:
```typescript
// Example 1: Analyze code
const analysis = testWriter.analyzeCode(`
  export function validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
`);
console.log(analysis);
// {
//   moduleName: 'module',
//   functions: [{
//     name: 'validateEmail',
//     params: ['email'],
//     returnType: 'boolean',
//     edgeCases: ['null', 'undefined', 'empty string']
//   }]
// }

// Example 2: Generate tests
const testCode = await testWriter.generateTests(
  'src/utils/validation.ts',
  sourceCode
);

// Example 3: Write test file automatically
await testWriter.writeTestFile('src/utils/validation.ts');
// Creates: tests/utils/validation.test.ts
```

**MCP Tool Integration**:
```json
{
  "name": "test-writer",
  "description": "Test automation specialist, TDD expert, coverage analysis",
  "inputSchema": {
    "task_description": "string",
    "priority": "number (1-10, optional)"
  }
}
```

**Known Limitations**:
- Uses regex-based parsing (AST-based parser planned)
- Limited to exported functions
- Basic test templates only
- No mock generation

**Roadmap**:
- AST-based code parsing for production
- Advanced test generation (mocks, integration tests)
- Coverage analysis integration

---

### DevOpsEngineerAgent ✨

**Classification**: Real Implementation  
**MCP Tools**: filesystem, bash, github  
**File**: `src/agents/DevOpsEngineerAgent.ts`

**Description**: CI/CD pipeline generation and deployment readiness analysis agent.

**API**:
```typescript
class DevOpsEngineerAgent {
  constructor(mcp: MCPToolInterface);

  /**
   * Generate CI configuration YAML
   * @param options - CI configuration options
   * @returns CI config YAML string
   */
  async generateCIConfig(options: CIConfigOptions): Promise<string>;

  /**
   * Setup CI automatically (generate + write config file)
   * @param options - CI configuration options
   */
  async setupCI(options: CIConfigOptions): Promise<void>;

  /**
   * Analyze deployment readiness
   * @returns Deployment analysis with blockers
   */
  async analyzeDeploymentReadiness(): Promise<DeploymentAnalysis>;
}

interface CIConfigOptions {
  platform: 'github-actions' | 'gitlab-ci';
  testCommand: string;
  buildCommand: string;
}

interface DeploymentAnalysis {
  testsPass: boolean;
  buildSuccessful: boolean;
  noUncommittedChanges: boolean;
  readyToDeploy: boolean;
  blockers: string[];
}
```

**Usage Examples**:
```typescript
// Example 1: Generate GitHub Actions config
const githubConfig = await devops.generateCIConfig({
  platform: 'github-actions',
  testCommand: 'npm test',
  buildCommand: 'npm run build'
});

// Example 2: Setup CI automatically
await devops.setupCI({
  platform: 'github-actions',
  testCommand: 'npm test',
  buildCommand: 'npm run build'
});
// Creates: .github/workflows/ci.yml

// Example 3: Analyze deployment readiness
const analysis = await devops.analyzeDeploymentReadiness();
if (analysis.readyToDeploy) {
  console.log('Ready to deploy!');
} else {
  console.log('Blockers:', analysis.blockers);
}
```

**Generated CI Configurations**:

**GitHub Actions**:
```yaml
name: CI
on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
    - run: npm ci
    - run: npm test
    - run: npm run build
```

**GitLab CI**:
```yaml
image: node:18
stages:
  - test
  - build
cache:
  paths:
    - node_modules/
test:
  stage: test
  script:
    - npm ci
    - npm test
build:
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - dist/
```

**MCP Tool Integration**:
```json
{
  "name": "devops-engineer",
  "description": "DevOps, CI/CD, infrastructure automation, deployment expert",
  "inputSchema": {
    "task_description": "string",
    "priority": "number (1-10, optional)"
  }
}
```

**Known Limitations**:
- Deployment analysis uses mocked checks (TODO: integrate actual test runners)
- Limited to GitHub Actions and GitLab CI
- No Docker or cloud deployment support yet

**Roadmap**:
- Actual test runner integration (vitest, jest)
- Extended CI/CD support (CircleCI, Jenkins)
- Docker containerization
- Cloud deployment (AWS, GCP, Azure)

---

### DevelopmentButlerAgent

**Classification**: Real Implementation  
**MCP Tools**: filesystem, memory, bash  
**File**: `src/agents/DevelopmentButlerAgent.ts`

**Description**: Event-driven development automation with intelligent checkpoint detection.

**API**:
```typescript
class DevelopmentButlerAgent {
  constructor(mcp: MCPToolInterface);

  /**
   * Detect current workflow checkpoint
   * @param context - Current development context
   * @returns Detected checkpoint
   */
  async detectCheckpoint(context: CheckpointContext): Promise<WorkflowPhase>;

  /**
   * Get recommendations for current checkpoint
   * @param checkpoint - Current checkpoint
   * @returns Array of recommended actions
   */
  async getRecommendations(checkpoint: WorkflowPhase): Promise<string[]>;

  /**
   * Execute checkpoint-triggered actions
   * @param checkpoint - Current checkpoint
   */
  async executeCheckpointActions(checkpoint: WorkflowPhase): Promise<void>;
}

type WorkflowPhase = 'idle' | 'code-written' | 'test-complete' | 'commit-ready' | 'committed';

interface CheckpointContext {
  hasUncommittedChanges: boolean;
  hasTests: boolean;
  testsPassing: boolean;
  stagedFiles: string[];
}
```

**Usage Examples**:
```typescript
// Example 1: Detect checkpoint
const context = {
  hasUncommittedChanges: true,
  hasTests: false,
  testsPassing: false,
  stagedFiles: []
};
const checkpoint = await butler.detectCheckpoint(context);
console.log(checkpoint); // 'code-written'

// Example 2: Get recommendations
const recommendations = await butler.getRecommendations('code-written');
console.log(recommendations);
// [
//   'Use test-writer agent to generate tests',
//   'Run existing tests to verify no regressions',
//   'Review changes before testing'
// ]

// Example 3: Execute checkpoint actions
await butler.executeCheckpointActions('test-complete');
// Automatically suggests: Review changes, Prepare commit
```

**Checkpoint Detection Logic**:
```typescript
// Priority order (first match wins)
if (!hasUncommittedChanges) return 'committed';
if (stagedFiles.length > 0 && testsPassing) return 'commit-ready';
if (hasTests && testsPassing) return 'test-complete';
if (hasUncommittedChanges) return 'code-written';
return 'idle';
```

**Workflow Phases**:
- **idle**: No active work
- **code-written**: New code, tests needed
- **test-complete**: Tests passing, ready for commit
- **commit-ready**: Changes staged, commit message ready
- **committed**: Clean state, ready for next task

---

### KnowledgeGraphAgent

**Classification**: Real Implementation  
**MCP Tools**: memory (vectra), filesystem  
**File**: `src/agents/KnowledgeGraphAgent.ts`

**Description**: Structured knowledge management with entity-relationship modeling.

**API**:
```typescript
class KnowledgeGraphAgent {
  constructor(vectorDbPath: string);

  /**
   * Create entities in knowledge graph
   * @param entities - Array of entities to create
   */
  async createEntities(entities: Entity[]): Promise<void>;

  /**
   * Add observations to existing entities
   * @param observations - Entity observations
   */
  async addObservations(observations: Observation[]): Promise<void>;

  /**
   * Create relationships between entities
   * @param relations - Array of relations
   */
  async createRelations(relations: Relation[]): Promise<void>;

  /**
   * Search for entities
   * @param query - Search query
   * @returns Matching entities
   */
  async searchNodes(query: string): Promise<Entity[]>;

  /**
   * Get entity details
   * @param names - Entity names
   * @returns Entity details
   */
  async openNodes(names: string[]): Promise<Entity[]>;

  /**
   * Read entire knowledge graph
   * @returns All entities and relations
   */
  async readGraph(): Promise<KnowledgeGraph>;
}

interface Entity {
  name: string;
  entityType: string;
  observations: string[];
}

interface Observation {
  entityName: string;
  contents: string[];
}

interface Relation {
  from: string;
  to: string;
  relationType: string;
}

interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}
```

**Usage Examples**:
```typescript
// Example 1: Create entities
await kgAgent.createEntities([
  {
    name: 'User Authentication System',
    entityType: 'component',
    observations: [
      'Uses JWT for token-based authentication',
      'Implements OAuth 2.0 for third-party login',
      'Session timeout: 24 hours'
    ]
  }
]);

// Example 2: Create relationships
await kgAgent.createRelations([
  {
    from: 'API Gateway',
    to: 'User Authentication System',
    relationType: 'depends_on'
  },
  {
    from: 'User Service',
    to: 'User Authentication System',
    relationType: 'uses'
  }
]);

// Example 3: Search knowledge graph
const results = await kgAgent.searchNodes('authentication');
console.log(results);

// Example 4: Read entire graph
const graph = await kgAgent.readGraph();
console.log('Total entities:', graph.entities.length);
console.log('Total relations:', graph.relations.length);
```

---

### RAGAgent (Optional)

**Classification**: Optional Feature  
**MCP Tools**: memory (vectra), openai API  
**File**: `src/agents/rag/RAGAgent.ts`

**Description**: Semantic search and retrieval-augmented generation for context-aware responses.

**Prerequisites**: Requires OpenAI API key for embeddings.

**API**:
```typescript
class RAGAgent {
  constructor(config: RAGConfig);

  /**
   * Index a document for semantic search
   * @param document - Document to index
   */
  async indexDocument(document: Document): Promise<void>;

  /**
   * Search indexed documents
   * @param query - Search query (semantic)
   * @param options - Search options
   * @returns Relevant documents
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]>;

  /**
   * Generate response with retrieved context
   * @param query - User query
   * @param context - Retrieved context
   * @returns Generated response
   */
  async generate(query: string, context: string[]): Promise<string>;
}

interface RAGConfig {
  openaiApiKey: string;
  vectorDbPath?: string;
  embeddingModel?: string; // default: 'text-embedding-ada-002'
}

interface Document {
  content: string;
  metadata: Record<string, any>;
}

interface SearchOptions {
  topK?: number; // default: 5
  threshold?: number; // similarity threshold (0-1)
}

interface SearchResult {
  content: string;
  metadata: Record<string, any>;
  score: number; // similarity score (0-1)
}
```

**Usage Examples**:
```typescript
// Example 1: Index documents
await ragAgent.indexDocument({
  content: 'Authentication uses JWT tokens with 24-hour expiration.',
  metadata: { source: 'auth-docs', type: 'documentation' }
});

// Example 2: Semantic search
const results = await ragAgent.search('How does authentication work?', {
  topK: 3,
  threshold: 0.7
});
console.log(results);

// Example 3: RAG generation
const context = results.map(r => r.content);
const response = await ragAgent.generate(
  'Explain the authentication flow',
  context
);
console.log(response);
```

---

## Enhanced Prompt Agents

### CodeReviewerAgent

**Classification**: Enhanced Prompt  
**Domain**: Code Quality  

**Description**: Comprehensive code review with focus on security, performance, and best practices.

**When to Use**:
- Before committing significant code changes
- For security-sensitive code
- When implementing critical features
- Before creating pull requests

**Review Focus**:
- **Security**: SQL injection, XSS, authentication flaws
- **Performance**: Algorithm complexity, database queries, caching
- **Best Practices**: SOLID principles, DRY, error handling
- **Testing**: Coverage, edge cases, integration tests

---

### DebuggerAgent

**Classification**: Enhanced Prompt  
**Domain**: Issue Resolution  

**Description**: Systematic debugging with root cause analysis and 5-phase methodology.

**When to Use**:
- Complex bugs with unclear root cause
- Intermittent failures
- Performance issues
- System integration problems

**Debugging Phases**:
1. **Root Cause Investigation**: 5 Whys, evidence collection
2. **Pattern Analysis**: Find working examples, compare differences
3. **Hypothesis & Testing**: Minimal tests, one variable at a time
4. **Implementation**: Test-first, fix root cause
5. **Prevention**: Document lessons, add safeguards

---

### RefactorerAgent

**Classification**: Enhanced Prompt  
**Domain**: Code Improvement  

**Description**: Code refactoring with design patterns and maintainability focus.

**When to Use**:
- Code smells detected (duplicated code, long methods)
- Technical debt accumulation
- Preparing for feature additions
- Improving code maintainability

**Refactoring Patterns**:
- Extract Method / Class
- Replace Conditional with Polymorphism
- Introduce Parameter Object
- Replace Magic Numbers with Constants
- Simplify Complex Expressions

---

### APIDesignerAgent

**Classification**: Enhanced Prompt  
**Domain**: API Development  

**Description**: REST/GraphQL API design with comprehensive documentation.

**When to Use**:
- Designing new API endpoints
- API versioning
- GraphQL schema design
- API documentation creation

**Design Focus**:
- RESTful principles (resources, HTTP methods)
- Request/response structure
- Error handling and status codes
- Authentication and authorization
- Rate limiting and pagination

---

### ArchitectureAgent

**Classification**: Enhanced Prompt  
**Domain**: System Design  

**Description**: System architecture design with scalability and trade-off analysis.

**When to Use**:
- System design for new projects
- Scaling existing systems
- Microservices architecture
- Technology stack selection

**Architecture Patterns**:
- Microservices vs Monolith
- Event-Driven Architecture
- CQRS and Event Sourcing
- Layered Architecture
- Domain-Driven Design

---

### ResearchAgent

**Classification**: Enhanced Prompt  
**Domain**: Technical Investigation  

**Description**: Deep technical research and competitive analysis.

**When to Use**:
- Technology evaluation
- Competitive analysis
- Best practices research
- Academic/technical paper review

**Research Areas**:
- Technology comparisons
- Market trends
- Academic research
- Industry best practices

---

### DataAnalystAgent

**Classification**: Enhanced Prompt  
**Domain**: Data Insights  

**Description**: Statistical analysis and data visualization.

**When to Use**:
- Data exploration
- Statistical analysis
- Visualization design
- Performance metrics analysis

**Analysis Capabilities**:
- Descriptive statistics
- Hypothesis testing
- Correlation analysis
- Time series analysis
- Data visualization recommendations

---

### SecurityAuditorAgent

**Classification**: Enhanced Prompt  
**Domain**: Security & Compliance  

**Description**: Security vulnerability assessment and compliance auditing.

**When to Use**:
- Security audits
- Penetration testing preparation
- Compliance verification (GDPR, HIPAA)
- Threat modeling

**Security Focus**:
- OWASP Top 10
- Authentication and authorization
- Data encryption
- Input validation
- Dependency vulnerabilities

---

### UIDesignerAgent

**Classification**: Enhanced Prompt  
**Domain**: UI/UX Design  

**Description**: User interface and experience design with accessibility focus.

**When to Use**:
- UI component design
- Responsive design
- Accessibility improvements
- User flow optimization

**Design Focus**:
- Visual hierarchy
- Color theory and contrast
- Typography
- Responsive breakpoints
- WCAG accessibility compliance

---

### MarketingStrategistAgent

**Classification**: Enhanced Prompt  
**Domain**: Marketing Strategy  

**Description**: Brand positioning and growth hacking strategies.

**When to Use**:
- Product launches
- Marketing campaign planning
- Brand positioning
- Growth strategy

---

### ProductManagerAgent

**Classification**: Enhanced Prompt  
**Domain**: Product Strategy  

**Description**: User research and feature prioritization.

**When to Use**:
- Feature prioritization
- User research
- Product roadmap planning
- Requirements gathering

---

### MLEngineerAgent

**Classification**: Enhanced Prompt  
**Domain**: Machine Learning  

**Description**: Model training and ML pipeline engineering.

**When to Use**:
- ML model selection
- Training pipeline design
- Model evaluation
- Production deployment

---

## Optional Features

### Knowledge Synthesis

**Classification**: Optional Feature  
**Purpose**: Cross-agent learning and pattern extraction

**Description**: Synthesizes insights from multiple agent interactions to identify successful patterns and anti-patterns.

**When to Use**:
- After completing major features
- For continuous improvement
- To identify team patterns
- To optimize agent routing

**Capabilities**:
- Pattern extraction from agent interactions
- Success/failure analysis
- Recommendation improvement
- Agent routing optimization

---

## Agent Selection Guide

**Quick Reference**:

| Task Type | Primary Agent | Alternative Agents |
|-----------|--------------|-------------------|
| Writing tests | test-writer | - |
| Setting up CI/CD | devops-engineer | - |
| Code review | code-reviewer | refactorer |
| Bug fixing | debugger | - |
| API design | api-designer | architecture-agent |
| System architecture | architecture-agent | api-designer |
| Security audit | security-auditor | code-reviewer |
| UI design | ui-designer | - |
| Data analysis | data-analyst | - |
| Research | research-agent | - |
| Product planning | product-manager | - |
| Marketing | marketing-strategist | - |
| ML tasks | ml-engineer | data-analyst |

---

## Version History

- **v2.2.0** (2025-12-31): Added TestWriterAgent and DevOpsEngineerAgent (Phase 3)
- **v2.1.0** (2025-12-30): Added Workflow Guidance and Smart Planning (Phases 1-2)
- **v2.0.0** (2025-12-01): Enhanced Prompt Agents and Agent Classification
- **v1.0.0** (2025-11-01): Initial release with RAG and Knowledge Graph agents

---

**For more information, see [USER_GUIDE.md](./USER_GUIDE.md)**
