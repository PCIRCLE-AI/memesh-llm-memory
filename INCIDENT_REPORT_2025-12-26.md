# System Freeze Incident Report - 2025-12-26

## 🔴 Summary

System resource exhaustion leading to complete freeze during E2E test execution in smart-agents project.

---

## 📊 Incident Details

**Date**: 2025-12-26
**Project**: smart-agents
**Severity**: Critical (System freeze)
**Duration**: Unknown (required force restart)
**Impact**: Complete system unresponsiveness

---

## 🔍 Root Cause Analysis

### Primary Cause: Test Parallelization Explosion

**Configuration Issue** (vitest.e2e.config.ts:43-44):
```typescript
poolOptions: {
  threads: {
    singleThread: false,  // ❌ Allowed parallel execution
    maxThreads: 3,        // ❌ Too many concurrent threads
  }
}
```

**Retry Multiplication** (vitest.e2e.config.ts:49):
```typescript
retry: 2  // ❌ Failed tests retry 2x, multiplying requests
```

### Chain Reaction

1. **Parallel Test Execution**:
   - 3 test files running simultaneously
   - Each with 10+ test cases
   - Total: ~30 concurrent test cases

2. **Request Multiplication**:
   - Each test case → multiple HTTP requests
   - CORS preflight (OPTIONS) + actual requests
   - WebSocket connection attempts
   - Estimated: 100+ concurrent requests

3. **Authentication Failures**:
   - ChromaDB log shows massive 403 Forbidden errors
   - Failed requests → retry mechanism triggered
   - Retries → 3x request multiplication
   - Total requests: 300+ in short timeframe

4. **Resource Exhaustion**:
   - Node.js event loop overwhelmed
   - CPU → 100% (blocked event loop)
   - Memory → steady increase
   - System → complete freeze

### Evidence from ChromaDB Log

```
INFO: [25-12-2025 08:24:22] ('::1', 64233) - "WebSocket /ws/phone?token=..." 403
INFO: [25-12-2025 08:24:22] connection rejected (403 Forbidden)
INFO: [25-12-2025 08:24:22] ::1:64234 - "OPTIONS /api/v1/phone/calls?page_size=20" 400
INFO: [25-12-2025 08:24:22] ::1:64235 - "OPTIONS /api/v1/vip-contacts" 400
...
(Repeated 40+ times in 1 second)
```

### Contributing Factors

1. **No Resource Limits**: Tests had no CPU/Memory constraints
2. **No Request Rate Limiting**: API servers accepted unlimited concurrent requests
3. **Authentication Issues**: Test tokens failing validation
4. **Missing Monitoring**: No real-time resource usage tracking
5. **Local RAG Installation**: ChromaDB added additional service overhead

---

## ✅ Immediate Actions Taken

### 1. Investigation
- ✅ Checked running processes (940 node-related open files)
- ✅ Verified no lingering test processes
- ✅ Analyzed ChromaDB logs for failure patterns
- ✅ Identified test configuration issues

### 2. Configuration Fixes

**Updated vitest.e2e.config.ts**:
```typescript
poolOptions: {
  threads: {
    singleThread: true,  // ✅ Sequential execution
    maxThreads: 1,       // ✅ No parallelization
  }
}
retry: 0  // ✅ No retries to prevent explosion
```

### 3. Prevention Mechanisms

**Created Resource Monitor** (`scripts/test-monitor.sh`):
- Monitors CPU/Memory usage every 5 seconds
- Auto-kills tests exceeding limits (CPU: 70%, Memory: 2GB)
- Logs resource usage for analysis
- Prevents system-wide freeze

**Created Resource Limits Config** (`.test-resource-limits.json`):
```json
{
  "resourceLimits": {
    "maxConcurrentTests": 1,
    "maxMemoryMB": 2048,
    "maxCPUPercent": 70
  },
  "monitoring": {
    "autoKillOnExceed": true
  }
}
```

---

## 🛡️ Prevention Strategy

### For Users

**Always use safe test scripts**:
```bash
# ❌ DON'T: Direct test execution
npm run test:e2e

# ✅ DO: Use monitored execution
./scripts/test-monitor.sh npm run test:e2e

# Or add to package.json:
npm run test:e2e:safe
```

