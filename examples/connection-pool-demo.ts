/**
 * Connection Pool Demo
 *
 * Demonstrates the connection pooling functionality with real-world usage patterns.
 */

import { SimpleDatabaseFactory } from '../src/config/simple-config.js';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

async function demonstrateConnectionPool() {
  console.log('=== Connection Pool Demo ===\n');

  // Use temp file database for proper shared state
  const dbPath = path.join(os.tmpdir(), `pool-demo-${Date.now()}.db`);

  try {
    // 1. Get pool instance
    console.log('1. Getting connection pool...');
    const pool = SimpleDatabaseFactory.getPool(dbPath);
    const initialStats = pool.getStats();
    console.log('✓ Pool initialized:');
    console.log(`  - Total connections: ${initialStats.total}`);
    console.log(`  - Available: ${initialStats.idle}`);
    console.log(`  - Active: ${initialStats.active}\n`);

    // 2. Create table using pooled connection
    console.log('2. Creating test table...');
    const setupConn = await SimpleDatabaseFactory.getPooledConnection(dbPath);
    try {
      setupConn.exec(`
        CREATE TABLE users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✓ Table created\n');
    } finally {
      SimpleDatabaseFactory.releasePooledConnection(setupConn, dbPath);
    }

    // 3. Sequential operations using pooled connections
    console.log('3. Sequential operations with pooled connections...');
    for (let i = 1; i <= 3; i++) {
      const conn = await SimpleDatabaseFactory.getPooledConnection(dbPath);
      try {
        conn.prepare('INSERT INTO users (name) VALUES (?)').run(`User ${i}`);
        console.log(`  ✓ Inserted User ${i}`);
      } finally {
        SimpleDatabaseFactory.releasePooledConnection(conn, dbPath);
      }
    }

    const stats1 = SimpleDatabaseFactory.getPoolStats(dbPath);
    console.log(`  - Total acquired: ${stats1?.totalAcquired}`);
    console.log(`  - Total released: ${stats1?.totalReleased}\n`);

    // 4. Concurrent operations
    console.log('4. Concurrent operations (10 parallel queries)...');
    const startTime = Date.now();

    const operations = Array.from({ length: 10 }, async (_, i) => {
      const conn = await SimpleDatabaseFactory.getPooledConnection(dbPath);
      try {
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
        conn.prepare('INSERT INTO users (name) VALUES (?)').run(`Concurrent User ${i}`);
        return i;
      } finally {
        SimpleDatabaseFactory.releasePooledConnection(conn, dbPath);
      }
    });

    await Promise.all(operations);
    const duration = Date.now() - startTime;

    const stats2 = SimpleDatabaseFactory.getPoolStats(dbPath);
    console.log(`  ✓ Completed in ${duration}ms`);
    console.log(`  - Total operations: ${stats2?.totalAcquired}`);
    console.log(`  - Active connections: ${stats2?.active}`);
    console.log(`  - Idle connections: ${stats2?.idle}\n`);

    // 5. Query all users
    console.log('5. Querying all users...');
    const conn = await SimpleDatabaseFactory.getPooledConnection(dbPath);
    try {
      const users = conn.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
      console.log(`  ✓ Total users in database: ${users.count}\n`);
    } finally {
      SimpleDatabaseFactory.releasePooledConnection(conn, dbPath);
    }

    // 6. Final statistics
    console.log('6. Final pool statistics:');
    const finalStats = SimpleDatabaseFactory.getPoolStats(dbPath);
    if (finalStats) {
      console.log(`  - Total connections: ${finalStats.total}`);
      console.log(`  - Active: ${finalStats.active}`);
      console.log(`  - Idle: ${finalStats.idle}`);
      console.log(`  - Waiting: ${finalStats.waiting}`);
      console.log(`  - Total acquired: ${finalStats.totalAcquired}`);
      console.log(`  - Total released: ${finalStats.totalReleased}`);
      console.log(`  - Total recycled: ${finalStats.totalRecycled}`);
      console.log(`  - Timeout errors: ${finalStats.timeoutErrors}`);
    }

    // 7. Cleanup
    console.log('\n7. Cleaning up...');
    await SimpleDatabaseFactory.closeAll();
    console.log('✓ All connections closed\n');

    console.log('=== Demo Complete ===');
  } finally {
    // Clean up database file
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
    [dbPath + '-wal', dbPath + '-shm'].forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  }
}

// Run demo
demonstrateConnectionPool()
  .then(() => {
    console.log('\n✅ Demo completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Demo failed:', error);
    process.exit(1);
  });
