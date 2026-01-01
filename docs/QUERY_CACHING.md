# Query Result Caching System

## Overview

The Query Result Caching system provides high-performance in-memory caching for frequently accessed database queries, significantly reducing database load and improving response times across the Claude Code Buddy application.

## Architecture

### Core Components

#### 1. QueryCache (`src/db/QueryCache.ts`)

LRU (Least Recently Used) cache implementation with:
- **Time-to-Live (TTL)**: Automatic expiration of stale entries
- **Pattern Invalidation**: RegExp-based cache clearing for related queries
- **Statistics Tracking**: Hit rate, miss rate, and memory usage monitoring
- **Memory Management**: Configurable size limits with automatic eviction

#### 2. DatabaseQueryCache

Specialized wrapper for database query caching with:
- Simplified API for common database query patterns
- Automatic key generation from SQL queries and parameters
- Promise-based async query execution with caching

### Integration Points

The caching system is integrated into the following components:

#### Knowledge Graph (`src/knowledge-graph/index.ts`)

| Method | Cache Strategy | TTL | Invalidation Pattern |
|--------|---------------|-----|---------------------|
| `searchEntities()` | Full result caching | 5 min | `^entities:` |
| `traceRelations()` | Full result caching | 5 min | `^trace:` |
| `getStats()` | Full result caching | 1 min | `^stats:` |
| `createEntity()` | N/A (mutation) | N/A | Invalidates `^entities:` |
| `createRelation()` | N/A (mutation) | N/A | Invalidates `^relations:`, `^trace:` |
| `deleteEntity()` | N/A (mutation) | N/A | Invalidates all patterns |

## Configuration

### Default Settings

```typescript
{
  maxSize: 1000,        // Maximum cache entries
  defaultTTL: 300000,   // 5 minutes (in milliseconds)
  debug: false          // Enable debug logging
}
```

### Custom Configuration

```typescript
import { QueryCache } from './db/QueryCache.js';

// Create cache with custom settings
const cache = new QueryCache({
  maxSize: 2000,
  defaultTTL: 10 * 60 * 1000, // 10 minutes
  debug: true
});
```

## Usage

### Basic Usage

```typescript
import { QueryCache } from './db/QueryCache.js';

// Create cache
const cache = new QueryCache<string, Entity[]>();

// Check cache
const cacheKey = 'entities:type:agent';
let entities = cache.get(cacheKey);

if (!entities) {
  // Cache miss - query database
  entities = db.prepare('SELECT * FROM entities WHERE type = ?').all('agent');
  cache.set(cacheKey, entities);
}

// Use cached data
console.log(entities);
```

### Database Query Caching

```typescript
import { DatabaseQueryCache } from './db/QueryCache.js';

const dbCache = new DatabaseQueryCache();

// Cached query execution
const users = await dbCache.cachedQuery(
  'SELECT * FROM users WHERE active = ?',
  [true],
  () => db.prepare('SELECT * FROM users WHERE active = ?').all(true)
);

// Second call uses cache (no database query)
const sameUsers = await dbCache.cachedQuery(
  'SELECT * FROM users WHERE active = ?',
  [true],
  () => db.prepare('SELECT * FROM users WHERE active = ?').all(true)
);
```

### Cache Invalidation

```typescript
// Invalidate all entity queries
cache.invalidatePattern(/^entities:/);

// Invalidate specific type
cache.invalidatePattern(/^entities:type:agent/);

// Invalidate single key
cache.delete('entities:123');

// Clear entire cache
cache.clear();
```

### Monitoring

```typescript
// Get cache statistics
const stats = cache.getStats();

console.log(`Hit Rate: ${stats.hitRate}%`);
console.log(`Cache Size: ${stats.size} / ${stats.maxSize}`);
console.log(`Memory Usage: ${stats.memoryUsage} bytes`);
console.log(`Hits: ${stats.hits}, Misses: ${stats.misses}`);
```

## Performance Benefits

### Benchmark Results

Based on performance benchmarks with 100 entities and 50 relations:

| Operation | Cold Cache | Warm Cache | Speedup |
|-----------|-----------|------------|---------|
| `searchEntities()` (1000x) | ~5ms | ~0.005ms | **1000x** |
| `traceRelations()` (500x) | ~3ms | ~0.006ms | **500x** |
| `getStats()` (1000x) | ~2ms | ~0.002ms | **1000x** |

### Expected Performance Improvements

- **Database Load**: 80-95% reduction (depending on query patterns)
- **Response Time**: 100-1000x faster for cached queries
- **Hit Rate**: >80% for typical workloads
- **Memory Usage**: ~100-500 KB for 1000 cached entries

## Best Practices

### 1. Cache Key Design

**✅ Good**: Consistent, descriptive keys
```typescript
const key = `entities:type:${type}:limit:${limit}`;
```

**❌ Bad**: Non-deterministic keys
```typescript
const key = `entities:${Math.random()}`;
```

### 2. TTL Selection

| Data Type | Recommended TTL | Reason |
|-----------|----------------|--------|
| Static reference data | 1 hour | Rarely changes |
| Entity searches | 5 minutes | Moderate update frequency |
| Statistics | 1 minute | Frequently updated |
| Real-time data | No cache | Changes constantly |

