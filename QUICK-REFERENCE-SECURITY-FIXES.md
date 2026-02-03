# Quick Reference: Security & Quality Fixes

## 🚀 Quick Start

### For Developers Using the Codebase

**Import safe math everywhere**:
```typescript
import { safeParseInt, safeParseFloat, safeDivide } from './utils/safeMath.js';

// ❌ DON'T
const port = parseInt(process.env.PORT);
const usage = used / total;

// ✅ DO
const port = safeParseInt(process.env.PORT, 3000, 1024, 65535);
const usage = safeDivide(used, total, 0);
```

### For API Server Setup

**Enable all protections** (add to `A2AServer.ts`):
```typescript
import { csrfProtection, csrfTokenMiddleware } from './middleware/csrf.js';
import { resourceProtectionMiddleware } from './middleware/resourceProtection.js';

// In createApp():
app.use(resourceProtectionMiddleware());  // First!

// Public routes get CSRF token:
app.get('/a2a/agent-card', csrfTokenMiddleware, handler);

// Protected routes validate CSRF token:
app.post('/a2a/send-message',
  authenticateToken,
  csrfProtection,         // Add this
  rateLimitMiddleware,
  handler
);
```

---

## 🛡️ Security Quick Reference

### CSRF Protection
**When to use**: All state-changing endpoints (POST, PUT, DELETE, PATCH)

```typescript
// Generate token (on public/GET endpoints):
import { csrfTokenMiddleware } from './middleware/csrf.js';
app.get('/endpoint', csrfTokenMiddleware, handler);

// Validate token (on POST/PUT/DELETE):
import { csrfProtection } from './middleware/csrf.js';
app.post('/endpoint', csrfProtection, handler);

// Client sends token in header:
fetch('/api/endpoint', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': tokenFromCookie,
  },
});
```

### Resource Protection
**When to use**: All API servers exposed to untrusted clients

```typescript
import { resourceProtectionMiddleware } from './middleware/resourceProtection.js';

// Apply to entire app:
app.use(resourceProtectionMiddleware());

// Or apply individually:
app.use(connectionLimitMiddleware());
app.use(payloadSizeLimitMiddleware());
app.use(memoryPressureMiddleware());
```

**Environment variables**:
```bash
A2A_MAX_CONNECTIONS_PER_IP=10      # Default: 10
A2A_MAX_PAYLOAD_SIZE_MB=10         # Default: 10MB
A2A_REQUEST_TIMEOUT_MS=30000       # Default: 30s
```

---

## 🔧 Safe Math Quick Reference

### Parsing Numbers
```typescript
import { safeParseInt, safeParseFloat } from './utils/safeMath.js';

// Parse with defaults and bounds:
const port = safeParseInt(env.PORT, 3000, 1024, 65535);
const budget = safeParseFloat(env.BUDGET, 50, 0, 10000);
const threads = safeParseInt(env.THREADS, 4, 1, 16);
```

### Division
```typescript
import { safeDivide } from './utils/safeMath.js';

// Safe division (no NaN, no Infinity):
const percent = safeDivide(used, total, 0) * 100;
const avg = safeDivide(sum, count, 0);
const ratio = safeDivide(a, b, 1.0);
```

### Multiplication & Addition
```typescript
import { safeMultiply, safeAdd } from './utils/safeMath.js';

// Safe with overflow protection:
const bytes = safeMultiply(mb, 1024 * 1024);
const total = safeAdd(a, b, maxValue);
```

### Percentages
```typescript
import { safePercentage } from './utils/safeMath.js';

// Calculate percentage (0-100):
const usage = safePercentage(used, total);        // → 75.50
const progress = safePercentage(done, total, 0); // → 50
```

### Clamping
```typescript
import { clamp } from './utils/safeMath.js';

// Clamp to valid range:
const threads = clamp(userInput, 1, 16);
const percent = clamp(value, 0, 100);
```

### Unit Conversion
```typescript
import { bytesToMB, mbToBytes } from './utils/safeMath.js';

// Safe conversions:
const mb = bytesToMB(bytes);           // → 1.50
const bytes = mbToBytes(1.5);          // → 1572864
const mb2 = bytesToMB(bytes, 0);       // → 1 (no decimals)
```

---

## 🎯 Common Patterns

### Pattern 1: Parse Config Value
```typescript
import { safeParseInt } from './utils/safeMath.js';

const config = {
  port: safeParseInt(env.PORT, 3000, 1024, 65535),
  maxConn: safeParseInt(env.MAX_CONN, 100, 1, 1000),
  timeout: safeParseInt(env.TIMEOUT, 5000, 1000, 60000),
};
```

### Pattern 2: Calculate Memory Usage
```typescript
import { safeDivide, bytesToMB, safePercentage } from './utils/safeMath.js';

const totalMB = bytesToMB(os.totalmem());
const freeMB = bytesToMB(os.freemem());
const usedMB = totalMB - freeMB;
const usagePercent = safePercentage(usedMB, totalMB);
```

### Pattern 3: Calculate Resource Limits
```typescript
import { safeDivide, clamp } from './utils/safeMath.js';

const cpuCores = os.cpus().length;
const cpuUsage = getCurrentCPUUsage();
const availableCPU = 100 - cpuUsage;

const threads = Math.floor(safeDivide(availableCPU, 25, 0));
const clamped = clamp(threads, 1, cpuCores);
```

