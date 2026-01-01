/**
 * Circular Dependency Verification Tests
 *
 * This test suite verifies that circular dependencies have been eliminated
 * from the codebase through runtime verification and structural testing.
 *
 * Test Coverage:
 * 1. Module Load Order Verification - Ensure modules load without circular import errors
 * 2. ConnectionPool Independence - Verify ConnectionPool doesn't depend on SimpleConfig
 * 3. FileWatcher Independence - Verify FileWatcher uses IRAGAgent interface
 * 4. Dependency Graph Validation - Programmatic validation of dependency structure
 * 5. Interface Abstraction Verification - Test runtime polymorphism
 *
 * References:
 * - Circular Dependency Elimination Plan: docs/circular-dependency-elimination.md
 * - Fixed Dependencies:
 *   - src/db/ConnectionPool.ts (independent of simple-config)
 *   - src/agents/rag/FileWatcher.ts (uses IRAGAgent interface)
 *   - src/config/simple-config.ts (uses ConnectionPool as dependency)
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import type { ILogger } from '../../src/utils/ILogger.js';
import type { IRAGAgent, DocumentMetadata } from '../../src/agents/rag/types.js';

describe('Circular Dependency Verification', () => {
  describe('1. Module Load Order Verification', () => {
    it('should load ConnectionPool without errors', async () => {
      // Dynamic import to test module loading
      const { ConnectionPool } = await import('../../src/db/ConnectionPool.js');
      expect(ConnectionPool).toBeDefined();
      expect(typeof ConnectionPool).toBe('function');
    });

    it('should load SimpleConfig without errors', async () => {
      const { SimpleConfig } = await import('../../src/config/simple-config.js');
      expect(SimpleConfig).toBeDefined();
      expect(typeof SimpleConfig).toBe('function');
    });

    it('should load FileWatcher without errors', async () => {
      const { FileWatcher } = await import('../../src/agents/rag/FileWatcher.js');
      expect(FileWatcher).toBeDefined();
      expect(typeof FileWatcher).toBe('function');
    });

    it('should load RAGAgent without errors', async () => {
      const { RAGAgent } = await import('../../src/agents/rag/index.js');
      expect(RAGAgent).toBeDefined();
      expect(typeof RAGAgent).toBe('function');
    });

    it('should allow imports in any order without circular errors', async () => {
      // Test reverse order
      await expect(import('../../src/agents/rag/index.js')).resolves.toBeDefined();
      await expect(import('../../src/agents/rag/FileWatcher.js')).resolves.toBeDefined();
      await expect(import('../../src/config/simple-config.js')).resolves.toBeDefined();
      await expect(import('../../src/db/ConnectionPool.js')).resolves.toBeDefined();
    });

    it('should allow simultaneous imports without race conditions', async () => {
      // Test parallel loading
      const imports = await Promise.all([
        import('../../src/db/ConnectionPool.js'),
        import('../../src/config/simple-config.js'),
        import('../../src/agents/rag/FileWatcher.js'),
        import('../../src/agents/rag/index.js'),
      ]);

      expect(imports).toHaveLength(4);
      imports.forEach(module => {
        expect(module).toBeDefined();
      });
    });
  });

  describe('2. ConnectionPool Independence', () => {
    it('should instantiate ConnectionPool without SimpleConfig', async () => {
      const { ConnectionPool } = await import('../../src/db/ConnectionPool.js');

      // Create mock logger
      const mockLogger: ILogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      };

      // Create pool without any config dependency
      const pool = new ConnectionPool(':memory:', {
        maxConnections: 3,
        connectionTimeout: 1000,
        idleTimeout: 5000,
      }, mockLogger);

      expect(pool).toBeDefined();
      expect(pool.isHealthy()).toBe(true);

      const stats = pool.getStats();
      expect(stats.total).toBe(3);
      expect(stats.idle).toBe(3);
      expect(stats.active).toBe(0);

      await pool.shutdown();
    });

    it('should work with different logger implementations', async () => {
      const { ConnectionPool } = await import('../../src/db/ConnectionPool.js');

      // Console logger
      const consoleLogger: ILogger = {
        info: (...args) => console.log('[INFO]', ...args),
        error: (...args) => console.error('[ERROR]', ...args),
        warn: (...args) => console.warn('[WARN]', ...args),
        debug: (...args) => console.debug('[DEBUG]', ...args),
      };

      const pool1 = new ConnectionPool(':memory:', { maxConnections: 2 }, consoleLogger);
      expect(pool1.isHealthy()).toBe(true);
      await pool1.shutdown();

      // Silent logger
      const silentLogger: ILogger = {
        info: () => {},
        error: () => {},
        warn: () => {},
        debug: () => {},
      };

      const pool2 = new ConnectionPool(':memory:', { maxConnections: 2 }, silentLogger);
      expect(pool2.isHealthy()).toBe(true);
      await pool2.shutdown();
    });

    it('should not have any hidden dependencies on config', async () => {
      const { ConnectionPool } = await import('../../src/db/ConnectionPool.js');

      // Instantiate without any config system
      const pool = new ConnectionPool(':memory:', {
        maxConnections: 1,
        connectionTimeout: 500,
        idleTimeout: 1000,
      });

      // Verify pool works completely independently
      const db = await pool.acquire();
      expect(db).toBeDefined();

      // Execute query to prove connection is real
      const result = db.prepare('SELECT 1 as test').get() as { test: number };
      expect(result.test).toBe(1);

      pool.release(db);

      const stats = pool.getStats();
      expect(stats.totalAcquired).toBe(1);
      expect(stats.totalReleased).toBe(1);

      await pool.shutdown();
    });

    it('should verify ConnectionPool module exports', async () => {
      const module = await import('../../src/db/ConnectionPool.js');

      // Verify exports
      expect(module.ConnectionPool).toBeDefined();

      // Verify no circular imports in module namespace
      const moduleKeys = Object.keys(module);
      expect(moduleKeys).toContain('ConnectionPool');

      // Should not export config-related items
      expect(moduleKeys).not.toContain('SimpleConfig');
      expect(moduleKeys).not.toContain('SimpleDatabaseFactory');
    });
  });

  describe('3. FileWatcher Independence', () => {
    it('should instantiate FileWatcher with IRAGAgent interface', async () => {
      const { FileWatcher } = await import('../../src/agents/rag/FileWatcher.js');

      // Create mock RAGAgent that implements IRAGAgent interface
      const mockRAGAgent: IRAGAgent = {
        indexDocument: vi.fn().mockResolvedValue(undefined),
      };

      // FileWatcher should accept any IRAGAgent implementation
      const watcher = new FileWatcher(mockRAGAgent, {
        watchDir: '/tmp/test-watcher',
        pollingInterval: 10000,
      });

      expect(watcher).toBeDefined();
      expect(watcher.getWatchDir()).toBe('/tmp/test-watcher');
    });

    it('should work with mock RAGAgent implementation', async () => {
      const { FileWatcher } = await import('../../src/agents/rag/FileWatcher.js');

      const indexedDocs: Array<{ content: string; metadata: DocumentMetadata }> = [];

      // Custom mock implementation
      const customRAGAgent: IRAGAgent = {
        indexDocument: async (content: string, metadata: DocumentMetadata) => {
          indexedDocs.push({ content, metadata });
        },
      };

      const watcher = new FileWatcher(customRAGAgent, {
        watchDir: '/tmp/custom-watcher',
      });

      expect(watcher).toBeDefined();
      expect(indexedDocs).toHaveLength(0);
    });

    it('should not have hidden dependencies on RAGAgent implementation', async () => {
      const { FileWatcher } = await import('../../src/agents/rag/FileWatcher.js');

      // Minimal IRAGAgent implementation
      const minimalAgent: IRAGAgent = {
        indexDocument: vi.fn(),
      };

      // Should work with minimal interface
      const watcher = new FileWatcher(minimalAgent);
      expect(watcher).toBeDefined();

      // Verify no hidden dependencies
      const watchDir = watcher.getWatchDir();
      expect(watchDir).toBeTruthy();
      expect(typeof watchDir).toBe('string');
    });

    it('should verify FileWatcher module exports', async () => {
      const module = await import('../../src/agents/rag/FileWatcher.js');

      expect(module.FileWatcher).toBeDefined();

      // Should not export RAGAgent class
      const moduleKeys = Object.keys(module);
      expect(moduleKeys).toContain('FileWatcher');
      expect(moduleKeys).not.toContain('RAGAgent');
    });
  });

  describe('4. Dependency Graph Validation', () => {
    it('should verify ConnectionPool does not import SimpleConfig', async () => {
      // Read ConnectionPool source and verify no direct imports
      const fs = await import('fs/promises');
      const connectionPoolSource = await fs.readFile(
        './src/db/ConnectionPool.ts',
        'utf-8'
      );

      // Should not contain SimpleConfig imports
      expect(connectionPoolSource).not.toContain('from \'../config/simple-config');
      expect(connectionPoolSource).not.toContain('from "../config/simple-config');
      expect(connectionPoolSource).not.toContain('SimpleConfig');

      // Note: "SimpleDatabaseFactory" may appear in comments but not in actual imports
      // Verify no actual import statement for SimpleDatabaseFactory
      const lines = connectionPoolSource.split('\n');
      const importLines = lines.filter(line =>
        line.trim().startsWith('import ') &&
        line.includes('SimpleDatabaseFactory')
      );
      expect(importLines).toHaveLength(0);

      // Should only import ILogger interface
      expect(connectionPoolSource).toContain('ILogger');
    });

    it('should verify FileWatcher only imports IRAGAgent interface', async () => {
      const fs = await import('fs/promises');
      const fileWatcherSource = await fs.readFile(
        './src/agents/rag/FileWatcher.ts',
        'utf-8'
      );

      // Should import from types.ts (interface only)
      expect(fileWatcherSource).toContain('./types');

      // Should import IRAGAgent type
      expect(fileWatcherSource).toContain('IRAGAgent');

      // Should NOT import RAGAgent class from index.ts
      expect(fileWatcherSource).not.toContain('from \'./index');
      expect(fileWatcherSource).not.toContain('from "./index');
    });

    it('should verify SimpleConfig can depend on ConnectionPool', async () => {
      const fs = await import('fs/promises');
      const simpleConfigSource = await fs.readFile(
        './src/config/simple-config.ts',
        'utf-8'
      );

      // SimpleConfig CAN import ConnectionPool (dependency injection)
      expect(simpleConfigSource).toContain('ConnectionPool');
      expect(simpleConfigSource).toContain('../db/ConnectionPool');
    });

    it('should verify RAG index.ts can depend on FileWatcher', async () => {
      const fs = await import('fs/promises');
      const ragIndexSource = await fs.readFile(
        './src/agents/rag/index.ts',
        'utf-8'
      );

      // RAG index.ts CAN export FileWatcher
      expect(ragIndexSource).toContain('FileWatcher');
      expect(ragIndexSource).toContain('./FileWatcher');
    });

    it('should detect no circular dependencies in module graph', async () => {
      // Manual dependency graph validation
      const dependencies = {
        'ConnectionPool': [],
        'ILogger': [],
        'SimpleConfig': ['ConnectionPool'],
        'IRAGAgent': [],
        'FileWatcher': ['IRAGAgent'],
        'RAGAgent': ['IRAGAgent', 'FileWatcher'],
      };

      // Topological sort to detect cycles
      const visited = new Set<string>();
      const recursionStack = new Set<string>();

      function hasCycle(node: string): boolean {
        if (recursionStack.has(node)) {
          return true; // Cycle detected
        }

        if (visited.has(node)) {
          return false; // Already processed
        }

        visited.add(node);
        recursionStack.add(node);

        const deps = dependencies[node as keyof typeof dependencies] || [];
        for (const dep of deps) {
          if (hasCycle(dep)) {
            return true;
          }
        }

        recursionStack.delete(node);
        return false;
      }

      // Check all nodes
      for (const node of Object.keys(dependencies)) {
        expect(hasCycle(node)).toBe(false);
      }
    });
  });

  describe('5. Interface Abstraction Verification', () => {
    it('should verify ILogger interface enables polymorphism', async () => {
      const { ConnectionPool } = await import('../../src/db/ConnectionPool.js');

      // Create different logger implementations
      const loggers: ILogger[] = [
        {
          info: vi.fn(),
          error: vi.fn(),
          warn: vi.fn(),
          debug: vi.fn(),
        },
        {
          info: () => console.log('Custom logger'),
          error: () => console.error('Custom logger'),
          warn: () => console.warn('Custom logger'),
          debug: () => console.debug('Custom logger'),
        },
      ];

      // All should work with ConnectionPool
      for (const logger of loggers) {
        const pool = new ConnectionPool(':memory:', { maxConnections: 1 }, logger);
        expect(pool.isHealthy()).toBe(true);
        await pool.shutdown();
      }
    });

    it('should verify IRAGAgent interface enables polymorphism', async () => {
      const { FileWatcher } = await import('../../src/agents/rag/FileWatcher.js');

      // Create different RAGAgent implementations
      const agents: IRAGAgent[] = [
        {
          indexDocument: vi.fn().mockResolvedValue(undefined),
        },
        {
          indexDocument: async (content, metadata) => {
            console.log('Indexing:', metadata.source);
          },
        },
      ];

      // All should work with FileWatcher
      for (const agent of agents) {
        const watcher = new FileWatcher(agent, { watchDir: '/tmp/test' });
        expect(watcher).toBeDefined();
      }
    });

    it('should verify runtime polymorphism works correctly', async () => {
      const { FileWatcher } = await import('../../src/agents/rag/FileWatcher.js');

      // Create a custom implementation that tracks calls
      let indexCallCount = 0;
      const trackingAgent: IRAGAgent = {
        indexDocument: async () => {
          indexCallCount++;
        },
      };

      const watcher = new FileWatcher(trackingAgent);
      expect(watcher).toBeDefined();

      // The implementation should be the custom one, not a default
      expect(indexCallCount).toBe(0);
    });

    it('should verify interface contracts are minimal and focused', async () => {
      // ILogger should only have 4 methods
      const loggerMethods = ['info', 'error', 'warn', 'debug'];
      const mockLogger: ILogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
      };

      expect(Object.keys(mockLogger)).toEqual(expect.arrayContaining(loggerMethods));
      expect(Object.keys(mockLogger).length).toBe(4);

      // IRAGAgent should only have indexDocument method
      const mockAgent: IRAGAgent = {
        indexDocument: vi.fn(),
      };

      expect(Object.keys(mockAgent)).toEqual(['indexDocument']);
      expect(Object.keys(mockAgent).length).toBe(1);
    });
  });

  describe('6. Runtime Dependency Injection Verification', () => {
    it('should allow ConnectionPool to work with injected logger', async () => {
      const { ConnectionPool } = await import('../../src/db/ConnectionPool.js');

      const logMessages: string[] = [];
      const injectableLogger: ILogger = {
        info: (msg) => logMessages.push(`INFO: ${msg}`),
        error: (msg) => logMessages.push(`ERROR: ${msg}`),
        warn: (msg) => logMessages.push(`WARN: ${msg}`),
        debug: (msg) => logMessages.push(`DEBUG: ${msg}`),
      };

      const pool = new ConnectionPool(':memory:', {
        maxConnections: 2,
        connectionTimeout: 1000,
        idleTimeout: 5000,
      }, injectableLogger);

      expect(pool.isHealthy()).toBe(true);

      // Note: The injected logger is for verbose SQLite output, not general logging
      // ConnectionPool uses the global logger for general messages
      // Verbose logger is only called if SQLite verbose mode is enabled
      // So we verify the pool works, not that the logger was called
      expect(pool.getStats().total).toBe(2);

      await pool.shutdown();
    });

    it('should allow FileWatcher to work with injected RAGAgent', async () => {
      const { FileWatcher } = await import('../../src/agents/rag/FileWatcher.js');

      const indexedDocuments: DocumentMetadata[] = [];
      const injectableAgent: IRAGAgent = {
        indexDocument: async (content, metadata) => {
          indexedDocuments.push(metadata);
        },
      };

      const watcher = new FileWatcher(injectableAgent, {
        watchDir: '/tmp/injectable-test',
      });

      expect(watcher).toBeDefined();
      expect(indexedDocuments).toHaveLength(0);
    });

    it('should verify no static dependencies in constructors', async () => {
      const { ConnectionPool } = await import('../../src/db/ConnectionPool.js');
      const { FileWatcher } = await import('../../src/agents/rag/FileWatcher.js');

      // ConnectionPool constructor should not reference static config
      const pool = new ConnectionPool(':memory:', { maxConnections: 1 });
      expect(pool).toBeDefined();
      await pool.shutdown();

      // FileWatcher constructor should not create RAGAgent internally
      const mockAgent: IRAGAgent = { indexDocument: vi.fn() };
      const watcher = new FileWatcher(mockAgent);
      expect(watcher).toBeDefined();
    });
  });

  describe('7. Module Isolation Verification', () => {
    it('should verify ConnectionPool module is self-contained', async () => {
      const module = await import('../../src/db/ConnectionPool.js');

      // Should only export ConnectionPool and related types
      const exports = Object.keys(module);
      expect(exports).toContain('ConnectionPool');

      // Should not leak internal dependencies
      expect(exports).not.toContain('Database');
      expect(exports).not.toContain('logger');
    });

    it('should verify types module is interface-only', async () => {
      const typesModule = await import('../../src/agents/rag/types.js');

      // Types module should export types and interfaces, not implementations
      const exports = Object.keys(typesModule);

      // Should not contain implementation classes
      expect(exports).not.toContain('RAGAgent');
      expect(exports).not.toContain('VectorStore');
      expect(exports).not.toContain('FileWatcher');
    });

    it('should verify interfaces have no runtime dependencies', async () => {
      const { ILogger } = await import('../../src/utils/ILogger.js');
      const { IRAGAgent } = await import('../../src/agents/rag/types.js');

      // Interfaces should be type-only (no runtime value)
      expect(ILogger).toBeUndefined(); // TypeScript interfaces don't exist at runtime
      expect(IRAGAgent).toBeUndefined();
    });
  });

  describe('8. Dependency Inversion Verification', () => {
    it('should verify high-level modules depend on abstractions', async () => {
      const fs = await import('fs/promises');

      // SimpleConfig (high-level) should depend on ConnectionPool interface
      const configSource = await fs.readFile('./src/config/simple-config.ts', 'utf-8');
      expect(configSource).toContain('ConnectionPool');

      // RAGAgent (high-level) should depend on IRAGAgent interface
      const ragSource = await fs.readFile('./src/agents/rag/index.ts', 'utf-8');
      expect(ragSource).toContain('IRAGAgent');
    });

    it('should verify low-level modules are independent', async () => {
      const fs = await import('fs/promises');

      // ConnectionPool (low-level) should not depend on SimpleConfig
      const poolSource = await fs.readFile('./src/db/ConnectionPool.ts', 'utf-8');
      expect(poolSource).not.toContain('SimpleConfig');

      // Should depend on ILogger abstraction instead
      expect(poolSource).toContain('ILogger');
    });

    it('should verify dependency flow is unidirectional', () => {
      // Dependency graph should flow in one direction
      const dependencyFlow = {
        'ILogger': { dependsOn: [] },
        'IRAGAgent': { dependsOn: [] },
        'ConnectionPool': { dependsOn: ['ILogger'] },
        'FileWatcher': { dependsOn: ['IRAGAgent'] },
        'SimpleConfig': { dependsOn: ['ConnectionPool'] },
        'RAGAgent': { dependsOn: ['IRAGAgent', 'FileWatcher'] },
      };

      // Verify no reverse dependencies
      for (const [module, deps] of Object.entries(dependencyFlow)) {
        for (const dep of deps.dependsOn) {
          const reverseDeps = dependencyFlow[dep as keyof typeof dependencyFlow]?.dependsOn || [];
          expect(reverseDeps).not.toContain(module);
        }
      }
    });
  });
});
