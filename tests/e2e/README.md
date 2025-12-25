# E2E Test Suite

Comprehensive end-to-end tests for the Smart Agents system.

## Overview

This test suite validates the complete system workflows across three critical areas:

1. **Voice RAG** - Voice interaction pipeline with transcription, retrieval, and synthesis
2. **Collaboration** - Multi-agent teamwork, task distribution, and persistence
3. **API Security** - Rate limiting, file validation, and security measures

## Test Coverage

### Voice RAG Tests (`voice-rag.spec.ts`)

**Coverage:**
- ✅ Health check endpoint
- ✅ Document indexing and retrieval
- ✅ Voice query processing (audio upload → transcription → RAG → response → TTS)
- ✅ Error handling (missing audio, invalid formats)
- ✅ File size validation (10MB limit)
- ✅ MIME type validation (audio formats only)
- ✅ Rate limiting (10 requests/minute)
- ✅ Metrics tracking (costs, response times)

**Prerequisites:**
- Voice RAG server running on port 3003
- OpenAI API key configured
- Anthropic API key configured

**Start server:**
```bash
npm run voice-rag:server
```

**Run tests:**
```bash
npm run test:e2e:voice-rag
```

### Collaboration Tests (`collaboration.spec.ts`)

**Coverage:**
- ✅ Agent registration and management
- ✅ Team creation with capability matching
- ✅ Task decomposition into subtasks
- ✅ Load balancing across agents
- ✅ SQLite persistence and recovery
- ✅ Session history tracking
- ✅ Performance metrics
- ✅ High-volume concurrent tasks (20 tasks, 10 agents)

**Prerequisites:**
- None (uses in-memory test database)

**Run tests:**
```bash
npm run test:e2e:collaboration
```

### API Security Tests (`api-security.spec.ts`)

**Coverage:**
- ✅ Rate limiting enforcement (API: 100/15min, Voice: 10/min, Auth: 5/min)
- ✅ Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, etc.)
- ✅ IP-based rate tracking
- ✅ File size validation (10MB limit)
- ✅ MIME type validation
- ✅ Multiple file rejection
- ✅ Input validation
- ✅ Error sanitization (production vs development)
- ✅ Security headers

**Prerequisites:**
- Voice RAG server running on port 3003

**Run tests:**
```bash
npm run test:e2e:security
```

## Running Tests

### Run All E2E Tests
```bash
npm run test:e2e
```

### Run Individual Test Suites
```bash
# Voice RAG tests
npm run test:e2e:voice-rag

# Collaboration tests
npm run test:e2e:collaboration

# API Security tests
npm run test:e2e:security
```

### Run Specific Test
```bash
npm run test:e2e -- --grep "should enforce rate limit"
```

### Run with Coverage
```bash
npm run test:e2e -- --coverage
```

## Configuration

E2E tests use a separate vitest configuration: `vitest.e2e.config.ts`

**Key settings:**
- `testTimeout: 60000` - 60 second timeout for long-running operations
- `hookTimeout: 30000` - 30 second timeout for setup/teardown
- `retry: 2` - Retry failed tests up to 2 times
- `maxThreads: 3` - Limit concurrent test execution

**Environment variables:**
```bash
# Voice RAG API endpoint
VOICE_RAG_API=http://localhost:3003

# Rate limit overrides
RATE_LIMIT_API_MAX=100      # API rate limit (requests per 15 min)
RATE_LIMIT_VOICE_MAX=10     # Voice rate limit (requests per min)
RATE_LIMIT_AUTH_MAX=5       # Auth rate limit (requests per min)
```

## Test Structure

```
tests/e2e/
├── voice-rag.spec.ts         # Voice RAG pipeline tests
├── collaboration.spec.ts     # Multi-agent collaboration tests
├── api-security.spec.ts      # API security and validation tests
├── fixtures/                 # Test fixtures (audio files, etc.)
└── README.md                 # This file
```

## Writing New E2E Tests

### Best Practices

1. **Use Descriptive Test Names**
   ```typescript
   it('should enforce voice endpoint rate limit (10 req/min)', async () => {
     // Test implementation
   });
   ```

2. **Set Appropriate Timeouts**
   ```typescript
   it('should process large batch', async () => {
     // Test implementation
   }, 30000); // 30 second timeout
   ```

3. **Clean Up Resources**
   ```typescript
   afterEach(async () => {
     await cleanup();
   });
   ```

4. **Use Test Databases**
   ```typescript
   const manager = new CollaborationManager(':memory:'); // In-memory DB
   ```

5. **Validate Status AND Response**
   ```typescript
   expect(response.status).toBe(200);
   expect(response.data).toMatchObject({ /* expected structure */ });
   ```

### Example Test

```typescript
describe('New Feature E2E Tests', () => {
  beforeAll(async () => {
    // Setup
  });

  afterAll(async () => {
    // Cleanup
  });

  it('should perform complete workflow', async () => {
    // Arrange
    const input = createTestInput();

    // Act
    const result = await performWorkflow(input);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
  });
});
```

## Troubleshooting

### Tests Fail with "Voice RAG server not available"

**Solution:** Start the Voice RAG server:
```bash
npm run voice-rag:server
```

### Tests Timeout

**Causes:**
- API keys not configured
- External services (OpenAI, Anthropic) are slow
- Network issues

**Solutions:**
- Check `.env` file has valid API keys
- Increase timeout in test file
- Run tests individually to isolate issues

### Rate Limit Tests Fail

**Cause:** Rate limit store not cleared between test runs

**Solution:** Tests include `clearRateLimits()` calls, but manual cleanup may be needed:
```typescript
import { clearRateLimits } from '../../src/middleware/rateLimiter.js';

beforeEach(() => {
  clearRateLimits();
});
```

### Database Lock Errors (Collaboration Tests)

**Cause:** Test database file conflicts

**Solution:** Tests use `:memory:` databases, but if using file-based DB:
```typescript
beforeEach(async () => {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm install

      - name: Start Voice RAG server
        run: npm run voice-rag:server &
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}

      - name: Wait for server
        run: npx wait-on http://localhost:3003/api/voice-rag/health

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
```

## Metrics

**Test Execution Times** (approximate):
- Voice RAG tests: ~2-5 minutes (depends on API latency)
- Collaboration tests: ~10-20 seconds
- API Security tests: ~30-60 seconds

**Total Coverage:**
- 50+ test cases
- 3 major system workflows
- Critical security validations
- Performance and stress tests

## Roadmap

**Future Enhancements:**
- [ ] Browser-based E2E tests with Playwright
- [ ] Cross-browser testing (Chrome, Firefox, Safari)
- [ ] Visual regression testing
- [ ] Performance benchmarking
- [ ] Load testing with k6
- [ ] Database migration tests
- [ ] Backup and restore tests
- [ ] Multi-region deployment tests

## References

- [Vitest Documentation](https://vitest.dev/)
- [Express Testing Guide](https://expressjs.com/en/guide/testing.html)
- [Supertest](https://github.com/visionmedia/supertest) - HTTP assertion library
- [Smart Agents Architecture](../../docs/ARCHITECTURE.md)
