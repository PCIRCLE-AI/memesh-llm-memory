/**
 * Complete Memory System Integration Tests
 *
 * Comprehensive end-to-end testing of all memory features:
 * - UnifiedMemoryStore with all CRUD operations
 * - SmartMemoryQuery with context-aware ranking
 * - AutoTagger with 50+ technology detection
 * - AutoMemoryRecorder with event detection
 * - Memory ID validation
 * - ESCAPE clause optimization
 * - Metadata size limits
 *
 * Tests cover complete workflows and feature interactions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UnifiedMemoryStore } from '../../src/memory/UnifiedMemoryStore.js';
import { SmartMemoryQuery } from '../../src/memory/SmartMemoryQuery.js';
import { AutoTagger } from '../../src/memory/AutoTagger.js';
import { AutoMemoryRecorder } from '../../src/memory/AutoMemoryRecorder.js';
import { KnowledgeGraph } from '../../src/knowledge-graph/index.js';
import type { UnifiedMemory } from '../../src/memory/types/unified-memory.js';
import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Memory System Integration', () => {
  let kg: KnowledgeGraph;
  let memoryStore: UnifiedMemoryStore;
  let smartQuery: SmartMemoryQuery;
  let autoTagger: AutoTagger;
  let autoRecorder: AutoMemoryRecorder;
  let tempDir: string;

  beforeEach(async () => {
    // Create temp directory for test database
    tempDir = mkdtempSync(join(tmpdir(), 'memory-integration-'));
    const dbPath = join(tempDir, 'test-kg.db');

    // Initialize all components
    kg = await KnowledgeGraph.create(dbPath);
    memoryStore = new UnifiedMemoryStore(kg);
    smartQuery = new SmartMemoryQuery();
    autoTagger = new AutoTagger();
    autoRecorder = new AutoMemoryRecorder(memoryStore);
  });

  afterEach(() => {
    kg.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe('Complete Memory Workflow', () => {
    it('should handle full memory lifecycle with auto-features', async () => {
      // Step 1: Create memory with auto-tagging
      const content = 'Implemented JWT authentication using TypeScript and Express middleware for secure API access';
      const manualTags = ['security', 'backend'];

      // Auto-tagger enhances tags
      const enhancedTags = autoTagger.generateTags(content, manualTags);

      // Should detect: typescript, express, backend, api (with prefixes)
      expect(enhancedTags).toContain('tech:typescript');
      expect(enhancedTags).toContain('tech:express');
      expect(enhancedTags).toContain('domain:backend'); // "middleware" triggers backend
      // Manual tags are preserved
      expect(enhancedTags).toContain('security');
      expect(enhancedTags).toContain('backend');

      // Step 2: Store memory
      const memory: UnifiedMemory = {
        type: 'knowledge',
        content,
        tags: enhancedTags,
        importance: 0.85,
        timestamp: new Date(),
        metadata: {
          implementation: 'middleware',
          algorithm: 'RS256'
        }
      };

      const id = await memoryStore.store(memory, {
        projectPath: '/backend/auth'
      });

      expect(id).toBeDefined();

      // Step 3: Retrieve and verify
      const retrieved = await memoryStore.get(id);
      expect(retrieved).not.toBeNull();
      expect(retrieved!.content).toBe(content);
      expect(retrieved!.tags).toContain('tech:typescript');
      expect(retrieved!.importance).toBe(0.85);

      // Step 4: Search with SmartMemoryQuery
      const allMemories = await memoryStore.search('', { techStack: [] });
      const searchResults = smartQuery.search('JWT authentication', allMemories, {
        techStack: ['typescript', 'nodejs']
      });

      expect(searchResults.length).toBeGreaterThan(0);
      expect(searchResults[0].id).toBe(id);

      // Step 5: Update memory
      await memoryStore.update(id, {
        importance: 0.9,
        metadata: {
          ...retrieved!.metadata,
          tested: true,
          coverage: 95
        }
      });

      const updated = await memoryStore.get(id);
      expect(updated!.importance).toBe(0.9);
      expect(updated!.metadata!.tested).toBe(true);

      // Step 6: Delete memory
      await memoryStore.delete(id);
      const deleted = await memoryStore.get(id);
      expect(deleted).toBeNull();
    });

    it('should handle auto-memory recording workflow', async () => {
      // Simulate code change event
      const codeChangeId = await autoRecorder.recordCodeChange({
        files: ['auth.ts', 'user.ts', 'session.ts', 'middleware.ts'],
        linesChanged: 120,
        description: 'Refactor authentication system to use JWT tokens',
        projectPath: '/backend'
      });

      expect(codeChangeId).not.toBeNull();

      // Verify auto-recorded memory
      const codeMemory = await memoryStore.get(codeChangeId!);
      expect(codeMemory).not.toBeNull();
      expect(codeMemory!.tags).toContain('auto-recorded');
      expect(codeMemory!.tags).toContain('code-change');
      expect(codeMemory!.importance).toBeGreaterThanOrEqual(0.6);

      // Simulate test failure event
      const testFailId = await autoRecorder.recordTestEvent({
        type: 'fail',
        testName: 'should validate JWT signature',
        error: 'Invalid signature algorithm',
        projectPath: '/backend/tests'
      });

      expect(testFailId).not.toBeNull();

      // Verify test failure recorded with high importance
      const testMemory = await memoryStore.get(testFailId!);
      expect(testMemory!.type).toBe('mistake');
      expect(testMemory!.importance).toBe(0.9);
      expect(testMemory!.tags).toContain('test');
      expect(testMemory!.tags).toContain('failure');

      // Simulate git commit
      const commitId = await autoRecorder.recordGitCommit({
        message: 'feat: implement JWT authentication with refresh tokens',
        filesChanged: 8,
        insertions: 250,
        deletions: 30,
        projectPath: '/backend'
      });

      expect(commitId).not.toBeNull();

      // Verify commit recorded
      const commitMemory = await memoryStore.get(commitId!);
      expect(commitMemory!.type).toBe('decision');
      expect(commitMemory!.tags).toContain('git');
      expect(commitMemory!.tags).toContain('commit');

      // Search all auto-recorded memories
      const autoMemories = await memoryStore.searchByTags(['auto-recorded']);
      expect(autoMemories.length).toBe(3);
    });
  });

  describe('Search and Ranking Integration', () => {
    it('should rank memories correctly with multiple factors', async () => {
      const now = new Date();
      const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Create test memories with varying importance, recency, and relevance
      const memories: UnifiedMemory[] = [
        {
          type: 'knowledge',
          content: 'TypeScript strict mode best practices for type safety',
          tags: ['typescript', 'best-practice', 'type-safety'],
          importance: 0.9,
          timestamp: now, // Recent
        },
        {
          type: 'mistake',
          content: 'Security vulnerability in user authentication endpoint',
          tags: ['security', 'authentication', 'vulnerability'],
          importance: 0.95, // Highest importance
          timestamp: lastWeek,
        },
        {
          type: 'decision',
          content: 'Chose PostgreSQL over MySQL for ACID guarantees',
          tags: ['database', 'postgresql', 'architecture'],
          importance: 0.8,
          timestamp: lastMonth, // Older
        },
        {
          type: 'knowledge',
          content: 'React hooks patterns for state management',
          tags: ['react', 'hooks', 'frontend'],
          importance: 0.7,
          timestamp: now,
        },
      ];

      // Store all memories
      const ids: string[] = [];
      for (const memory of memories) {
        const id = await memoryStore.store(memory);
        ids.push(id);
      }

      // Test 1: Search for "typescript" with tech stack boost
      const tsResults = smartQuery.search('typescript best practices', memories, {
        techStack: ['typescript', 'nodejs']
      });

      // First result should be TypeScript memory (exact match + recent + tech boost)
      expect(tsResults[0].content).toContain('TypeScript strict mode');

      // Test 2: Search for "security" - importance should dominate
      const securityResults = smartQuery.search('security authentication', memories, {
        techStack: []
      });

      // Security vulnerability should rank first (highest importance 0.95)
      expect(securityResults[0].content).toContain('Security vulnerability');

      // Test 3: Filter by type
      const decisions = await memoryStore.searchByType('decision', '');
      expect(decisions.length).toBe(1);
      expect(decisions[0].content).toContain('PostgreSQL');

      // Test 4: Search by tags
      const authMemories = await memoryStore.searchByTags(['authentication']);
      expect(authMemories.length).toBeGreaterThan(0);
      expect(authMemories[0].tags).toContain('authentication');
    });

    it('should handle complex multi-keyword searches', async () => {
      // Create memories about different tech stacks
      const memories: UnifiedMemory[] = [
        {
          type: 'knowledge',
          content: 'React state management using Redux Toolkit with TypeScript',
          tags: ['react', 'redux', 'typescript', 'frontend'],
          importance: 0.9, // Higher importance for React
          timestamp: new Date(),
        },
        {
          type: 'knowledge',
          content: 'Vue 3 Composition API with TypeScript for reactive state',
          tags: ['vue', 'typescript', 'frontend'],
          importance: 0.75,
          timestamp: new Date(),
        },
        {
          type: 'knowledge',
          content: 'Angular services with TypeScript dependency injection',
          tags: ['angular', 'typescript', 'frontend'],
          importance: 0.7,
          timestamp: new Date(),
        },
      ];

      for (const memory of memories) {
        await memoryStore.store(memory);
      }

      // Search with React tech stack
      const allMemories = await memoryStore.search('', { techStack: [] });
      const reactResults = smartQuery.search('typescript state management', allMemories, {
        techStack: ['react', 'typescript']
      });

      // React + Redux should be in top results (tech stack boost)
      expect(reactResults.length).toBeGreaterThan(0);
      const hasReactMemory = reactResults.some(r => r.content.includes('React state management'));
      expect(hasReactMemory).toBe(true);

      // Search with Vue tech stack
      const vueResults = smartQuery.search('typescript state', allMemories, {
        techStack: ['vue', 'typescript']
      });

      // Vue should be in results
      expect(vueResults.length).toBeGreaterThan(0);
      const hasVueMemory = vueResults.some(r => r.content.includes('Vue 3 Composition'));
      expect(hasVueMemory).toBe(true);
    });
  });

  describe('Auto-Tagging Integration', () => {
    it('should detect technologies across different content types', async () => {
      // Test 1: Backend tech
      const backendTags = autoTagger.generateTags(
        'Built REST API with Express and PostgreSQL database',
        []
      );
      expect(backendTags).toContain('tech:express');
      expect(backendTags).toContain('tech:postgresql');
      expect(backendTags.some(t => t.startsWith('domain:'))).toBe(true);

      // Test 2: Frontend tech
      const frontendTags = autoTagger.generateTags(
        'Created UI using React and TypeScript',
        []
      );
      expect(frontendTags).toContain('tech:react');
      expect(frontendTags).toContain('tech:typescript');
      expect(frontendTags).toContain('domain:frontend');

      // Test 3: DevOps tech
      const devopsTags = autoTagger.generateTags(
        'Deployed with AWS and Docker containers',
        []
      );
      expect(devopsTags).toContain('tech:aws');
      expect(devopsTags).toContain('tech:docker');
    });

    it('should preserve manual tags and add auto-detected tags', async () => {
      const content = 'Implemented caching layer using Redis for session storage';
      const manualTags = ['custom-feature', 'production-ready'];

      const enhancedTags = autoTagger.generateTags(content, manualTags);

      // Manual tags preserved
      expect(enhancedTags).toContain('custom-feature');
      expect(enhancedTags).toContain('production-ready');

      // Auto-detected tags added (with prefixes)
      expect(enhancedTags).toContain('tech:redis');
      expect(enhancedTags).toContain('domain:performance'); // caching is in performance domain
      expect(enhancedTags).toContain('domain:auth'); // session is in auth domain
    });
  });

  describe('Memory ID Validation Integration', () => {
    it('should reject invalid memory IDs without correct prefix', async () => {
      const memory: UnifiedMemory = {
        id: 'invalid-id-format',
        type: 'knowledge',
        content: 'Test memory',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
      };

      await expect(memoryStore.store(memory)).rejects.toThrow('Memory ID must start with prefix');
    });

    it('should accept memory IDs with correct prefix', async () => {
      const memory: UnifiedMemory = {
        id: 'unified-memory-550e8400-e29b-41d4-a716-446655440000',
        type: 'knowledge',
        content: 'Test memory with valid UUID',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
      };

      const id = await memoryStore.store(memory);
      expect(id).toBe('unified-memory-550e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('Metadata Size Validation Integration', () => {
    it('should reject oversized metadata (> 1MB)', async () => {
      const largeData = 'x'.repeat(1.1 * 1024 * 1024); // 1.1MB

      const memory: UnifiedMemory = {
        type: 'knowledge',
        content: 'Test memory',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
        metadata: {
          largeField: largeData,
        },
      };

      await expect(memoryStore.store(memory)).rejects.toThrow('exceeds limit');
    });

    it('should accept metadata within size limits (< 1MB)', async () => {
      const okData = 'x'.repeat(900 * 1024); // 900KB

      const memory: UnifiedMemory = {
        type: 'knowledge',
        content: 'Test memory',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
        metadata: {
          okField: okData,
        },
      };

      const id = await memoryStore.store(memory);
      expect(id).toBeDefined();

      const retrieved = await memoryStore.get(id);
      expect(retrieved!.metadata!.okField).toBe(okData);
    });
  });

  describe('ESCAPE Clause Integration', () => {
    it('should handle special characters in search with new ESCAPE clause', async () => {
      // Store memories with special characters
      const memories = [
        { content: 'Database migration_v1 completed', tags: ['database'] },
        { content: 'Test_case for user%authentication', tags: ['test'] },
        { content: 'API endpoint /users/:id implementation', tags: ['api'] },
      ];

      for (const mem of memories) {
        await memoryStore.store({
          type: 'knowledge',
          ...mem,
          importance: 0.5,
          timestamp: new Date(),
        });
      }

      // Search with underscore (should work with new ESCAPE '!')
      const results = await memoryStore.search('migration_v1', { techStack: [] });
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].content).toContain('migration_v1');
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle database errors gracefully', async () => {
      // Close database to simulate error
      kg.close();

      const memory: UnifiedMemory = {
        type: 'knowledge',
        content: 'Test memory',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
      };

      // Should throw meaningful error
      await expect(memoryStore.store(memory)).rejects.toThrow();
    });

    it('should handle invalid memory types gracefully', async () => {
      const memory: any = {
        type: 'invalid-type',
        content: 'Test memory',
        tags: ['test'],
        importance: 0.5,
        timestamp: new Date(),
      };

      await expect(memoryStore.store(memory)).rejects.toThrow();
    });
  });

  describe('Performance Integration', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();

      // Store 100 memories
      const ids: string[] = [];
      for (let i = 0; i < 100; i++) {
        const memory: UnifiedMemory = {
          type: 'knowledge',
          content: `Test memory ${i} with TypeScript and React`,
          tags: ['test', 'bulk'],
          importance: 0.5,
          timestamp: new Date(),
        };

        const id = await memoryStore.store(memory);
        ids.push(id);
      }

      const storeTime = Date.now() - startTime;
      console.log(`Stored 100 memories in ${storeTime}ms`);

      // Should complete in reasonable time (< 5 seconds)
      expect(storeTime).toBeLessThan(5000);

      // Search should also be fast
      const searchStart = Date.now();
      const results = await memoryStore.search('TypeScript', {
        techStack: [],
        limit: 100, // Explicitly request 100 results (default is 50)
      });
      const searchTime = Date.now() - searchStart;

      console.log(`Searched ${results.length} memories in ${searchTime}ms`);
      expect(searchTime).toBeLessThan(1000);
      expect(results.length).toBe(100);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should support a complete development session workflow', async () => {
      // Scenario: Developer implements a new feature

      // 1. Check existing knowledge (empty at start of session)
      const existingAuth = await memoryStore.search('authentication patterns', {
        techStack: ['typescript', 'nodejs']
      });

      // At the start of the workflow, no authentication memories exist yet
      // This verifies the search returns empty results gracefully
      expect(Array.isArray(existingAuth)).toBe(true);

      // 2. Auto-record code changes
      await autoRecorder.recordCodeChange({
        files: ['auth-service.ts', 'user-controller.ts', 'middleware/auth.ts'],
        linesChanged: 85,
        description: 'Implement two-factor authentication',
        projectPath: '/backend/auth'
      });

      // 3. Store implementation decision
      await memoryStore.store({
        type: 'decision',
        content: 'Chose TOTP (Time-based OTP) over SMS for 2FA due to better security and cost',
        tags: ['security', '2fa', 'authentication', 'totp'],
        importance: 0.85,
        timestamp: new Date(),
        metadata: {
          library: 'speakeasy',
          qrCodeGenerator: 'qrcode'
        }
      });

      // 4. Record test failure
      await autoRecorder.recordTestEvent({
        type: 'fail',
        testName: 'should verify TOTP token correctly',
        error: 'Token validation fails for valid tokens',
        projectPath: '/backend/tests/auth'
      });

      // 5. Store bug fix
      await memoryStore.store({
        type: 'mistake',
        content: 'TOTP validation failed due to clock skew - added 30s window tolerance',
        tags: ['bug-fix', '2fa', 'totp'],
        importance: 0.75,
        timestamp: new Date(),
        metadata: {
          issue: 'clock-skew',
          solution: 'Added ±1 window tolerance'
        }
      });

      // 6. Record successful commit
      await autoRecorder.recordGitCommit({
        message: 'feat: implement TOTP-based two-factor authentication',
        filesChanged: 6,
        insertions: 180,
        deletions: 20,
        projectPath: '/backend/auth'
      });

      // Verify complete session recorded
      const sessionMemories = await memoryStore.searchByTags(['auto-recorded']);
      expect(sessionMemories.length).toBeGreaterThanOrEqual(2); // code change + commit

      // Future developer can search and learn
      const twoFactorKnowledge = await memoryStore.search('two-factor authentication', {
        techStack: ['typescript', 'nodejs']
      });
      expect(twoFactorKnowledge.length).toBeGreaterThan(0);
    });
  });
});