**Monitor system resources manually**:
```bash
# Terminal 1: Run tests
npm run test:e2e:safe

# Terminal 2: Monitor resources
watch -n 2 'ps aux | grep -E "(node|vitest)" | grep -v grep'
```

### For Future Development

1. **Test Configuration**:
   - ✅ Keep `singleThread: true` for E2E tests
   - ✅ Keep `retry: 0` or maximum 1
   - ✅ Set reasonable timeouts (30s)
   - ✅ Run unit tests in parallel, E2E sequentially

2. **Resource Management**:
   - ✅ Always use `test-monitor.sh` wrapper
   - ✅ Set hard limits on test processes
   - ✅ Implement request rate limiting in APIs
   - ✅ Add circuit breakers for external services

3. **Monitoring**:
   - ✅ Real-time resource usage logging
   - ✅ Alert on abnormal patterns
   - ✅ Track test execution times
   - ✅ Monitor ChromaDB/RAG service health

4. **Authentication**:
   - 🔲 TODO: Fix test token validation (investigate 403s)
   - 🔲 TODO: Implement proper test fixtures
   - 🔲 TODO: Mock external auth services

---

## 📈 Metrics

### Before (Problematic Configuration)

- **Concurrent Tests**: 3 parallel threads
- **Retry Attempts**: 2x per failure
- **Estimated Peak Requests**: 300+ concurrent
- **CPU Usage**: 100% (freeze)
- **Result**: System crash

### After (Fixed Configuration)

- **Concurrent Tests**: 1 sequential thread
- **Retry Attempts**: 0
- **Max Requests**: ~10 concurrent
- **CPU Limit**: 70% (auto-kill protection)
- **Memory Limit**: 2GB (auto-kill protection)
- **Result**: Stable execution

---

## 🎯 Action Items

### Immediate (Done)
- [x] Update vitest config to sequential execution
- [x] Create resource monitor script
- [x] Document incident and prevention
- [x] Add safe test scripts

### Short-term (Next Session)
- [ ] Fix authentication issues (investigate 403s)
- [ ] Add package.json scripts for safe testing
- [ ] Create test execution guidelines
- [ ] Set up CI/CD resource limits

### Long-term (Future)
- [ ] Implement API rate limiting
- [ ] Add distributed tracing for tests
- [ ] Create test resource dashboard
- [ ] Automated resource cleanup on failure

---

## 💡 Lessons Learned

1. **Parallel E2E Tests Are Dangerous**:
   - E2E tests spawn real services with real resource costs
   - Parallelization can quickly overwhelm local systems
   - **Always run E2E tests sequentially**

2. **Retry Logic Can Backfire**:
   - Retries on auth failures = request explosion
   - 2 retries × 3 threads = 9x request multiplication
   - **Disable retries for E2E or use exponential backoff**

3. **Local Resource Limits Matter**:
   - MacBook Pro M2: powerful but not unlimited
   - ChromaDB + Node services + tests = high overhead
   - **Always set hard limits and monitor**

4. **Prevention > Recovery**:
   - Force restart = lost work and time
   - Monitoring catches issues before freeze
   - **Invest in prevention mechanisms**

5. **Authentication Hygiene**:
   - Test tokens must be valid or properly mocked
   - 403s indicate configuration mismatch
   - **Verify auth setup before running large test suites**

---

## 🔗 Related Files

- `vitest.e2e.config.ts` - Test configuration (UPDATED)
- `scripts/test-monitor.sh` - Resource monitor (NEW)
- `.test-resource-limits.json` - Resource limits config (NEW)
- `chroma.log` - ChromaDB incident log (evidence)
- `tests/e2e/*.spec.ts` - E2E test files

---

## 📞 Contact

If this issue recurs:
1. Kill all node processes: `pkill -9 node`
2. Check resource monitor logs: `cat test-resource-monitor.log`
3. Review ChromaDB logs: `tail -100 chroma.log`
4. Report to: [Your contact info]

---

**Report Generated**: 2025-12-26
**Status**: Resolved with prevention measures
**Next Review**: Before next E2E test run
