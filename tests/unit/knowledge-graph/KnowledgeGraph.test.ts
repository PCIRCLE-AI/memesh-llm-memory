/**
 * KnowledgeGraph ESCAPE Clause Tests
 *
 * Tests for pattern escaping in LIKE queries to prevent SQL injection.
 * The KnowledgeGraph uses '!' as the ESCAPE character (safer than '\').
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KnowledgeGraph } from '../../../src/knowledge-graph/index.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('KnowledgeGraph - ESCAPE Clause Optimization', () => {
  let kg: KnowledgeGraph;
  let tempDbPath: string;

  beforeEach(() => {
    // Create temporary database for testing
    const testDir = path.join(os.tmpdir(), `kg-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    tempDbPath = path.join(testDir, 'test.db');
    // Use createSync for synchronous test setup
    kg = KnowledgeGraph.createSync(tempDbPath);
  });

  afterEach(() => {
    // Clean up
    kg.close();
    if (fs.existsSync(tempDbPath)) {
      fs.unlinkSync(tempDbPath);
    }
    const testDir = path.dirname(tempDbPath);
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Pattern Escaping', () => {
    it('should escape percent sign (%) - SQL wildcard for any sequence', () => {
      // Create test entities
      kg.createEntity({ name: '100% Complete', entityType: 'feature', observations: [] });
      kg.createEntity({ name: '50% Done', entityType: 'feature', observations: [] });
      kg.createEntity({ name: 'Totally Complete', entityType: 'feature', observations: [] });

      // Search for literal '%' - should match only entities with '%' character
      const results = kg.searchEntities({ namePattern: '%' });

      // Should match the two entities with '%' in name
      expect(results).toHaveLength(2);
      expect(results.map(e => e.name).sort()).toEqual(['100% Complete', '50% Done']);
    });

    it('should escape underscore (_) - SQL wildcard for single character', () => {
      // Create test entities
      kg.createEntity({ name: 'test_file', entityType: 'code_change', observations: [] });
      kg.createEntity({ name: 'test-file', entityType: 'code_change', observations: [] });
      kg.createEntity({ name: 'testXfile', entityType: 'code_change', observations: [] });

      // Search for literal '_' - should match only entities with '_' character
      const results = kg.searchEntities({ namePattern: '_' });

      // Should match only the entity with '_' in name
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('test_file');
    });

    it('should escape exclamation mark (!) - our ESCAPE character itself', () => {
      // Create test entities
      kg.createEntity({ name: 'Alert!', entityType: 'best_practice', observations: [] });
      kg.createEntity({ name: 'Warning!!', entityType: 'best_practice', observations: [] });
      kg.createEntity({ name: 'Info', entityType: 'best_practice', observations: [] });

      // Search for literal '!' - should match only entities with '!' character
      const results = kg.searchEntities({ namePattern: '!' });

      // Should match the two entities with '!' in name
      expect(results).toHaveLength(2);
      expect(results.map(e => e.name).sort()).toEqual(['Alert!', 'Warning!!']);
    });

    it('should escape left bracket ([) - SQL character class', () => {
      // Create test entities
      kg.createEntity({ name: 'Array[0]', entityType: 'code_change', observations: [] });
      kg.createEntity({ name: 'List[index]', entityType: 'code_change', observations: [] });
      kg.createEntity({ name: 'SimpleArray', entityType: 'code_change', observations: [] });

      // Search for literal '[' - should match only entities with '[' character
      const results = kg.searchEntities({ namePattern: '[' });

      // Should match the two entities with '[' in name
      expect(results).toHaveLength(2);
      expect(results.map(e => e.name).sort()).toEqual(['Array[0]', 'List[index]']);
    });

    it('should handle combined escaping - pattern with multiple special characters', () => {
      // Create test entities with multiple special characters
      kg.createEntity({ name: 'test_file[100%]!', entityType: 'problem_solution', observations: [] });
      kg.createEntity({ name: 'test-file-50', entityType: 'problem_solution', observations: [] });
      kg.createEntity({ name: 'other_document[50%]', entityType: 'problem_solution', observations: [] });

      // Search for pattern with multiple special characters that exists as substring
      // Pattern 'e[100%]!' exists in 'test_file[100%]!'
      // This should find exact match for the pattern, not use SQL wildcards
      const results = kg.searchEntities({ namePattern: 'e[100%]!' });

      // Should match only the entity with this exact substring
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('test_file[100%]!');
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection via LIKE patterns', () => {
      // Create test entities
      kg.createEntity({ name: 'normal-file', entityType: 'code_change', observations: [] });
      kg.createEntity({ name: 'test_file', entityType: 'code_change', observations: [] });

      // Try to inject SQL via pattern (should be safely escaped)
      // This pattern attempts to match any single character using SQL wildcard
      const results = kg.searchEntities({ namePattern: '_' });

      // Should NOT match 'normal-file' (where '_' would match any char)
      // Should ONLY match entities with literal '_' character
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('test_file');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty pattern', () => {
      kg.createEntity({ name: 'test1', entityType: 'feature', observations: [] });
      kg.createEntity({ name: 'test2', entityType: 'feature', observations: [] });

      const results = kg.searchEntities({ namePattern: '' });

      // Empty pattern should match all entities
      expect(results).toHaveLength(2);
    });

    it('should handle pattern with only special characters', () => {
      kg.createEntity({ name: '_%[!', entityType: 'decision', observations: [] });
      kg.createEntity({ name: 'normal', entityType: 'decision', observations: [] });

      const results = kg.searchEntities({ namePattern: '_%[!' });

      // Should match only the entity with all these characters
      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('_%[!');
    });

    it('should be case-sensitive when searching for special characters', () => {
      kg.createEntity({ name: 'Test_File', entityType: 'code_change', observations: [] });
      kg.createEntity({ name: 'test_file', entityType: 'code_change', observations: [] });

      const results = kg.searchEntities({ namePattern: '_' });

      // Should match both (case-insensitive for content, but both have '_')
      expect(results).toHaveLength(2);
    });
  });
});
