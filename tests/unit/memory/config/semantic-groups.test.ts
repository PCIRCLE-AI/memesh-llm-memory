/**
 * Semantic Groups Configuration Tests
 *
 * Tests for semantic group configuration used in ProactiveReminder.
 */

import { describe, it, expect } from 'vitest';
import {
  SEMANTIC_GROUPS,
  getSemanticGroups,
  findSemanticGroup,
  areSemanticallySimilar,
  type SemanticGroup,
} from '../../../../src/memory/config/semantic-groups.js';

describe('Semantic Groups Configuration', () => {
  describe('SEMANTIC_GROUPS', () => {
    it('should be a non-empty array', () => {
      expect(Array.isArray(SEMANTIC_GROUPS)).toBe(true);
      expect(SEMANTIC_GROUPS.length).toBeGreaterThan(0);
    });

    it('should contain only string arrays', () => {
      for (const group of SEMANTIC_GROUPS) {
        expect(Array.isArray(group)).toBe(true);
        expect(group.length).toBeGreaterThan(0);
        for (const word of group) {
          expect(typeof word).toBe('string');
        }
      }
    });

    it('should have expected semantic groups for file operations', () => {
      // Check for edit/modify group
      const editGroup = SEMANTIC_GROUPS.find((group) => group.includes('edit'));
      expect(editGroup).toBeDefined();
      expect(editGroup).toContain('modify');
      expect(editGroup).toContain('change');
      expect(editGroup).toContain('update');
    });

    it('should have expected semantic groups for testing', () => {
      // Check for test group
      const testGroup = SEMANTIC_GROUPS.find((group) => group.includes('test'));
      expect(testGroup).toBeDefined();
      expect(testGroup).toContain('tests');
      expect(testGroup).toContain('testing');
    });

    it('should have expected semantic groups for verification', () => {
      // Check for verify group
      const verifyGroup = SEMANTIC_GROUPS.find((group) => group.includes('verify'));
      expect(verifyGroup).toBeDefined();
      expect(verifyGroup).toContain('check');
      expect(verifyGroup).toContain('verified');
    });

    it('should not have duplicate words across groups', () => {
      const allWords = new Set<string>();
      const duplicates: string[] = [];

      for (const group of SEMANTIC_GROUPS) {
        for (const word of group) {
          if (allWords.has(word)) {
            duplicates.push(word);
          }
          allWords.add(word);
        }
      }

      expect(duplicates).toEqual([]);
    });
  });

  describe('getSemanticGroups()', () => {
    it('should return the same array as SEMANTIC_GROUPS', () => {
      const groups = getSemanticGroups();
      expect(groups).toBe(SEMANTIC_GROUPS);
    });

    it('should return non-empty array', () => {
      const groups = getSemanticGroups();
      expect(groups.length).toBeGreaterThan(0);
    });
  });

  describe('findSemanticGroup()', () => {
    it('should find group for known keywords', () => {
      const editGroup = findSemanticGroup('edit');
      expect(editGroup).toBeDefined();
      expect(editGroup).toContain('edit');
      expect(editGroup).toContain('modify');
    });

    it('should return undefined for unknown keywords', () => {
      const unknownGroup = findSemanticGroup('unknownkeyword123');
      expect(unknownGroup).toBeUndefined();
    });

    it('should find group for all words in edit group', () => {
      const editWords = ['edit', 'modify', 'change', 'update'];
      for (const word of editWords) {
        const group = findSemanticGroup(word);
        expect(group).toBeDefined();
        expect(group).toContain(word);
      }
    });

    it('should find group for all words in test group', () => {
      const testWords = ['test', 'tests', 'testing'];
      for (const word of testWords) {
        const group = findSemanticGroup(word);
        expect(group).toBeDefined();
        expect(group).toContain(word);
      }
    });
  });

  describe('areSemanticallySimilar()', () => {
    it('should return true for words in same group', () => {
      expect(areSemanticallySimilar('edit', 'modify')).toBe(true);
      expect(areSemanticallySimilar('test', 'testing')).toBe(true);
      expect(areSemanticallySimilar('verify', 'check')).toBe(true);
    });

    it('should return false for words in different groups', () => {
      expect(areSemanticallySimilar('edit', 'test')).toBe(false);
      expect(areSemanticallySimilar('verify', 'delete')).toBe(false);
      expect(areSemanticallySimilar('run', 'add')).toBe(false);
    });

    it('should return false for unknown keywords', () => {
      expect(areSemanticallySimilar('unknown1', 'unknown2')).toBe(false);
      expect(areSemanticallySimilar('edit', 'unknown')).toBe(false);
    });

    it('should be symmetric', () => {
      // If A is similar to B, then B should be similar to A
      expect(areSemanticallySimilar('edit', 'modify')).toBe(
        areSemanticallySimilar('modify', 'edit')
      );
      expect(areSemanticallySimilar('test', 'testing')).toBe(
        areSemanticallySimilar('testing', 'test')
      );
    });

    it('should be reflexive for known keywords', () => {
      // A word should be similar to itself
      expect(areSemanticallySimilar('edit', 'edit')).toBe(true);
      expect(areSemanticallySimilar('test', 'test')).toBe(true);
    });
  });

  describe('Configuration extensibility', () => {
    it('should support adding new semantic groups', () => {
      // This test verifies the structure allows easy extension
      const newGroup: SemanticGroup = ['build', 'compile', 'bundle'];

      // Verify the type system allows this
      expect(Array.isArray(newGroup)).toBe(true);
      expect(newGroup.length).toBeGreaterThan(0);

      // Future developers can add new groups to SEMANTIC_GROUPS array
      // without changing the type structure
    });

    it('should have comprehensive coverage of common operations', () => {
      // Verify we have semantic groups for common development operations
      const expectedOperations = [
        'edit', // File modification
        'test', // Testing
        'verify', // Verification
        'run', // Execution
        'complete', // Completion
        'add', // Creation
        'delete', // Deletion
      ];

      for (const operation of expectedOperations) {
        const group = findSemanticGroup(operation);
        expect(group).toBeDefined();
      }
    });
  });

  describe('Integration with ProactiveReminder', () => {
    it('should support keyword matching for operation similarity', () => {
      // Simulating how ProactiveReminder uses semantic groups
      const operationKeyword = 'edit';
      const mistakeKeyword = 'modified';

      // These should be in the same semantic group
      const operationGroup = findSemanticGroup(operationKeyword);
      const mistakeGroup = findSemanticGroup(mistakeKeyword);

      expect(operationGroup).toBe(mistakeGroup);
      expect(areSemanticallySimilar(operationKeyword, mistakeKeyword)).toBe(true);
    });

    it('should help identify related mistakes by semantic similarity', () => {
      // Example: User operation "run tests" should match mistake "forgot to execute tests"
      const runGroup = findSemanticGroup('run');
      const executeGroup = findSemanticGroup('execute');

      expect(runGroup).toBe(executeGroup);
      expect(areSemanticallySimilar('run', 'execute')).toBe(true);
    });
  });
});
