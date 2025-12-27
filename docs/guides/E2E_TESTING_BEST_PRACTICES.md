# E2E Testing Best Practices - Comprehensive Guide

## 🎯 Overview

This guide consolidates learnings from the 2025-12-26 system freeze incident and industry best practices for E2E testing in resource-constrained environments.

**📝 Note**: Examples in this guide use ChromaDB for illustration purposes. **The Smart Agents project currently uses Vectra** (file-based, zero dependencies, no Docker required). See [RAG_DEPLOYMENT.md](./RAG_DEPLOYMENT.md) for our actual implementation.

---

## 📊 What We've Implemented (Current State)

### ✅ Immediate Fixes (Done)
- [x] Resource monitoring script (`test-monitor.sh`)
- [x] Balanced test configuration (maxThreads: 2, retry: 1)
- [x] Safe test scripts in package.json
- [x] Updated documentation (TESTING.md, INCIDENT_REPORT)
- [x] Updated CLAUDE.md, agent, and templates

### 🎯 What's Still Needed (Gaps)

---

## 🏗️ Architecture Best Practices

### 1. Test Environment Isolation

**Problem**: E2E tests share system resources, causing interference.

**Solutions**:

#### Option A: Docker Compose (Recommended)
```yaml
# docker-compose.test.yml
version: '3.8'
services:
  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8000:8000"
    environment:
      - IS_PERSISTENT=FALSE  # Use memory mode for tests
    mem_limit: 512m
    cpus: 0.5

  app:
    build: .
    depends_on:
      - chromadb
    environment:
      - NODE_ENV=test
      - CHROMA_URL=http://chromadb:8000
    mem_limit: 1024m
    cpus: 1.0
```

**Usage**:
```bash
# Start isolated test environment
docker-compose -f docker-compose.test.yml up -d

# Run tests
npm run test:e2e

# Cleanup
docker-compose -f docker-compose.test.yml down -v
```

**Benefits**:
- ✅ Resource limits enforced by Docker
- ✅ Isolated network
- ✅ Easy cleanup
- ✅ Reproducible environment

#### Option B: Separate Test Database
```typescript
// test-setup.ts
export async function setupTestEnvironment() {
  // Use in-memory ChromaDB for tests
  const client = new ChromaClient({
    path: ':memory:',  // No disk I/O
    maxCollections: 5,  // Limit collections
  });

  return client;
}
```

---

### 2. Service Startup and Health Checks

**Problem**: Tests start before services are ready, causing failures and retries.

**Solution**: Implement robust health checks

```typescript
// test/helpers/waitForService.ts
export async function waitForService(
  url: string,
  timeout: number = 30000,
  interval: number = 500
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${url}/health`);
      if (response.ok) {
        console.log(`✅ Service ready at ${url}`);
        return;
      }
    } catch (error) {
      // Service not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, interval));
  }

  throw new Error(`Service at ${url} not ready after ${timeout}ms`);
}

// In test setup
beforeAll(async () => {
  // Start services
  await startChromaDB();
  await startExpressServer();

  // Wait for health checks
  await waitForService('http://localhost:8000/api/v1/heartbeat');
  await waitForService('http://localhost:3003/health');
}, 60000);  // 60s timeout for startup
```

---

### 3. API Rate Limiting

**Problem**: Parallel tests can overwhelm API endpoints.

**Solution**: Implement rate limiting at API level

```typescript
// src/middleware/rateLimiter.ts
import rateLimit from 'express-rate-limit';

export const testRateLimiter = rateLimit({
  windowMs: 1000,  // 1 second window
  max: process.env.NODE_ENV === 'test' ? 10 : 100,  // 10 req/s in tests
  message: 'Too many requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply to routes
app.use('/api/v1', testRateLimiter);
```

**Benefits**:
- ✅ Prevents request explosion
- ✅ Protects downstream services (ChromaDB)
- ✅ Fails fast with clear error message

---

### 4. Circuit Breaker Pattern

**Problem**: Cascading failures when external services fail.

**Solution**: Implement circuit breaker

```typescript
// src/utils/circuitBreaker.ts
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000  // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      console.warn(`Circuit breaker opened after ${this.failures} failures`);
    }
  }
}

// Usage
const chromaBreaker = new CircuitBreaker();

export async function queryChroma(query: string) {
  return chromaBreaker.execute(async () => {
    return await chromaClient.query({ queryTexts: [query] });
  });
}
```

---

### 5. Test Data Management

**Problem**: Tests interfere with each other's data.

**Solutions**:

#### A. Isolated Collections per Test
```typescript
import { v4 as uuidv4 } from 'uuid';

