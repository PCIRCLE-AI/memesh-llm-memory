# E2E Test Suite

## Current Status: Planned (Not Yet Implemented)

⚠️ **Important**: The E2E tests described in this document are **planned** but **not yet implemented**. This directory currently contains only this README as a specification for future implementation.

## Existing E2E Coverage

The project currently has E2E integration test coverage through:

- **Evolution System E2E Test**: `tests/integration/evolution-e2e.test.ts`
  - 11 comprehensive tests covering the complete evolution system workflow
  - Tests router integration, performance tracking, learning progress, and adaptations
  - Validates all 22 agents are properly configured
  - **Status**: ✅ Implemented and passing

**Run existing E2E tests:**
```bash
npm test tests/integration/evolution-e2e.test.ts
```

## Planned E2E Test Suites

The following E2E test suites are documented as future implementation goals:

### 1. Voice RAG Tests (`voice-rag.spec.ts`) - PLANNED

**Planned Coverage:**
- Health check endpoint
- Document indexing and retrieval
- Voice query processing (audio upload → transcription → RAG → response → TTS)
- Error handling (missing audio, invalid formats)
- File size validation (10MB limit)
- MIME type validation (audio formats only)
- Rate limiting (10 requests/minute)
- Metrics tracking (costs, response times)

**Prerequisites (when implemented):**
- Voice RAG server running on port 3003
- OpenAI API key configured
- Anthropic API key configured

### 2. Collaboration Tests (`collaboration.spec.ts`) - PLANNED

**Planned Coverage:**
- Agent registration and management
- Team creation with capability matching
- Task decomposition into subtasks
- Load balancing across agents
- SQLite persistence and recovery
- Session history tracking
- Performance metrics
- High-volume concurrent tasks (20 tasks, 10 agents)

### 3. API Security Tests (`api-security.spec.ts`) - PLANNED

**Planned Coverage:**
- Rate limiting enforcement (API: 100/15min, Voice: 10/min, Auth: 5/min)
- Rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining, etc.)
- IP-based rate tracking
- File size validation (10MB limit)
- MIME type validation
- Multiple file rejection
- Input validation
- Error sanitization (production vs development)
- Security headers

## Implementation Roadmap

### Phase 1: Voice RAG E2E Tests
- [ ] Create `voice-rag.spec.ts`
- [ ] Implement health check tests
- [ ] Implement document indexing tests
- [ ] Implement voice query processing tests
- [ ] Implement error handling tests
- [ ] Implement rate limiting tests

### Phase 2: Collaboration E2E Tests
- [ ] Create `collaboration.spec.ts`
- [ ] Implement agent registration tests
- [ ] Implement team creation tests
- [ ] Implement task decomposition tests
- [ ] Implement load balancing tests
- [ ] Implement persistence tests

### Phase 3: API Security E2E Tests
- [ ] Create `api-security.spec.ts`
- [ ] Implement rate limiting tests
- [ ] Implement file validation tests
- [ ] Implement input validation tests
- [ ] Implement security header tests

## Configuration (Planned)

E2E tests will use a separate vitest configuration: `vitest.e2e.config.ts`

**Planned settings:**
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

## Test Structure (Planned)

```
tests/e2e/
├── voice-rag.spec.ts         # Voice RAG pipeline tests (PLANNED)
├── collaboration.spec.ts     # Multi-agent collaboration tests (PLANNED)
├── api-security.spec.ts      # API security and validation tests (PLANNED)
├── fixtures/                 # Test fixtures (audio files, etc.) (PLANNED)
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

## Contributing

When implementing E2E tests:

1. Follow the planned test structure above
2. Use the existing `evolution-e2e.test.ts` as a reference
3. Update this README to mark completed sections
4. Add test fixtures in `fixtures/` directory
5. Update package.json with appropriate test commands

## References

- [Vitest Documentation](https://vitest.dev/)
- [Express Testing Guide](https://expressjs.com/en/guide/testing.html)
- [Supertest](https://github.com/visionmedia/supertest) - HTTP assertion library
- [Smart Agents Architecture](../../docs/ARCHITECTURE.md)
- [Existing E2E Test](../integration/evolution-e2e.test.ts)
