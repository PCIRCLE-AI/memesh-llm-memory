/**
 * KGSearchEngine Unit Tests
 *
 * Tests the extracted search engine in isolation from KnowledgeGraph.
 * Uses KnowledgeGraph.createSync() to set up a real DB, then verifies
 * search behavior through the KG's delegation to KGSearchEngine.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KnowledgeGraph } from '../index.js';
import { KGSearchEngine } from '../KGSearchEngine.js';
import type { KGSearchEngineContext } from '../KGSearchEngine.js';
import { existsSync, unlinkSync } from 'fs';
import Database from 'better-sqlite3';
import { QueryCache } from '../../db/QueryCache.js';

describe('KGSearchEngine', () => {
  // ============================================================================
  // 1. Unit tests for pure helper methods (no DB needed)
  // ============================================================================
  describe('escapeLikePattern', () => {
    let engine: KGSearchEngine;

    beforeEach(() => {
      // Create a minimal context - helpers don't need DB
      const db = new Database(':memory:');
      const cache = new QueryCache<string, any>({ maxSize: 10, defaultTTL: 1000 });
      const ctx: KGSearchEngineContext = {
        db,
        getVectorAdapter: () => null,
        isVectorEnabled: () => false,
        getVectorInitPromise: () => null,
        getEntity: () => null,
        queryCache: cache,
      };
      engine = new KGSearchEngine(ctx);
    });

    it('should escape exclamation marks first', () => {
      expect(engine.escapeLikePattern('hello!')).toBe('hello!!');
    });

    it('should escape percent signs', () => {
      expect(engine.escapeLikePattern('100%')).toBe('100!%');
    });

    it('should escape underscores', () => {
      expect(engine.escapeLikePattern('user_name')).toBe('user!_name');
    });

    it('should escape brackets', () => {
      expect(engine.escapeLikePattern('[test]')).toBe('![test!]');
    });

    it('should handle multiple special characters', () => {
      // ! -> !!, _ -> !_, % -> !%, [ -> ![, ] -> !]
      // Input: !_%[] -> !! then !_ then !% then ![ then !] = !!!_!%![!]
      expect(engine.escapeLikePattern('!_%[]')).toBe('!!!_!%![!]');
    });

    it('should return empty string for empty input', () => {
      expect(engine.escapeLikePattern('')).toBe('');
    });

    it('should throw for non-string input', () => {
      expect(() => engine.escapeLikePattern(123 as unknown as string)).toThrow('Pattern must be a string');
    });
  });

  describe('prepareFTS5Query', () => {
    let engine: KGSearchEngine;

    beforeEach(() => {
      const db = new Database(':memory:');
      const cache = new QueryCache<string, any>({ maxSize: 10, defaultTTL: 1000 });
      const ctx: KGSearchEngineContext = {
        db,
        getVectorAdapter: () => null,
        isVectorEnabled: () => false,
        getVectorInitPromise: () => null,
        getEntity: () => null,
        queryCache: cache,
      };
      engine = new KGSearchEngine(ctx);
    });

    it('should return empty string for empty query', () => {
      expect(engine.prepareFTS5Query('')).toBe('');
      expect(engine.prepareFTS5Query('   ')).toBe('');
    });

    it('should wrap single token with quotes and prefix star', () => {
      expect(engine.prepareFTS5Query('hello')).toBe('"hello"*');
    });

    it('should join multiple tokens with OR', () => {
      expect(engine.prepareFTS5Query('hello world')).toBe('"hello"* OR "world"*');
    });

    it('should filter out FTS5 operators (AND, OR, NOT, NEAR)', () => {
      expect(engine.prepareFTS5Query('hello AND world')).toBe('"hello"* OR "world"*');
      expect(engine.prepareFTS5Query('NOT bad OR good')).toBe('"bad"* OR "good"*');
      expect(engine.prepareFTS5Query('NEAR something')).toBe('"something"*');
    });

    it('should escape double quotes', () => {
      // Input: "quoted" -> after escaping " to "": ""quoted"" -> wrapped: """quoted"""*
      expect(engine.prepareFTS5Query('"quoted"')).toBe('"""quoted"""*');
    });

    it('should strip wildcards, carets, colons, brackets', () => {
      expect(engine.prepareFTS5Query('test*')).toBe('"test"*');
      expect(engine.prepareFTS5Query('col:value')).toBe('"colvalue"*');
      expect(engine.prepareFTS5Query('(grouped)')).toBe('"grouped"*');
    });

    it('should skip tokens that become empty after escaping', () => {
      expect(engine.prepareFTS5Query('*** ()')).toBe('');
    });

    it('should truncate overly long queries', () => {
      const longQuery = 'a '.repeat(200); // 200 tokens
      const result = engine.prepareFTS5Query(longQuery);
      // Should be limited to 100 tokens
      const tokenCount = result.split(' OR ').length;
      expect(tokenCount).toBeLessThanOrEqual(100);
    });
  });

  // ============================================================================
  // 2. Integration tests via KnowledgeGraph delegation
  // ============================================================================
  describe('searchEntities (via KG delegation)', () => {
    let kg: KnowledgeGraph;
    const testDbPath = './data/test-kg-search-engine.db';

    beforeEach(async () => {
      if (existsSync(testDbPath)) {
        unlinkSync(testDbPath);
      }
      kg = KnowledgeGraph.createSync(testDbPath);
    });

    afterEach(() => {
      kg.close();
      if (existsSync(testDbPath)) {
        unlinkSync(testDbPath);
      }
    });

    it('should find entities by name pattern', () => {
      kg.createEntity({
        name: 'Search Engine Test Entity',
        entityType: 'feature',
        observations: ['Testing the KGSearchEngine extraction'],
      });

      const results = kg.searchEntities({ namePattern: 'Search Engine' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Search Engine Test Entity');
    });

    it('should find entities by entity type', () => {
      kg.createEntity({ name: 'Bug1', entityType: 'bug_fix', observations: ['fix'] });
      kg.createEntity({ name: 'Feature1', entityType: 'feature', observations: ['feat'] });

      const results = kg.searchEntities({ entityType: 'bug_fix' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Bug1');
    });

    it('should respect limit parameter', () => {
      for (let i = 0; i < 5; i++) {
        kg.createEntity({ name: `LimitTest${i}`, entityType: 'feature', observations: [`obs ${i}`] });
      }

      const results = kg.searchEntities({ limit: 3 });
      expect(results).toHaveLength(3);
    });

    it('should return empty array for limit 0', () => {
      kg.createEntity({ name: 'Test', entityType: 'feature', observations: ['obs'] });
      const results = kg.searchEntities({ limit: 0 });
      expect(results).toHaveLength(0);
    });

    it('should throw for negative limit', () => {
      expect(() => kg.searchEntities({ limit: -1 })).toThrow('non-negative');
    });

    it('should throw for negative offset', () => {
      expect(() => kg.searchEntities({ offset: -1 })).toThrow('non-negative');
    });

    it('should find entities by observation content', () => {
      kg.createEntity({
        name: 'HiddenContent',
        entityType: 'decision',
        observations: ['unique_xyzabc_keyword in observations only'],
      });

      const results = kg.searchEntities({ namePattern: 'unique_xyzabc_keyword' });
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('HiddenContent');
    });
  });

  // ============================================================================
  // 3. Semantic/hybrid search fallback (controlled context, no vector adapter)
  // ============================================================================
  describe('semanticSearch fallback (controlled context)', () => {
    let kg: KnowledgeGraph;
    const testDbPath = './data/test-kg-search-semantic.db';

    beforeEach(async () => {
      if (existsSync(testDbPath)) {
        unlinkSync(testDbPath);
      }
      kg = KnowledgeGraph.createSync(testDbPath);
    });

    afterEach(() => {
      kg.close();
      if (existsSync(testDbPath)) {
        unlinkSync(testDbPath);
      }
    });

    it('should fall back to keyword search in KGSearchEngine when vector is disabled', async () => {
      // Create a KGSearchEngine with vector explicitly disabled
      const cache = new QueryCache<string, any>({ maxSize: 100, defaultTTL: 5000 });

      // First create entity using KG
      kg.createEntity({
        name: 'Semantic Fallback Test',
        entityType: 'feature',
        observations: ['Testing semantic search fallback path'],
      });

      // Create a search engine with vector disabled (controlled context)
      const engine = new KGSearchEngine({
        db: (kg as any).db, // Access internal db for testing
        getVectorAdapter: () => null,
        isVectorEnabled: () => false,
        getVectorInitPromise: () => null,
        getEntity: (name: string) => kg.getEntity(name),
        queryCache: cache,
      });

      const results = await engine.semanticSearch('Semantic Fallback');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].entity.name).toBe('Semantic Fallback Test');
      expect(results[0].similarity).toBe(0.5); // Keyword fallback uses 0.5
    });

    it('should fall back in hybridSearch when vector is disabled', async () => {
      const cache = new QueryCache<string, any>({ maxSize: 100, defaultTTL: 5000 });

      kg.createEntity({
        name: 'Hybrid Test Entity',
        entityType: 'feature',
        observations: ['Testing hybrid search'],
      });

      const engine = new KGSearchEngine({
        db: (kg as any).db,
        getVectorAdapter: () => null,
        isVectorEnabled: () => false,
        getVectorInitPromise: () => null,
        getEntity: (name: string) => kg.getEntity(name),
        queryCache: cache,
      });

      const results = await engine.hybridSearch('Hybrid Test');
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].entity.name).toBe('Hybrid Test Entity');
      expect(results[0].similarity).toBe(0.5);
    });
  });

  // ============================================================================
  // 4. KGSearchEngine context contract
  // ============================================================================
  describe('context contract', () => {
    it('should create KGSearchEngine with valid context', () => {
      const db = new Database(':memory:');
      const cache = new QueryCache<string, any>({ maxSize: 10, defaultTTL: 1000 });
      const ctx: KGSearchEngineContext = {
        db,
        getVectorAdapter: () => null,
        isVectorEnabled: () => false,
        getVectorInitPromise: () => null,
        getEntity: () => null,
        queryCache: cache,
      };

      const engine = new KGSearchEngine(ctx);
      expect(engine).toBeDefined();
      expect(engine.searchFTS5).toBeDefined();
      expect(engine.prepareFTS5Query).toBeDefined();
      expect(engine.escapeLikePattern).toBeDefined();
      expect(engine.searchEntities).toBeDefined();
      expect(engine.semanticSearch).toBeDefined();
      expect(engine.hybridSearch).toBeDefined();
      expect(engine.keywordSearchAsSemanticResults).toBeDefined();

      db.close();
    });
  });
});
