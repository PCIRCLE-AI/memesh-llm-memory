# Agent Reference

## Real Implementation Agents (5)

### development-butler
**Classification**: Real Implementation
**MCP Tools**: filesystem, memory, bash
**Description**: Event-driven development automation with checkpoint detection

**Key Features**:
- Automatic checkpoint detection
- Workflow execution at logical points
- Zero-interruption assistance

**Usage**:
See [USER_GUIDE.md - Event-Driven Butler](./USER_GUIDE.md#event-driven-butler)

---

### test-writer
**Classification**: Real Implementation
**MCP Tools**: filesystem, memory, bash
**Description**: Automated test generation with TDD

**Key Features**:
- Generate Vitest-compatible tests
- Extract function signatures
- Edge case detection
- Knowledge Graph integration

**API**:
```typescript
class TestWriterAgent {
  analyzeCode(sourceCode: string): CodeAnalysis
  generateTests(filePath: string, sourceCode: string): Promise<string>
  writeTestFile(sourcePath: string): Promise<void>
}
```

---

### devops-engineer
**Classification**: Real Implementation
**MCP Tools**: filesystem, bash, github
**Description**: CI/CD and deployment automation

**Key Features**:
- Generate CI/CD configurations
- Analyze deployment readiness
- Setup GitHub Actions workflows
- Knowledge Graph tracking

**API**:
```typescript
class DevOpsEngineerAgent {
  generateCIConfig(options: CIConfigOptions): Promise<string>
  analyzeDeploymentReadiness(): Promise<DeploymentAnalysis>
  setupCI(options: CIConfigOptions): Promise<void>
}
```

---

### project-manager
**Classification**: Real Implementation
**MCP Tools**: filesystem, memory
**Description**: Task tracking and progress reporting

**Status**: To be implemented in Task 9

---

### data-engineer
**Classification**: Real Implementation
**MCP Tools**: filesystem, bash, memory
**Description**: Data pipeline and analytics automation

**Status**: To be implemented in Task 10

---

## Enhanced Prompt Agents (7)

### architecture-agent
**Classification**: Enhanced Prompt
**MCP Tools**: filesystem, memory, perplexity
**Description**: Architecture design with MCP-enhanced capabilities

### code-reviewer
**Classification**: Enhanced Prompt
**MCP Tools**: filesystem, memory, perplexity
**Description**: Code review with MCP-enhanced analysis

### security-auditor
**Classification**: Enhanced Prompt
**MCP Tools**: filesystem, memory, perplexity
**Description**: Security audit with MCP-enhanced detection

### ui-designer
**Classification**: Enhanced Prompt
**MCP Tools**: filesystem, memory, perplexity
**Description**: UI/UX design with MCP-enhanced recommendations

### marketing-strategist
**Classification**: Enhanced Prompt
**MCP Tools**: filesystem, memory, perplexity
**Description**: Marketing strategy with MCP-enhanced research

### product-manager
**Classification**: Enhanced Prompt
**MCP Tools**: filesystem, memory, perplexity
**Description**: Product management with MCP-enhanced planning

### ml-engineer
**Classification**: Enhanced Prompt
**MCP Tools**: filesystem, memory, perplexity
**Description**: ML engineering with MCP-enhanced insights

---

## Optional Feature Agent (1)

### rag-agent
**Classification**: Optional Feature
**MCP Tools**: filesystem, memory
**Required Dependencies**: chromadb, openai
**Description**: RAG-powered intelligent assistance

**Status**: Verify existing implementation (Phase 4)
