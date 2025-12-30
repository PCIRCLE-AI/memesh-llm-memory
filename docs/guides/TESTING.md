# Smart Agents - Testing Guide

## 🧪 Testing Framework

This project uses **Vitest** as the testing framework, providing a fast, modern testing experience.

## 📋 Test Coverage

### ✅ Tested Modules

1. **Multi-Agent Collaboration Framework**
   - ✅ MessageBus - Message bus (point-to-point, broadcast, topic subscription)
   - ✅ CollaborationManager - Collaboration manager (agent registration, team creation, task execution)
   - ✅ TeamCoordinator - Team coordinator (internal tests in CollaborationManager)

2. **Agent Orchestrator**
   - ✅ TaskAnalyzer - Task analyzer
   - ✅ AgentRouter - Intelligent router
   - ✅ CostTracker - Cost tracker
   - ✅ Router - Complete routing workflow

3. **RAG Agent**
   - ⚠️ EmbeddingService - Embedding service (requires valid OpenAI API key)

## 🚀 Running Tests

### Run all tests
```bash
npm test
```

### Run specific test file
```bash
npm test -- src/collaboration/MessageBus.test.ts
npm test -- src/collaboration/CollaborationManager.test.ts
npm test -- src/orchestrator/orchestrator.test.ts
```

### Run with coverage report
```bash
npm run test:coverage
```

### Watch mode (for development)
```bash
npm test -- --watch
```

## ⚙️ Test Configuration

### Required Environment Variables

Tests require the following environment variables (in `.env` file):

```bash
# Required (Claude API)
ANTHROPIC_API_KEY=sk-ant-api03-xxxxx

# Optional (only needed for RAG tests)
OPENAI_API_KEY=sk-proj-xxxxx
```

**Note**: If API keys are not configured, some tests will fail, but core collaboration framework tests will still pass.

### Skip Tests Requiring API Keys

To skip tests that need API keys:

```bash
npm test -- --exclude=src/agents/rag/rag.test.ts
```

## 📊 Current Test Status

```
✅ 447 tests passing
❌ 0 tests failing (as of 2025-12-30)
```

## 🎯 Testing Best Practices

### 1. Mock External Dependencies

```typescript
import { vi } from 'vitest';

// Mock Agent implementation
class MockAgent implements CollaborativeAgent {
  async handleMessage(message: AgentMessage): Promise<AgentMessage> {
    return {
      id: uuidv4(),
      from: this.id,
      to: message.from,
      timestamp: new Date(),
      type: 'response',
      content: { result: 'Mock result' },
    };
  }
}
```

### 2. Use beforeEach to Clean Up State

```typescript
describe('MyTest', () => {
  let manager: CollaborationManager;

  beforeEach(async () => {
    manager = new CollaborationManager();
    await manager.initialize();
  });

  afterEach(async () => {
    await manager.shutdown();
  });
});
```

### 3. Test Asynchronous Operations

```typescript
it('should handle async operation', async () => {
  const session = await manager.executeTask(task);
  expect(session.results.success).toBe(true);
});
```

## 🔍 CI/CD Integration

Tests can be integrated into CI/CD pipeline:

```yaml
# .gitlab-ci.yml example
test:
  script:
    - npm install
    - npm run build
    - npm test
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

## 📈 Test Coverage Goals

- **Core Logic**: ≥ 80%
- **API Integration**: ≥ 60%
- **Overall Project**: ≥ 70%

## 🐛 Debugging Tests

### Using console.log
```typescript
it('should debug', () => {
  console.log('Debug info:', someVariable);
  expect(someVariable).toBe(expected);
});
```

### Using --reporter=verbose
```bash
npm test -- --reporter=verbose
```

### Run Specific Failing Test
```bash
npm test -- --grep="specific test name"
```

## ⚠️ E2E Test Resource Safety

> **📝 Note**: The E2E test suites described in this section (voice-rag, collaboration, api-security) are **planned features, not yet implemented**.
>
> **Currently implemented E2E tests**: `tests/integration/evolution-e2e.test.ts` (11 tests, passing)
>
> This section serves as a safety guide and best practices for future implementation.

### 🔴 Important: Prevent System Resource Exhaustion

E2E tests start real services (Express server, Vectra, WebSocket), consuming significant resources. **Improper configuration can cause system freeze**.

### Safe Configuration Principles

**1. Reasonable Concurrency**
```typescript
// vitest.e2e.config.ts
poolOptions: {
  threads: {
    singleThread: false,  // ✅ Allow parallelism
    maxThreads: 2,        // ✅ Limit to 2 parallel (not exceeding 50% of CPU cores)
  }
}
```

**2. Careful Retry Usage**
```typescript
retry: 1,  // ✅ Max 1 retry (handle network fluctuation)
```

**3. Use Resource Monitoring**
```bash
# ✅ Recommended: Use monitoring script
./scripts/test-monitor.sh npm run test:e2e

# ⚠️ Caution: Direct execution requires manual resource monitoring
npm run test:e2e
```

### Resource Limits

**test-monitor.sh automatic protection**:
- CPU limit: 70%
- Memory limit: 2GB
- Auto-terminate tests when limits exceeded

**Manual monitoring** (if not using script):
```bash
# Terminal 1: Run tests
npm run test:e2e

# Terminal 2: Monitor resources
watch -n 2 'ps aux | grep -E "(node|vitest)" | grep -v grep'
```

### Emergency Procedures

**When system freezes**:
```bash
# 1. Force kill all test processes
pkill -9 node

# 2. Check for remaining processes
ps aux | grep node

# 3. View resource usage logs
cat test-resource-monitor.log
tail -100 chroma.log
```

### Test Execution Best Practices

✅ **Recommended Practices**:
```bash
# Single test file (safest)
./scripts/test-monitor.sh npm run test:e2e:voice-rag

# Complete test suite (with monitoring)
./scripts/test-monitor.sh npm run test:e2e

# Development: watch mode (limit file count)
npm run test:e2e -- --watch tests/e2e/voice-rag.spec.ts
```

❌ **Avoid These Practices**:
```bash
# Don't: Multiple test suites in parallel
npm run test:e2e & npm run test:e2e:collaboration &  # ❌ Resource explosion

# Don't: Excessive concurrency
# vitest.config.ts: maxThreads: 5+  # ❌ Exceeds system capacity

# Don't: Too many retries
# vitest.config.ts: retry: 3+  # ❌ Request explosion
```

### Configuration Files

- `vitest.e2e.config.ts` - E2E test configuration
- `scripts/test-monitor.sh` - Resource monitoring script
- `.test-resource-limits.json` - Resource limit configuration
- `INCIDENT_REPORT_2025-12-26.md` - Freeze incident analysis

### Key Learnings

1. **More parallelism isn't always better** - Local resources are limited, 2-3 parallel is sufficient
2. **Retries can backfire** - Authentication failure + retry = request explosion
3. **Local services have costs** - Vectra, Express, WebSocket all consume resources
4. **Monitoring is necessary** - Prevention is better than recovery
5. **Know your system limits** - MacBook Pro M2: Powerful but not infinite

---

## 📚 More Resources

- [Vitest Official Documentation](https://vitest.dev/)
- [Test-Driven Development (TDD) Best Practices](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [Mocking Strategy Guide](https://vitest.dev/guide/mocking.html)
- [E2E Test Resource Management](./INCIDENT_REPORT_2025-12-26.md)