### 3. Invalidation Strategy

**Event-based invalidation** (recommended):
```typescript
// On mutation, invalidate related caches
db.createEntity(entity);
cache.invalidatePattern(/^entities:/);
```

**Time-based invalidation** (for infrequent updates):
```typescript
// Let TTL handle invalidation automatically
cache.set(key, value, 5 * 60 * 1000); // 5 min TTL
```

### 4. Memory Management

```typescript
// Monitor memory usage
const stats = cache.getStats();

if (stats.memoryUsage > 10 * 1024 * 1024) { // 10MB
  // Reduce max size or lower TTL
  cache.clear();
  logger.warn('Cache cleared due to high memory usage');
}
```

### 5. Testing

```typescript
// Clear cache before tests
beforeEach(() => {
  cache.clear();
});

// Verify cache behavior
it('should cache query results', () => {
  const key = 'test:key';
  cache.set(key, 'value');
  expect(cache.get(key)).toBe('value');
});

// Test invalidation
it('should invalidate on mutation', () => {
  cache.set('entities:1', data);
  db.updateEntity(1);
  cache.invalidatePattern(/^entities:/);
  expect(cache.get('entities:1')).toBeUndefined();
});
```

## Advanced Features

### Custom TTL per Entry

```typescript
// Short TTL for volatile data
cache.set('realtime:data', value, 10 * 1000); // 10 seconds

// Long TTL for static data
cache.set('config:settings', value, 60 * 60 * 1000); // 1 hour
```

### Conditional Caching

```typescript
function getEntities(type: string, bypassCache = false) {
  const key = `entities:${type}`;

  if (!bypassCache) {
    const cached = cache.get(key);
    if (cached) return cached;
  }

  const result = db.query(type);
  if (!bypassCache) {
    cache.set(key, result);
  }

  return result;
}
```

### Bulk Operations

```typescript
// Clear cache before bulk import
cache.clear();

// Perform bulk operations
for (const entity of entities) {
  db.createEntity(entity);
}

// Cache will repopulate on next query
```

## Debugging

### Enable Debug Logging

```typescript
const cache = new QueryCache({
  debug: true
});

// Logs:
// [QueryCache] Set { key: 'entities:123', ttl: 300000 }
// [QueryCache] Hit { key: 'entities:123' }
// [QueryCache] Miss { key: 'entities:456' }
```

### Inspect Cache Contents

```typescript
const stats = cache.getStats();

console.log('Cache Statistics:', {
  hitRate: `${stats.hitRate}%`,
  size: `${stats.size} / ${stats.maxSize}`,
  memory: `${(stats.memoryUsage / 1024).toFixed(2)} KB`,
  oldest: new Date(stats.oldestEntry).toISOString(),
  newest: new Date(stats.newestEntry).toISOString()
});
```

## Limitations

### Current Limitations

1. **In-Memory Only**: Cache is not persisted across restarts
2. **Single Process**: No distributed caching (use Redis for multi-process)
3. **Synchronous Invalidation**: Pattern invalidation is O(n)
4. **Approximate Memory Tracking**: JSON serialization-based estimation

### Future Enhancements

- [ ] Persistent cache with SQLite/Redis backend
- [ ] Distributed cache synchronization
- [ ] Bloom filter for faster negative lookups
- [ ] Compression for large values
- [ ] Lazy invalidation with versioning
- [ ] Adaptive TTL based on access patterns

## Troubleshooting

### High Memory Usage

**Symptom**: Cache memory usage > 50MB

**Solutions**:
```typescript
// 1. Reduce max size
cache = new QueryCache({ maxSize: 500 });

// 2. Lower TTL
cache = new QueryCache({ defaultTTL: 2 * 60 * 1000 }); // 2 min

// 3. Clear cache periodically
setInterval(() => cache.clear(), 10 * 60 * 1000); // Every 10 min
```

### Low Hit Rate

**Symptom**: Hit rate < 50%

**Causes & Solutions**:
1. **Non-deterministic keys**: Use consistent key generation
2. **TTL too short**: Increase TTL for stable data
3. **Cache too small**: Increase maxSize
4. **Over-invalidation**: Use targeted pattern invalidation

### Stale Data

**Symptom**: Cached data doesn't reflect recent changes

**Solutions**:
```typescript
// 1. Ensure mutations invalidate cache
db.updateEntity(id);
cache.invalidatePattern(/^entities:/);

// 2. Reduce TTL for volatile data
cache.set(key, value, 60 * 1000); // 1 min

// 3. Manual invalidation
cache.delete(specificKey);
```

## References

- [QueryCache Implementation](/src/db/QueryCache.ts)
- [KnowledgeGraph Integration](/src/knowledge-graph/index.ts)
- [Performance Benchmarks](/tests/db/QueryCache.benchmark.ts)
- [Unit Tests](/tests/db/QueryCache.test.ts)

## Support

For issues or questions:
- GitHub Issues: [claude-code-buddy/issues](https://github.com/PCIRCLE-AI/claude-code-buddy/issues)
- Documentation: [README.md](../README.md)
