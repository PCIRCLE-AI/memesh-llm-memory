/**
 * BuiltInRules Tests
 *
 * TDD tests for pre-defined prevention rules.
 * These tests define the expected behavior before implementation.
 *
 * Test coverage:
 * - BUILT_IN_RULES contains 3 rules
 * - getBuiltInRule(id) returns correct rule
 * - getAllBuiltInRules() returns all rules
 * - evaluateRule() detects violations
 * - i18n keys resolve correctly
 */

import { describe, it, expect } from 'vitest';
import {
  BUILT_IN_RULES,
  getBuiltInRule,
  getAllBuiltInRules,
  evaluateRule,
  type PreventionRule,
  type ToolOperation,
  type RuleEvaluationResult,
} from '../../../src/memory/BuiltInRules.js';
import { en } from '../../../src/i18n/locales/en.js';
import { zhTW } from '../../../src/i18n/locales/zh-TW.js';
import { zhCN } from '../../../src/i18n/locales/zh-CN.js';
import { ja } from '../../../src/i18n/locales/ja.js';

describe('BuiltInRules', () => {
  describe('BUILT_IN_RULES constant', () => {
    it('should contain exactly 3 built-in rules', () => {
      expect(BUILT_IN_RULES).toHaveLength(3);
    });

    it('should have unique IDs for all rules', () => {
      const ids = BUILT_IN_RULES.map((rule) => rule.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(BUILT_IN_RULES.length);
    });

    it('should have all required fields for each rule', () => {
      for (const rule of BUILT_IN_RULES) {
        expect(rule.id).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.category).toBeDefined();
        expect(rule.trigger).toBeDefined();
        expect(rule.check).toBeDefined();
        expect(rule.action).toBeDefined();
        expect(rule.sourceMistakeIds).toContain('built-in');
        expect(rule.confidence).toBe('high');
        expect(rule.hitCount).toBe(0);
        expect(rule.createdAt).toBeInstanceOf(Date);
      }
    });
  });

  describe('getBuiltInRule()', () => {
    it('should return the read-before-edit rule', () => {
      const rule = getBuiltInRule('read-before-edit');

      expect(rule).not.toBeNull();
      expect(rule!.id).toBe('read-before-edit');
      expect(rule!.name).toBe('Read Before Edit');
      expect(rule!.category).toBe('read-before-edit');
      expect(rule!.trigger.tools).toContain('Edit');
      expect(rule!.trigger.tools).toContain('Write');
      expect(rule!.check.type).toBe('pre-condition');
      expect(rule!.check.severity).toBe('critical');
      expect(rule!.action.type).toBe('block');
    });

    it('should return the verify-before-claim rule', () => {
      const rule = getBuiltInRule('verify-before-claim');

      expect(rule).not.toBeNull();
      expect(rule!.id).toBe('verify-before-claim');
      expect(rule!.name).toBe('Run Before Claim');
      expect(rule!.category).toBe('verification');
      expect(rule!.trigger.contexts).toContain('complete');
      expect(rule!.trigger.contexts).toContain('done');
      expect(rule!.trigger.contexts).toContain('finished');
      expect(rule!.trigger.contexts).toContain('fixed');
      expect(rule!.check.type).toBe('context-check');
      expect(rule!.check.severity).toBe('high');
      expect(rule!.action.type).toBe('require-confirmation');
    });

    it('should return the no-scope-creep rule', () => {
      const rule = getBuiltInRule('no-scope-creep');

      expect(rule).not.toBeNull();
      expect(rule!.id).toBe('no-scope-creep');
      expect(rule!.name).toBe('No Scope Creep');
      expect(rule!.category).toBe('scope-creep');
      expect(rule!.trigger.tools).toContain('Edit');
      expect(rule!.trigger.tools).toContain('Write');
      expect(rule!.check.type).toBe('context-check');
      expect(rule!.check.severity).toBe('medium');
      expect(rule!.action.type).toBe('warn');
    });

    it('should return null for non-existent rule ID', () => {
      const rule = getBuiltInRule('non-existent-rule');
      expect(rule).toBeNull();
    });
  });

  describe('getAllBuiltInRules()', () => {
    it('should return all 3 built-in rules', () => {
      const rules = getAllBuiltInRules();
      expect(rules).toHaveLength(3);
    });

    it('should return a copy of the rules array', () => {
      const rules1 = getAllBuiltInRules();
      const rules2 = getAllBuiltInRules();
      expect(rules1).not.toBe(rules2);
    });

    it('should not allow modification of original rules', () => {
      const rules = getAllBuiltInRules();
      rules.push({} as PreventionRule);
      expect(getAllBuiltInRules()).toHaveLength(3);
    });
  });

  describe('evaluateRule()', () => {
    describe('read-before-edit rule', () => {
      it('should detect Edit without Read violation', () => {
        const rule = getBuiltInRule('read-before-edit')!;
        const operation: ToolOperation = {
          tool: 'Edit',
          targetFile: '/path/to/file.ts',
          filesRead: [], // No files read
          context: '',
        };

        const result = evaluateRule(rule, operation);

        expect(result.violated).toBe(true);
        expect(result.severity).toBe('critical');
        expect(result.messageKey).toBe('ccb.rule.readBeforeEdit');
        expect(result.suggestionKey).toBe('ccb.rule.readBeforeEdit.suggestion');
      });

      it('should detect Write without Read violation', () => {
        const rule = getBuiltInRule('read-before-edit')!;
        const operation: ToolOperation = {
          tool: 'Write',
          targetFile: '/path/to/new-file.ts',
          filesRead: ['/path/to/other-file.ts'], // Different file read
          context: '',
        };

        const result = evaluateRule(rule, operation);

        expect(result.violated).toBe(true);
        expect(result.severity).toBe('critical');
      });

      it('should pass when file was read before Edit', () => {
        const rule = getBuiltInRule('read-before-edit')!;
        const operation: ToolOperation = {
          tool: 'Edit',
          targetFile: '/path/to/file.ts',
          filesRead: ['/path/to/file.ts'], // Same file read
          context: '',
        };

        const result = evaluateRule(rule, operation);

        expect(result.violated).toBe(false);
      });

      it('should not apply to non-Edit/Write tools', () => {
        const rule = getBuiltInRule('read-before-edit')!;
        const operation: ToolOperation = {
          tool: 'Read',
          targetFile: '/path/to/file.ts',
          filesRead: [],
          context: '',
        };

        const result = evaluateRule(rule, operation);

        expect(result.violated).toBe(false);
        expect(result.applicable).toBe(false);
      });
    });

    describe('verify-before-claim rule', () => {
      it('should detect claiming completion without verification', () => {
        const rule = getBuiltInRule('verify-before-claim')!;
        const operation: ToolOperation = {
          tool: 'Response',
          targetFile: '',
          filesRead: [],
          context: 'I have fixed the bug and it is now complete',
          hasVerificationStep: false,
        };

        const result = evaluateRule(rule, operation);

        expect(result.violated).toBe(true);
        expect(result.severity).toBe('high');
        expect(result.messageKey).toBe('ccb.rule.verifyBeforeClaim');
      });

      it('should pass when verification step was performed', () => {
        const rule = getBuiltInRule('verify-before-claim')!;
        const operation: ToolOperation = {
          tool: 'Response',
          targetFile: '',
          filesRead: [],
          context: 'The task is done and verified',
          hasVerificationStep: true,
        };

        const result = evaluateRule(rule, operation);

        expect(result.violated).toBe(false);
      });

      it('should not apply to contexts without completion keywords', () => {
        const rule = getBuiltInRule('verify-before-claim')!;
        const operation: ToolOperation = {
          tool: 'Response',
          targetFile: '',
          filesRead: [],
          context: 'Let me analyze this problem',
          hasVerificationStep: false,
        };

        const result = evaluateRule(rule, operation);

        expect(result.violated).toBe(false);
        expect(result.applicable).toBe(false);
      });
    });

    describe('no-scope-creep rule', () => {
      it('should detect modifying more files than expected', () => {
        const rule = getBuiltInRule('no-scope-creep')!;
        const operation: ToolOperation = {
          tool: 'Edit',
          targetFile: '/path/to/file5.ts',
          filesRead: [],
          context: '',
          modifiedFiles: [
            '/path/to/file1.ts',
            '/path/to/file2.ts',
            '/path/to/file3.ts',
            '/path/to/file4.ts',
            '/path/to/file5.ts',
          ],
          expectedScope: 2,
        };

        const result = evaluateRule(rule, operation);

        expect(result.violated).toBe(true);
        expect(result.severity).toBe('medium');
        expect(result.messageKey).toBe('ccb.rule.scopeCreep');
      });

      it('should pass when modifications are within expected scope', () => {
        const rule = getBuiltInRule('no-scope-creep')!;
        const operation: ToolOperation = {
          tool: 'Edit',
          targetFile: '/path/to/file.ts',
          filesRead: [],
          context: '',
          modifiedFiles: ['/path/to/file.ts'],
          expectedScope: 3,
        };

        const result = evaluateRule(rule, operation);

        expect(result.violated).toBe(false);
      });

      it('should use default scope when not specified', () => {
        const rule = getBuiltInRule('no-scope-creep')!;
        const operation: ToolOperation = {
          tool: 'Write',
          targetFile: '/path/to/file.ts',
          filesRead: [],
          context: '',
          modifiedFiles: ['/path/to/file1.ts', '/path/to/file2.ts', '/path/to/file3.ts'],
          // expectedScope not specified, should use default (5)
        };

        const result = evaluateRule(rule, operation);

        expect(result.violated).toBe(false);
      });
    });
  });

  describe('i18n message keys', () => {
    const requiredKeys = [
      'ccb.rule.readBeforeEdit',
      'ccb.rule.readBeforeEdit.suggestion',
      'ccb.rule.verifyBeforeClaim',
      'ccb.rule.verifyBeforeClaim.suggestion',
      'ccb.rule.scopeCreep',
      'ccb.rule.scopeCreep.suggestion',
    ];

    describe('English locale', () => {
      it.each(requiredKeys)('should have key: %s', (key) => {
        expect(en[key]).toBeDefined();
        expect(typeof en[key]).toBe('string');
        expect(en[key].length).toBeGreaterThan(0);
      });
    });

    describe('Traditional Chinese locale', () => {
      it.each(requiredKeys)('should have key: %s', (key) => {
        expect(zhTW[key]).toBeDefined();
        expect(typeof zhTW[key]).toBe('string');
        expect(zhTW[key].length).toBeGreaterThan(0);
      });
    });

    describe('Simplified Chinese locale', () => {
      it.each(requiredKeys)('should have key: %s', (key) => {
        expect(zhCN[key]).toBeDefined();
        expect(typeof zhCN[key]).toBe('string');
        expect(zhCN[key].length).toBeGreaterThan(0);
      });
    });

    describe('Japanese locale', () => {
      it.each(requiredKeys)('should have key: %s', (key) => {
        expect(ja[key]).toBeDefined();
        expect(typeof ja[key]).toBe('string');
        expect(ja[key].length).toBeGreaterThan(0);
      });
    });

    it('should have CCB branding in messages', () => {
      expect(en['ccb.rule.readBeforeEdit']).toContain('CCB');
      expect(en['ccb.rule.verifyBeforeClaim']).toContain('CCB');
      expect(en['ccb.rule.scopeCreep']).toContain('CCB');
    });
  });
});
