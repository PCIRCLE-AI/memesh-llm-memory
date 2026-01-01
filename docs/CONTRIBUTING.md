# Contributing to Claude Code Buddy

**Welcome! We're excited that you're interested in contributing to Claude Code Buddy (CCB).**

This document provides guidelines for contributing code, documentation, bug reports, and feature requests.

---

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Setup](#development-setup)
4. [Code Standards](#code-standards)
5. [Testing Requirements](#testing-requirements)
6. [Pull Request Process](#pull-request-process)
7. [Issue Guidelines](#issue-guidelines)
8. [Architecture Guidelines](#architecture-guidelines)

---

## Code of Conduct

### Our Pledge

We pledge to make participation in our project a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

### Our Standards

**Positive behavior**:
- Being respectful and inclusive
- Accepting constructive criticism gracefully
- Focusing on what's best for the community
- Showing empathy towards others

**Unacceptable behavior**:
- Harassment, trolling, or derogatory comments
- Personal or political attacks
- Publishing others' private information
- Any conduct inappropriate in a professional setting

### Enforcement

Project maintainers will remove, edit, or reject comments, commits, code, issues, and other contributions that violate this Code of Conduct. Report violations to: conduct@claude-code-buddy.dev

---

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** 18+ installed ([download](https://nodejs.org/))
- **npm** 9+ installed (comes with Node.js)
- **Git** installed and configured
- **Claude Code** installed (for testing MCP integration)
- **Familiarity** with TypeScript, MCP Protocol, and SQLite

### Where to Start

**Good first issues**:
- Look for issues labeled `good-first-issue`
- Documentation improvements
- Test coverage enhancements
- Bug fixes

**Areas needing help**:
- Additional agent implementations
- Evolution system improvements
- Performance optimizations
- Documentation updates
- Test coverage

---

## Development Setup

### 1. Fork and Clone

```bash
# Fork repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/claude-code-buddy.git
cd claude-code-buddy

# Add upstream remote
git remote add upstream https://github.com/PCIRCLE-AI/claude-code-buddy.git
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build Project

```bash
npm run build
```

### 4. Run Tests

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- tests/unit/Router.test.ts

# Run with coverage
npm run test:coverage

# Run E2E tests (resource-monitored)
npm run test:e2e:safe
```

### 5. Configure Development Environment

**Create `.env.development`**:

```bash
# Development configuration
NODE_ENV=development
LOG_LEVEL=debug
DATA_DIR=./data-dev
BACKUP_DIR=./backups-dev

# Optional: RAG development
# OPENAI_API_KEY=sk-...
# RAG_PROVIDER=ollama  # Use local Ollama for development
```

### 6. Start Development

```bash
# Watch mode (auto-rebuild on changes)
npm run dev

# Or manual build + test
npm run build
npm test
```

---

## Code Standards

### TypeScript Guidelines

**1. Type Safety**

```typescript
// ❌ Avoid 'any'
function process(data: any) {
  return data.value;
}

// ✅ Use specific types
interface TaskData {
  value: string;
}
function process(data: TaskData): string {
  return data.value;
}

// ✅ Use type guards
function isTaskData(data: unknown): data is TaskData {
  return typeof data === 'object' && data !== null && 'value' in data;
}
```

**2. Null Safety**

```typescript
// ❌ Assume non-null
const agent = registry.getAgent('code-reviewer');
console.log(agent.description);  // May crash

// ✅ Handle null/undefined
const agent = registry.getAgent('code-reviewer');
if (agent) {
  console.log(agent.description);
} else {
  console.log('Agent not found');
}

// ✅ Use optional chaining
console.log(agent?.description ?? 'Unknown');
```

**3. Async/Await**

```typescript
// ❌ Unhandled promise rejection
async function execute() {
  const result = await riskyOperation();
  return result;
}

// ✅ Proper error handling
async function execute(): Promise<Result> {
  try {
    const result = await riskyOperation();
    return result;
  } catch (error) {
    logError(error, { component: 'Execute', method: 'execute' });
    throw new OperationError('Execution failed', { cause: error });
  }
}
```

### Naming Conventions

**Files**:
- PascalCase for classes: `AgentRegistry.ts`
- camelCase for utilities: `errorHandler.ts`
- kebab-case for configs: `simple-config.ts`

**Variables and Functions**:
```typescript
// camelCase
const taskDescription = '...';
function analyzeTask() {}

// PascalCase for classes/interfaces
class TaskAnalyzer {}
interface TaskAnalysis {}

// UPPER_SNAKE_CASE for constants
const MAX_RETRIES = 3;
const DEFAULT_TIMEOUT = 5000;
```

**Interfaces vs Types**:
```typescript
// Use 'interface' for object shapes
interface AgentMetadata {
  name: string;
  description: string;
}

// Use 'type' for unions/intersections
type AgentType = 'code-reviewer' | 'debugger' | ...;
type Result<T> = Success<T> | Failure;
```

### Documentation Standards

**1. JSDoc Comments**

```typescript
/**
 * Analyze task to determine complexity and requirements
 *
 * Evaluates task description to identify:
 * - Complexity level (simple/medium/complex)
 * - Task type (code-review, debugging, etc.)
 * - Required agent capabilities
 * - Estimated token usage
 *
 * @param task - Task to analyze
 * @returns Detailed task analysis
 * @throws ValidationError if task description is empty
 *
 * @example
 * ```typescript
 * const analysis = await analyzer.analyzeTask({
 *   id: 'task-1',
 *   description: 'Review this code for security issues',
 * });
 * console.log(analysis.complexity); // 'medium'
 * ```
 */
async analyzeTask(task: Task): Promise<TaskAnalysis> {
  // Implementation
}
```

**2. Inline Comments**

```typescript
// ❌ Obvious comments
const count = items.length; // Get the length

// ✅ Explain WHY, not WHAT
// Use cached value to avoid expensive recomputation
const count = cache.get('itemCount') || items.length;

// ✅ Explain complex logic
// Calculate P95 duration (95th percentile) for timeout adjustment
// Sort durations and take value at 95% position
const p95Duration = durations.sort()[Math.floor(durations.length * 0.95)];
```

**3. README in Each Directory**

Each major directory should have a README.md explaining:
- Purpose of the directory
- Key files and their roles
- How components interact
- Usage examples

### Error Handling Standards

**Custom Error Classes**:

```typescript
// Extend base Error
export class ValidationError extends Error {
  constructor(
    message: string,
    public context: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Usage
throw new ValidationError('Invalid task description', {
  component: 'TaskAnalyzer',
  method: 'analyzeTask',
  providedValue: task.description,
  constraint: 'must be non-empty string',
});
```

**Error Logging**:

```typescript
import { logError } from './utils/errorHandler.js';

try {
  await riskyOperation();
} catch (error) {
  // Always log with context
  logError(error, {
    component: 'ComponentName',
    method: 'methodName',
    operation: 'what was being attempted',
    data: { additionalContext: 'value' },
  });

  // Then handle or rethrow
  throw new OperationError('Operation failed', { cause: error });
}
```

---

## Testing Requirements

### Test Coverage Requirements

**Minimum coverage**: 80% overall, 90% for critical components

**Coverage by component**:
- **Critical** (≥90%): Router, AgentRegistry, CostTracker, Evolution System
- **Important** (≥85%): Orchestrator, Handlers, Storage Layer
- **Standard** (≥80%): Utilities, Helpers

### Test Types

**1. Unit Tests**

Test individual components in isolation:

```typescript
// tests/unit/TaskAnalyzer.test.ts
import { describe, it, expect } from 'vitest';
import { TaskAnalyzer } from '../../src/orchestrator/TaskAnalyzer.js';

describe('TaskAnalyzer', () => {
  describe('analyzeTask', () => {
    it('should classify simple task correctly', async () => {
      const analyzer = new TaskAnalyzer();
      const analysis = await analyzer.analyzeTask({
        id: 'task-1',
        description: 'Format this JSON',
      });

      expect(analysis.complexity).toBe('simple');
      expect(analysis.estimatedTokens).toBeLessThan(1000);
    });

    it('should classify complex task correctly', async () => {
      const analyzer = new TaskAnalyzer();
      const analysis = await analyzer.analyzeTask({
        id: 'task-2',
        description: 'Design a scalable microservices architecture...',
      });

      expect(analysis.complexity).toBe('complex');
      expect(analysis.estimatedTokens).toBeGreaterThan(10000);
    });

    it('should throw ValidationError for empty description', async () => {
      const analyzer = new TaskAnalyzer();
      await expect(
        analyzer.analyzeTask({ id: 'task-3', description: '' })
      ).rejects.toThrow(ValidationError);
    });
  });
});
```

**2. Integration Tests**

Test component interactions:

```typescript
// tests/integration/Router.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Router } from '../../src/orchestrator/router.js';

describe('Router Integration', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
  });

  it('should route task through complete pipeline', async () => {
    const result = await router.routeTask({
      id: 'task-1',
      description: 'Review this code for security issues',
    });

    // Verify all pipeline components executed
    expect(result.analysis).toBeDefined();
    expect(result.routing).toBeDefined();
    expect(result.approved).toBe(true);

    // Verify correct agent selection
    expect(result.routing.selectedAgent).toBe('code-reviewer');
  });

  it('should apply evolution adaptations', async () => {
    // Simulate learning history
    const performanceTracker = router.getPerformanceTracker();
    for (let i = 0; i < 20; i++) {
      performanceTracker.track({
        agentId: 'code-reviewer',
        taskType: 'security-audit',
        success: true,
        duration: 1000,
        cost: 0.05,
        quality: 0.9,
      });
    }

    // Trigger pattern learning
    await router.getLearningManager().analyzePatterns('code-reviewer', 'security-audit');

    // Route task
    const result = await router.routeTask({
      id: 'task-2',
      description: 'Security audit this authentication code',
    });

    // Verify adaptations applied
    // (Check adapted config, applied patterns, etc.)
  });
});
```

**3. E2E Tests**

Test full workflows end-to-end:

```typescript
// tests/e2e/mcp-server.test.ts
import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';

describe('MCP Server E2E', () => {
  it('should handle task routing tool call', async () => {
    // Simulate MCP tool call
    const request = JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'sa_task',
        arguments: {
          taskDescription: 'Review this code',
        },
      },
    });

    // Call MCP server
    const response = execSync(
      `echo '${request}' | node dist/mcp/server.js`,
      { encoding: 'utf-8' }
    );

    const result = JSON.parse(response);

    // Verify response structure
    expect(result.result).toBeDefined();
    expect(result.result.content).toBeInstanceOf(Array);
    expect(result.result.content[0].type).toBe('text');
    expect(result.result.content[0].text).toContain('code-reviewer');
  });
});
```

**4. Regression Tests**

Prevent breaking changes:

```typescript
// tests/regression/api-compatibility.test.ts
import { describe, it, expect } from 'vitest';
import { Orchestrator } from '../../src/orchestrator/index.js';

describe('API Backward Compatibility', () => {
  it('should maintain v2.0 Orchestrator.executeTask API', async () => {
    const orchestrator = new Orchestrator();

    // v2.0 API signature
    const result = await orchestrator.executeTask({
      id: 'task-1',
      description: 'Test task',
    });

    // Verify response structure
    expect(result).toHaveProperty('task');
    expect(result).toHaveProperty('analysis');
    expect(result).toHaveProperty('routing');
    expect(result).toHaveProperty('response');
    expect(result).toHaveProperty('cost');
    expect(result).toHaveProperty('executionTimeMs');
  });
});
```

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm test tests/unit/

# Integration tests only
npm test tests/integration/

# E2E tests (safe mode)
npm run test:e2e:safe

# Watch mode (for TDD)
npm test -- --watch

# Coverage report
npm run test:coverage

# Update snapshots
npm test -- -u
```

### Test Requirements for PRs

**Before submitting PR**:
- ✅ All tests pass (`npm test`)
- ✅ Coverage ≥80% for new code
- ✅ No TypeScript errors (`npm run typecheck`)
- ✅ Code formatted (`npm run format`)
- ✅ Linter passes (`npm run lint`)

---

## Pull Request Process

### 1. Create Feature Branch

```bash
# Update main
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/my-awesome-feature

# Or bugfix branch
git checkout -b fix/issue-123
```

**Branch naming**:
- `feature/feature-name` - New features
- `fix/issue-number` - Bug fixes
- `docs/topic` - Documentation updates
- `refactor/component-name` - Code refactoring
- `test/component-name` - Test improvements

### 2. Make Changes

**Follow**:
- Code standards (above)
- Testing requirements (above)
- Commit message conventions (below)

**Commit message format**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding/updating tests
- `chore`: Build, dependencies, tooling

**Examples**:

```bash
# Feature
git commit -m "feat(agents): add ML engineer agent with model training capabilities

- Implemented MLEngineerAgent class
- Added model training workflow
- Integrated with KnowledgeGraph for pattern storage
- Added 15 unit tests (100% coverage)

Closes #45"

# Bug fix
git commit -m "fix(router): prevent budget overflow in cost calculation

Fixed integer overflow when calculating costs for large batches.
Now using BigInt for intermediate calculations.

Fixes #123"

# Documentation
git commit -m "docs(architecture): add component interaction diagrams

Added detailed diagrams for:
- MCP request lifecycle
- Evolution system data flow
- Knowledge Graph integration"
```

### 3. Push Changes

```bash
git push origin feature/my-awesome-feature
```

### 4. Create Pull Request

**On GitHub**:
1. Navigate to your fork
2. Click "Pull Request"
3. Select `main` as base branch
4. Fill out PR template (see below)
5. Submit PR

**PR Template**:

```markdown
## Description
<!-- Describe what this PR does -->

## Motivation
<!-- Why is this change needed? What problem does it solve? -->

## Changes
<!-- List key changes -->
- Change 1
- Change 2
- Change 3

## Testing
<!-- How was this tested? -->
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests pass locally
- [ ] Coverage ≥80% for new code
- [ ] No TypeScript errors
- [ ] Commits follow conventional commit format

## Screenshots (if applicable)
<!-- Add screenshots for UI changes -->

## Related Issues
<!-- Link to related issues -->
Closes #123
Related to #456
```

### 5. Code Review Process

**Reviewer checklist**:
- ✅ Code quality (follows standards)
- ✅ Test coverage (≥80%)
- ✅ Documentation (updated/added)
- ✅ Breaking changes (noted in CHANGELOG.md)
- ✅ Performance impact (considered)
- ✅ Security implications (reviewed)

**Addressing feedback**:
```bash
# Make requested changes
git add .
git commit -m "fix: address review feedback

- Improved error handling in TaskAnalyzer
- Added missing JSDoc comments
- Increased test coverage to 92%"

git push origin feature/my-awesome-feature
```

### 6. Merge

**Merge criteria**:
- ✅ All CI checks pass
- ✅ At least 1 approval from maintainer
- ✅ No merge conflicts
- ✅ Branch is up-to-date with main

**Merge methods**:
- **Squash and merge** (preferred for feature branches)
- **Rebase and merge** (for clean linear history)
- **Merge commit** (for large features with multiple logical commits)

---

## Issue Guidelines

### Reporting Bugs

**Use bug report template**:

```markdown
## Bug Description
<!-- Clear, concise description -->

## Steps to Reproduce
1. Step 1
2. Step 2
3. Step 3

## Expected Behavior
<!-- What should happen -->

## Actual Behavior
<!-- What actually happens -->

## Environment
- CCB Version: 2.0.0
- Node.js Version: 20.0.0
- OS: macOS 13.0
- Claude Code Version: 1.5.0

## Error Logs
```
<!-- Paste relevant logs -->
```

## Additional Context
<!-- Any other relevant information -->
```

### Feature Requests

**Use feature request template**:

```markdown
## Feature Description
<!-- Clear description of the feature -->

## Use Case
<!-- Why is this feature needed? -->

## Proposed Solution
<!-- How would you implement this? -->

## Alternatives Considered
<!-- What alternatives did you consider? -->

## Additional Context
<!-- Any other relevant information -->
```

---

## Architecture Guidelines

### Adding a New Agent

**See**: [Extension Points in ARCHITECTURE.md](./ARCHITECTURE.md#extension-points)

**Steps**:
1. Register in `AgentRegistry`
2. Define evolution config (optional)
3. Implement agent class (if real implementation)
4. Register MCP tool (automatic)
5. Write tests (≥90% coverage)
6. Update documentation

**Example**:

```typescript
// 1. src/core/AgentRegistry.ts
const newAgent: AgentMetadata = {
  name: 'ml-engineer',
  description: 'ML engineering, model training, ML pipeline expert',
  category: 'engineering',
  classification: AgentClassification.ENHANCED_PROMPT,
  capabilities: ['machine-learning', 'model-training', 'ml-pipeline'],
};

// 2. src/evolution/AgentEvolutionConfig.ts
AGENT_CONFIGS.set('ml-engineer', {
  agentId: 'ml-engineer',
  category: 'engineering',
  evolutionEnabled: true,
  // ...
});

// 3. src/agents/MLEngineerAgent.ts (if real implementation)
export class MLEngineerAgent {
  async execute(task: Task): Promise<AgentResponse> {
    // Implementation
  }
}

// 4. tests/agents/MLEngineerAgent.test.ts
describe('MLEngineerAgent', () => {
  it('should execute ML tasks', async () => {
    // Tests
  });
});
```

### Adding a New Adaptation Type

**See**: [Extension Points in ARCHITECTURE.md](./ARCHITECTURE.md#extension-points)

**Example**: Context window optimization

```typescript
// src/evolution/AdaptationEngine.ts
private applyContextOptimization(
  baseConfig: BaseExecutionConfig,
  pattern: Pattern
): BaseExecutionConfig {
  const params = pattern.action.parameters;
  return {
    ...baseConfig,
    contextWindow: params.optimalContextSize,
    contextCompressionRatio: params.compressionRatio,
  };
}

// Update adaptation dispatch
if (pattern.action.type === 'contextOptimization') {
  adaptedConfig = this.applyContextOptimization(adaptedConfig, pattern);
}

// Add to agent config
enabledAdaptations: [
  'promptOptimization',
  'modelSelection',
  'contextOptimization',  // New
],

// Tests
describe('AdaptationEngine', () => {
  it('should apply context optimization', () => {
    // Test implementation
  });
});
```

---

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 License.

---

## Questions?

- Open a [GitHub Discussion](https://github.com/PCIRCLE-AI/claude-code-buddy/discussions)
- Check [existing issues](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)
- Read the [documentation](./README.md)

**Thank you for contributing to Claude Code Buddy!** 🎉

---

**Version**: 2.0.0
**Last Updated**: 2026-01-01
**Maintainer**: Claude Code Buddy Team