describe('RAG Tests', () => {
  let collectionName: string;

  beforeEach(async () => {
    // Unique collection per test
    collectionName = `test-${uuidv4()}`;
    await chromaClient.createCollection({ name: collectionName });
  });

  afterEach(async () => {
    // Cleanup
    await chromaClient.deleteCollection({ name: collectionName });
  });
});
```

#### B. Test Fixtures with Cleanup
```typescript
// test/fixtures/testData.ts
export class TestDataManager {
  private createdResources: Array<{ type: string; id: string }> = [];

  async createTestUser() {
    const user = await api.post('/users', { name: 'Test User' });
    this.createdResources.push({ type: 'user', id: user.id });
    return user;
  }

  async cleanup() {
    for (const resource of this.createdResources.reverse()) {
      try {
        await api.delete(`/${resource.type}s/${resource.id}`);
      } catch (error) {
        console.warn(`Failed to cleanup ${resource.type}:${resource.id}`);
      }
    }
    this.createdResources = [];
  }
}

// In tests
let testData: TestDataManager;

beforeEach(() => {
  testData = new TestDataManager();
});

afterEach(async () => {
  await testData.cleanup();
});
```

---

### 6. Authentication Fix

**Problem**: Tests failing with 403 Forbidden (from incident logs).

**Investigation Steps**:
```bash
# 1. Check test token configuration
grep -r "token" tests/e2e/*.spec.ts

# 2. Verify token generation
node -e "
  const jwt = require('jsonwebtoken');
  const token = jwt.sign(
    { sub: 'test-user', email: 'test@example.com' },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
  console.log(token);
"

# 3. Test token against API
curl -H "Authorization: Bearer <token>" http://localhost:3003/api/v1/heartbeat
```

**Solution**: Use valid test tokens
```typescript
// test/helpers/auth.ts
import jwt from 'jsonwebtoken';

export function generateTestToken(userId: string = 'test-user-123') {
  return jwt.sign(
    {
      sub: userId,
      email: 'test@example.com',
      name: 'Test User',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,  // 1 hour
    },
    process.env.JWT_SECRET || 'test-secret'
  );
}

// In tests
const validToken = generateTestToken();
const response = await fetch(url, {
  headers: { Authorization: `Bearer ${validToken}` }
});
```

---

### 7. Test Timeouts Configuration

**Problem**: Tests hang indefinitely on failures.

**Solution**: Progressive timeout strategy
```typescript
// vitest.e2e.config.ts
export default defineConfig({
  test: {
    // Global timeouts
    testTimeout: 30000,       // 30s per test
    hookTimeout: 10000,       // 10s for before/after hooks

    // Teardown timeout
    teardownTimeout: 5000,    // 5s for cleanup

    // Per-test override example
    // it('slow test', async () => { ... }, 60000);
  },
});
```

**Timeout hierarchy**:
```
├─ setupFiles: 10s        (import dependencies)
├─ beforeAll: 30s         (start services, wait for health)
├─ beforeEach: 5s         (create test data)
├─ test: 30s              (actual test)
├─ afterEach: 5s          (cleanup test data)
└─ afterAll: 10s          (shutdown services)
```

---

### 8. Cleanup Scripts

**Problem**: Orphaned processes and data after failed tests.

**Solution**: Comprehensive cleanup script

```bash
#!/bin/bash
# scripts/test-cleanup.sh

echo "🧹 Cleaning up test environment..."

# 1. Kill orphaned processes
echo "Killing test processes..."
pkill -f "vitest.*e2e"
pkill -f "tsx.*test"
pkill -f "node.*test"

# 2. Stop Docker containers
echo "Stopping Docker test containers..."
docker-compose -f docker-compose.test.yml down -v 2>/dev/null || true

# 3. Clean test databases
echo "Cleaning test databases..."
rm -rf chroma_data_test/ 2>/dev/null || true
rm -rf test-*.db 2>/dev/null || true

# 4. Clear test logs
echo "Clearing test logs..."
rm -f test-resource-monitor.log
rm -f chroma-test.log

# 5. Verify cleanup
echo "Verifying cleanup..."
ps aux | grep -E "(vitest|tsx|node)" | grep test || echo "✅ No test processes running"

echo "✅ Cleanup complete!"
```

**Usage**:
```json
{
  "scripts": {
    "test:cleanup": "./scripts/test-cleanup.sh",
    "pretest:e2e": "npm run test:cleanup",    // Auto-cleanup before tests
    "posttest:e2e": "npm run test:cleanup"    // Auto-cleanup after tests
  }
}
```

---

### 9. Pre-Test Checklist

**Create automated pre-flight checks**:

```bash
#!/bin/bash
# scripts/pre-test-check.sh

echo "🔍 Pre-test environment check..."

# 1. Check system resources
CPU_USAGE=$(ps aux | awk '{sum+=$3} END {print sum}')
if (( $(echo "$CPU_USAGE > 50" | bc -l) )); then
  echo "⚠️ Warning: CPU usage is ${CPU_USAGE}% (should be < 50%)"
  echo "Current processes:"
  ps aux | sort -rk 3 | head -5
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

# 2. Check required services
echo "Checking required services..."
if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found - some tests may fail"
fi

# 3. Check environment variables
echo "Checking environment variables..."
required_vars=("ANTHROPIC_API_KEY" "OPENAI_API_KEY")
for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "⚠️ Warning: $var not set"
  fi
done

# 4. Check disk space
DISK_AVAIL=$(df -h . | awk 'NR==2 {print $4}')
echo "Available disk space: $DISK_AVAIL"

# 5. Check for orphaned processes
ORPHANED=$(ps aux | grep -E "(vitest|chromadb)" | grep -v grep | wc -l)
if [ "$ORPHANED" -gt 0 ]; then
  echo "⚠️ Warning: Found $ORPHANED orphaned test processes"
  echo "Run 'npm run test:cleanup' first"
  exit 1
fi

echo "✅ Pre-test checks passed!"
```

---

### 10. Monitoring Dashboard (Optional)

**For continuous monitoring**:

```typescript
// test/utils/monitor.ts
import { EventEmitter } from 'events';

export class TestMonitor extends EventEmitter {
  private metrics = {
    testsRun: 0,
    testsPassed: 0,
    testsFailed: 0,
    avgDuration: 0,
    peakCPU: 0,
    peakMemory: 0,
  };

  recordTest(result: TestResult) {
    this.metrics.testsRun++;
    if (result.passed) this.metrics.testsPassed++;
    else this.metrics.testsFailed++;

    this.updateMetrics(result);
    this.emit('test-complete', result);
  }

  private updateMetrics(result: TestResult) {
    const { cpu, memory } = result.resourceUsage;
    this.metrics.peakCPU = Math.max(this.metrics.peakCPU, cpu);
    this.metrics.peakMemory = Math.max(this.metrics.peakMemory, memory);
  }

  getReport() {
    return {
      ...this.metrics,
      successRate: (this.metrics.testsPassed / this.metrics.testsRun) * 100,
    };
  }
}
```

---

## 📋 Complete Implementation Checklist

### Phase 1: Immediate (Done ✅)
- [x] Resource monitoring script
- [x] Balanced test configuration
- [x] Safe test scripts
- [x] Documentation updates

### Phase 2: Short-term (Recommended)
- [ ] Fix authentication issues (investigate 403s)
- [ ] Implement service health checks
- [ ] Add pre-test checklist script
- [ ] Create cleanup scripts
- [ ] Add API rate limiting

### Phase 3: Medium-term (Optional but Recommended)
- [ ] Docker Compose test environment
- [ ] Circuit breaker implementation
- [ ] Test data manager
- [ ] Progressive timeout strategy

### Phase 4: Long-term (Advanced)
- [ ] Monitoring dashboard
- [ ] Distributed tracing
- [ ] Performance benchmarking
- [ ] Test flakiness detection

---

## 🎯 Recommended Priority Actions

### For Small Teams / Solo Developers:
1. ✅ Use resource monitoring (DONE)
2. ✅ Balanced configuration (DONE)
3. 🔄 Fix auth issues (TODO)
4. 🔄 Add cleanup scripts (TODO)
5. 🔄 Implement health checks (TODO)

### For Larger Teams:
1. ✅ All of the above
2. Docker Compose isolation
3. CI/CD integration
4. Monitoring dashboard
5. Automated alerting

---

## 💡 Key Principles

1. **Defense in Depth**: Multiple layers of protection
2. **Fail Fast**: Detect issues early, fail cleanly
3. **Graceful Degradation**: Circuit breakers, rate limiting
4. **Observability**: Logging, monitoring, metrics
5. **Reproducibility**: Isolated environments, fixtures
6. **Maintainability**: Clear documentation, automation

---

## 📚 Additional Resources

- [Martin Fowler - Testing Strategies](https://martinfowler.com/testing/)
- [Google Testing Blog](https://testing.googleblog.com/)
- [Vitest Best Practices](https://vitest.dev/guide/best-practices.html)
- [Docker Compose for Testing](https://docs.docker.com/compose/testing/)

---

*Last Updated: 2025-12-26*
*Incident Reference: INCIDENT_REPORT_2025-12-26.md*
