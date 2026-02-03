# MeMesh Examples

Example scripts demonstrating MeMesh features.

## Available Example

### Connection Pool Demo

Demonstrates the SQLite connection pooling functionality with real-world usage patterns.

```bash
npx tsx examples/connection-pool-demo.ts
```

**Features:**
- Connection pool management
- Concurrent access patterns
- Resource cleanup
- Error handling
- Real-world usage scenarios

See: [connection-pool-demo.ts](./connection-pool-demo.ts)

---

## Running the Example

### Prerequisites

```bash
npm install
npm run build
```

### Run

```bash
npx tsx examples/connection-pool-demo.ts
```

**Expected output:**
```
=== Connection Pool Demo ===

1. Getting connection pool...
✓ Pool initialized:
  - Total connections: 5
  - Available: 5
  - Active: 0

2. Creating test table...
✓ Table created

3. Sequential operations with pooled connections...
  ✓ Inserted User 1
  ✓ Inserted User 2
  ✓ Inserted User 3
...
```

---

## Development

### Adding New Examples

1. Create a new `.ts` file in `examples/`
2. Import modules from `../src/`
3. Add documentation to this README
4. Test that the example actually runs

### Testing Examples

```bash
# Build first
npm run build

# Run example
npx tsx examples/your-example.ts
```

---

## Support

For issues or questions:
- Check [project documentation](../README.md)
- Review source code in `examples/`
- Open an issue on GitHub

---

**Happy exploring! 🚀**