### Pattern 4: Hash-based Distribution
```typescript
import { safeDivide } from './utils/safeMath.js';

const hash = crypto.createHash('sha256').update(key).digest('hex');
const hashInt = parseInt(hash.substring(0, 8), 16);

// Validate before using:
if (isNaN(hashInt) || !isFinite(hashInt)) {
  return defaultValue;
}

const normalized = safeDivide(hashInt % 100000, 100000, 0);
```

---

## ⚠️ Common Mistakes to Avoid

### ❌ DON'T: Parse without validation
```typescript
const port = parseInt(process.env.PORT);           // NaN possible
const timeout = parseFloat(process.env.TIMEOUT);   // NaN possible
const usage = used / total;                         // Division by zero
```

### ✅ DO: Use safe parsing
```typescript
const port = safeParseInt(process.env.PORT, 3000, 1024, 65535);
const timeout = safeParseFloat(process.env.TIMEOUT, 5000, 0, 60000);
const usage = safeDivide(used, total, 0);
```

### ❌ DON'T: Assume non-zero denominator
```typescript
const avg = sum / count;                  // Division by zero
const percent = (value / total) * 100;    // Division by zero
```

### ✅ DO: Use safe division
```typescript
const avg = safeDivide(sum, count, 0);
const percent = safePercentage(value, total);
```

### ❌ DON'T: Ignore overflow
```typescript
const bytes = mb * 1024 * 1024;           // Overflow possible
const total = a + b;                       // Overflow possible
```

### ✅ DO: Use safe operations
```typescript
const bytes = safeMultiply(mb, 1024 * 1024);
const total = safeAdd(a, b, MAX_VALUE);
```

---

## 🧪 Testing Your Code

### Test Template
```typescript
import { describe, it, expect } from 'vitest';
import { safeParseInt, safeDivide } from './utils/safeMath.js';

describe('MyModule', () => {
  it('should handle invalid config', () => {
    const result = safeParseInt('abc', 100);
    expect(result).toBe(100);
  });

  it('should handle division by zero', () => {
    const result = safeDivide(10, 0);
    expect(result).toBe(0);
  });

  it('should clamp to bounds', () => {
    const result = safeParseInt('1000', 0, 0, 100);
    expect(result).toBe(100);
  });
});
```

---

## 📊 Monitoring

### Metrics to Track
```typescript
// CSRF metrics:
- Token generation rate
- Token validation failures
- Token expiration rate

// Resource protection metrics:
- Connections per IP
- Connection rejections
- Payload rejections
- Memory pressure events

// Rate limiting metrics (already in place):
- Requests per minute
- Rate limit violations
- Retry-After responses
```

### Logging Examples
```typescript
// Security events:
logger.warn('[CSRF] Token validation failed', { ip, path });
logger.warn('[Resource] Connection limit exceeded', { ip, connections });
logger.warn('[Resource] High memory pressure', { heapUsage });

// Performance metrics:
logger.info('[Metrics] Connection stats', {
  totalIPs: stats.totalIPs,
  totalConnections: stats.totalConnections,
  topIPs: stats.topIPs,
});
```

---

## 🔍 Troubleshooting

### Issue: "CSRF token missing"
**Cause**: Client not sending X-CSRF-Token header
**Fix**: Ensure client reads token from cookie and sends in header
```typescript
const token = getCookie('XSRF-TOKEN');
fetch('/api/endpoint', {
  headers: { 'X-CSRF-Token': token },
});
```

### Issue: "Connection limit exceeded"
**Cause**: Too many concurrent requests from same IP
**Fix**: Increase limit or investigate client behavior
```bash
A2A_MAX_CONNECTIONS_PER_IP=20  # Increase limit
```

### Issue: "Payload too large"
**Cause**: Request body exceeds limit
**Fix**: Increase limit or reduce payload size
```bash
A2A_MAX_PAYLOAD_SIZE_MB=20  # Increase limit
```

### Issue: "NaN in calculations"
**Cause**: Not using safe math functions
**Fix**: Replace all `parseInt`, `parseFloat`, division with safe versions
```typescript
// Before: const x = parseInt(input) / total;
// After:
const x = safeDivide(safeParseInt(input, 0), total, 0);
```

---

## 📚 Further Reading

- **Full documentation**: `SECURITY-AND-QUALITY-FIXES-SUMMARY.md`
- **Verification report**: `FIXES-VERIFICATION-REPORT.md`
- **Test examples**: `src/utils/__tests__/safeMath.test.ts`
- **CSRF tests**: `src/a2a/server/middleware/__tests__/csrf.test.ts`
- **Resource tests**: `src/a2a/server/middleware/__tests__/resourceProtection.test.ts`

---

## 🎯 Checklist for New Code

When writing new code, always:

- [ ] Use `safeParseInt`/`safeParseFloat` for all parsing
- [ ] Use `safeDivide` for all divisions
- [ ] Use `safeMultiply` for large multiplications
- [ ] Use `safeAdd` when overflow possible
- [ ] Use `clamp` to enforce bounds
- [ ] Provide default values for all operations
- [ ] Test with NaN, Infinity, and edge cases
- [ ] Enable CSRF protection on state-changing endpoints
- [ ] Apply resource protection to public APIs
- [ ] Add comprehensive tests

---

**Remember**: Defense in depth. Use all available protections!

**Status**: ✅ All protections implemented and tested
**Last Updated**: 2026-02-03
