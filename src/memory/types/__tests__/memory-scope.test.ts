import { describe, it, expect } from 'vitest';
import type { UnifiedMemory } from '../unified-memory.js';
import {
  MemoryScope,
  type MemoryScopeMetadata,
  requiresProjectName,
  canHaveTechStack,
  canHaveDomain,
  getScopePriority,
  compareScopePriority,
  getScopeDescription,
  validateScopeMetadata,
  createScopeFilter,
} from '../memory-scope.js';

describe('MemoryScope', () => {
  describe('MemoryScope enum', () => {
    it('should contain all necessary scope levels', () => {
      expect(MemoryScope.GLOBAL).toBe('global');
      expect(MemoryScope.PROJECT).toBe('project');
      expect(MemoryScope.TECH_STACK).toBe('tech');
      expect(MemoryScope.DOMAIN).toBe('domain');
      expect(MemoryScope.SESSION).toBe('session');
    });

    it('should correctly define scope priority order (from high to low)', () => {
      // By design, priority from high to low should be: SESSION > DOMAIN > PROJECT > TECH_STACK > GLOBAL
      // This test verifies the existence of enum values
      const scopes = [
        MemoryScope.SESSION,
        MemoryScope.DOMAIN,
        MemoryScope.PROJECT,
        MemoryScope.TECH_STACK,
        MemoryScope.GLOBAL,
      ];

      expect(scopes).toHaveLength(5);
      expect(scopes.every(scope => typeof scope === 'string')).toBe(true);
    });
  });

  describe('MemoryScopeMetadata - GLOBAL scope', () => {
    it('should allow creating GLOBAL scope metadata', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.GLOBAL,
        category: ['security', 'privacy'],
      };

      expect(metadata.scope).toBe(MemoryScope.GLOBAL);
      expect(metadata.category).toContain('security');
      expect(metadata.category).toContain('privacy');
      expect(metadata.projectName).toBeUndefined();
      expect(metadata.techStack).toBeUndefined();
      expect(metadata.domain).toBeUndefined();
    });

    it('GLOBAL scope should not require projectName', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.GLOBAL,
      };

      expect(metadata.projectName).toBeUndefined();
    });

    it('should allow GLOBAL scope to have multiple categories', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.GLOBAL,
        category: ['best-practice', 'anti-pattern', 'coding-standard'],
      };

      expect(metadata.category).toHaveLength(3);
    });
  });

  describe('MemoryScopeMetadata - PROJECT scope', () => {
    it('should allow creating PROJECT scope metadata', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.PROJECT,
        projectName: 'claude-code-buddy',
        techStack: ['typescript', 'nodejs'],
        category: ['architecture'],
      };

      expect(metadata.scope).toBe(MemoryScope.PROJECT);
      expect(metadata.projectName).toBe('claude-code-buddy');
      expect(metadata.techStack).toContain('typescript');
      expect(metadata.techStack).toContain('nodejs');
      expect(metadata.category).toContain('architecture');
    });

    it('PROJECT scope should support techStack array', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.PROJECT,
        projectName: 'my-project',
        techStack: ['react', 'typescript', 'vite', 'vitest'],
      };

      expect(metadata.techStack).toHaveLength(4);
      expect(metadata.techStack).toContain('react');
    });

    it('PROJECT scope can include domain information', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.PROJECT,
        projectName: 'e-commerce-platform',
        domain: 'e-commerce',
        techStack: ['nextjs', 'stripe'],
      };

      expect(metadata.domain).toBe('e-commerce');
    });
  });

  describe('MemoryScopeMetadata - TECH_STACK scope', () => {
    it('should allow creating TECH_STACK scope metadata', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.TECH_STACK,
        techStack: ['react', 'typescript'],
        category: ['best-practice'],
      };

      expect(metadata.scope).toBe(MemoryScope.TECH_STACK);
      expect(metadata.techStack).toHaveLength(2);
      expect(metadata.category).toContain('best-practice');
    });

    it('TECH_STACK scope should support targeting a single technology', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.TECH_STACK,
        techStack: ['typescript'],
        category: ['type-safety', 'generics'],
      };

      expect(metadata.techStack).toHaveLength(1);
      expect(metadata.category).toHaveLength(2);
    });

    it('TECH_STACK scope should support combining multiple related technologies', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.TECH_STACK,
        techStack: ['react', 'react-router', 'react-query'],
        category: ['state-management', 'routing'],
      };

      expect(metadata.techStack).toHaveLength(3);
      expect(metadata.techStack?.every(tech => tech.startsWith('react'))).toBe(true);
    });
  });

  describe('MemoryScopeMetadata - DOMAIN scope', () => {
    it('should allow creating DOMAIN scope metadata', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.DOMAIN,
        domain: 'ai-automation',
        category: ['workflow', 'integration'],
      };

      expect(metadata.scope).toBe(MemoryScope.DOMAIN);
      expect(metadata.domain).toBe('ai-automation');
      expect(metadata.category).toContain('workflow');
    });

    it('DOMAIN scope can include related techStack', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.DOMAIN,
        domain: 'machine-learning',
        techStack: ['python', 'tensorflow', 'pytorch'],
        category: ['model-training'],
      };

      expect(metadata.domain).toBe('machine-learning');
      expect(metadata.techStack).toHaveLength(3);
    });
  });

  describe('MemoryScopeMetadata - SESSION scope', () => {
    it('should allow creating SESSION scope metadata', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.SESSION,
        sessionId: 'session-2026-02-01-001',
        projectName: 'claude-code-buddy',
      };

      expect(metadata.scope).toBe(MemoryScope.SESSION);
      expect(metadata.sessionId).toBe('session-2026-02-01-001');
      expect(metadata.projectName).toBe('claude-code-buddy');
    });

    it('SESSION scope should support temporary decisions and context', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.SESSION,
        sessionId: 'temp-session-123',
        category: ['temporary-decision', 'context'],
      };

      expect(metadata.sessionId).toBeDefined();
      expect(metadata.category).toContain('temporary-decision');
    });
  });

  describe('UnifiedMemory with scopeMetadata', () => {
    it('should allow adding scopeMetadata to UnifiedMemory', () => {
      const memory: UnifiedMemory = {
        type: 'knowledge',
        content: 'TypeScript best practices',
        tags: ['typescript', 'best-practice'],
        importance: 0.8,
        timestamp: new Date(),
        scopeMetadata: {
          scope: MemoryScope.TECH_STACK,
          techStack: ['typescript'],
        },
      };

      expect(memory.scopeMetadata?.scope).toBe(MemoryScope.TECH_STACK);
      expect(memory.scopeMetadata?.techStack).toContain('typescript');
    });

    it('should allow GLOBAL scope memory without project information', () => {
      const memory: UnifiedMemory = {
        type: 'knowledge',
        content: 'Never log sensitive information',
        tags: ['security', 'privacy'],
        importance: 1.0,
        timestamp: new Date(),
        scopeMetadata: {
          scope: MemoryScope.GLOBAL,
          category: ['security'],
        },
      };

      expect(memory.scopeMetadata?.scope).toBe(MemoryScope.GLOBAL);
      expect(memory.scopeMetadata?.projectName).toBeUndefined();
    });

    it('should allow PROJECT scope memory to include complete project context', () => {
      const memory: UnifiedMemory = {
        type: 'decision',
        content: 'Decided to use vitest for testing due to better performance',
        tags: ['testing', 'tooling'],
        importance: 0.9,
        timestamp: new Date(),
        scopeMetadata: {
          scope: MemoryScope.PROJECT,
          projectName: 'claude-code-buddy',
          techStack: ['vitest', 'typescript'],
          category: ['architecture-decision'],
        },
      };

      expect(memory.scopeMetadata?.scope).toBe(MemoryScope.PROJECT);
      expect(memory.scopeMetadata?.projectName).toBe('claude-code-buddy');
      expect(memory.scopeMetadata?.techStack).toContain('vitest');
    });

    it('should allow SESSION scope memory to include temporary context', () => {
      const memory: UnifiedMemory = {
        type: 'conversation',
        content: 'User wants to implement MemoryScope system',
        tags: ['session', 'task'],
        importance: 0.7,
        timestamp: new Date(),
        scopeMetadata: {
          scope: MemoryScope.SESSION,
          sessionId: 'session-2026-02-01-tdd',
          projectName: 'claude-code-buddy',
        },
      };

      expect(memory.scopeMetadata?.scope).toBe(MemoryScope.SESSION);
      expect(memory.scopeMetadata?.sessionId).toBeDefined();
    });

    it('UnifiedMemory should support no scopeMetadata (backward compatible)', () => {
      const memory: UnifiedMemory = {
        type: 'knowledge',
        content: 'Legacy memory without scope',
        tags: ['legacy'],
        importance: 0.5,
        timestamp: new Date(),
      };

      expect(memory.scopeMetadata).toBeUndefined();
    });
  });

  describe('Scope Metadata Combination Tests', () => {
    it('should support multi-level scope metadata combinations', () => {
      // Test that a memory can have information across multiple levels
      const memory: UnifiedMemory = {
        type: 'knowledge',
        content: 'React performance optimization in e-commerce checkout',
        tags: ['react', 'performance', 'e-commerce'],
        importance: 0.85,
        timestamp: new Date(),
        scopeMetadata: {
          scope: MemoryScope.PROJECT,
          projectName: 'shop-platform',
          domain: 'e-commerce',
          techStack: ['react', 'typescript'],
          category: ['performance', 'best-practice'],
        },
      };

      expect(memory.scopeMetadata?.scope).toBe(MemoryScope.PROJECT);
      expect(memory.scopeMetadata?.domain).toBe('e-commerce');
      expect(memory.scopeMetadata?.techStack).toContain('react');
      expect(memory.scopeMetadata?.category).toContain('performance');
    });
  });

  describe('Type Safety Tests', () => {
    it('should verify scope and required fields consistency at compile time', () => {
      // This test mainly ensures TypeScript type system is correct
      // If type definitions are wrong, this code will not compile

      const globalScope: MemoryScopeMetadata = {
        scope: MemoryScope.GLOBAL,
        // projectName should be optional
      };

      const projectScope: MemoryScopeMetadata = {
        scope: MemoryScope.PROJECT,
        projectName: 'test-project',
        // projectName is recommended but should be optional according to current design
      };

      const techScope: MemoryScopeMetadata = {
        scope: MemoryScope.TECH_STACK,
        techStack: ['typescript'],
      };

      expect(globalScope).toBeDefined();
      expect(projectScope).toBeDefined();
      expect(techScope).toBeDefined();
    });
  });

  describe('Utility Function - requiresProjectName', () => {
    it('PROJECT scope should require projectName', () => {
      expect(requiresProjectName(MemoryScope.PROJECT)).toBe(true);
    });

    it('SESSION scope should require projectName', () => {
      expect(requiresProjectName(MemoryScope.SESSION)).toBe(true);
    });

    it('GLOBAL scope should not require projectName', () => {
      expect(requiresProjectName(MemoryScope.GLOBAL)).toBe(false);
    });

    it('TECH_STACK scope should not require projectName', () => {
      expect(requiresProjectName(MemoryScope.TECH_STACK)).toBe(false);
    });

    it('DOMAIN scope should not require projectName', () => {
      expect(requiresProjectName(MemoryScope.DOMAIN)).toBe(false);
    });
  });

  describe('Utility Function - canHaveTechStack', () => {
    it('TECH_STACK scope should support techStack', () => {
      expect(canHaveTechStack(MemoryScope.TECH_STACK)).toBe(true);
    });

    it('PROJECT scope should support techStack', () => {
      expect(canHaveTechStack(MemoryScope.PROJECT)).toBe(true);
    });

    it('DOMAIN scope should support techStack', () => {
      expect(canHaveTechStack(MemoryScope.DOMAIN)).toBe(true);
    });

    it('GLOBAL scope should not support techStack', () => {
      expect(canHaveTechStack(MemoryScope.GLOBAL)).toBe(false);
    });

    it('SESSION scope should not support techStack', () => {
      expect(canHaveTechStack(MemoryScope.SESSION)).toBe(false);
    });
  });

  describe('Utility Function - canHaveDomain', () => {
    it('DOMAIN scope should support domain', () => {
      expect(canHaveDomain(MemoryScope.DOMAIN)).toBe(true);
    });

    it('PROJECT scope should support domain', () => {
      expect(canHaveDomain(MemoryScope.PROJECT)).toBe(true);
    });

    it('GLOBAL scope should not support domain', () => {
      expect(canHaveDomain(MemoryScope.GLOBAL)).toBe(false);
    });

    it('TECH_STACK scope should not support domain', () => {
      expect(canHaveDomain(MemoryScope.TECH_STACK)).toBe(false);
    });

    it('SESSION scope should not support domain', () => {
      expect(canHaveDomain(MemoryScope.SESSION)).toBe(false);
    });
  });

  describe('Utility Function - getScopePriority', () => {
    it('SESSION scope should have highest priority', () => {
      expect(getScopePriority(MemoryScope.SESSION)).toBe(5);
    });

    it('DOMAIN scope should have second highest priority', () => {
      expect(getScopePriority(MemoryScope.DOMAIN)).toBe(4);
    });

    it('PROJECT scope should have medium priority', () => {
      expect(getScopePriority(MemoryScope.PROJECT)).toBe(3);
    });

    it('TECH_STACK scope should have low priority', () => {
      expect(getScopePriority(MemoryScope.TECH_STACK)).toBe(2);
    });

    it('GLOBAL scope should have lowest priority', () => {
      expect(getScopePriority(MemoryScope.GLOBAL)).toBe(1);
    });

    it('should correctly compare priority order', () => {
      const priorities = [
        getScopePriority(MemoryScope.GLOBAL),
        getScopePriority(MemoryScope.TECH_STACK),
        getScopePriority(MemoryScope.PROJECT),
        getScopePriority(MemoryScope.DOMAIN),
        getScopePriority(MemoryScope.SESSION),
      ];

      // Should be in ascending order
      expect(priorities).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Utility Function - compareScopePriority', () => {
    it('SESSION should have higher priority than GLOBAL (should return negative for sort)', () => {
      // In sort, negative number means first parameter should come first
      expect(compareScopePriority(MemoryScope.SESSION, MemoryScope.GLOBAL)).toBeLessThan(0);
    });

    it('GLOBAL should have lower priority than SESSION (should return positive for sort)', () => {
      // In sort, positive number means second parameter should come first
      expect(compareScopePriority(MemoryScope.GLOBAL, MemoryScope.SESSION)).toBeGreaterThan(0);
    });

    it('same scope should return 0', () => {
      expect(compareScopePriority(MemoryScope.PROJECT, MemoryScope.PROJECT)).toBe(0);
    });

    it('should sort scopes (from high to low priority)', () => {
      const scopes = [
        MemoryScope.GLOBAL,
        MemoryScope.SESSION,
        MemoryScope.TECH_STACK,
        MemoryScope.PROJECT,
        MemoryScope.DOMAIN,
      ];

      const sorted = [...scopes].sort(compareScopePriority);
      expect(sorted).toEqual([
        MemoryScope.SESSION,
        MemoryScope.DOMAIN,
        MemoryScope.PROJECT,
        MemoryScope.TECH_STACK,
        MemoryScope.GLOBAL,
      ]);
    });
  });

  describe('Utility Function - getScopeDescription', () => {
    it('should return description for GLOBAL scope', () => {
      expect(getScopeDescription(MemoryScope.GLOBAL)).toContain('Universal');
    });

    it('should return description for TECH_STACK scope', () => {
      expect(getScopeDescription(MemoryScope.TECH_STACK)).toContain('technology');
    });

    it('should return description for PROJECT scope', () => {
      expect(getScopeDescription(MemoryScope.PROJECT)).toContain('project');
    });

    it('should return description for DOMAIN scope', () => {
      expect(getScopeDescription(MemoryScope.DOMAIN)).toContain('domain');
    });

    it('should return description for SESSION scope', () => {
      expect(getScopeDescription(MemoryScope.SESSION)).toContain('session');
    });

    it('all scopes should have descriptions', () => {
      const scopes = [
        MemoryScope.GLOBAL,
        MemoryScope.TECH_STACK,
        MemoryScope.PROJECT,
        MemoryScope.DOMAIN,
        MemoryScope.SESSION,
      ];

      scopes.forEach(scope => {
        const description = getScopeDescription(scope);
        expect(description).toBeTruthy();
        expect(typeof description).toBe('string');
        expect(description.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Utility Function - validateScopeMetadata', () => {
    it('should validate valid GLOBAL scope metadata', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.GLOBAL,
        category: ['security'],
      };

      const result = validateScopeMetadata(metadata);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate valid TECH_STACK scope metadata', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.TECH_STACK,
        techStack: ['typescript'],
      };

      const result = validateScopeMetadata(metadata);
      expect(result.valid).toBe(true);
    });

    it('should validate valid DOMAIN scope metadata', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.DOMAIN,
        domain: 'e-commerce',
      };

      const result = validateScopeMetadata(metadata);
      expect(result.valid).toBe(true);
    });

    it('should detect TECH_STACK scope without techStack', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.TECH_STACK,
      };

      const result = validateScopeMetadata(metadata);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('techStack');
    });

    it('should detect DOMAIN scope without domain', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.DOMAIN,
      };

      const result = validateScopeMetadata(metadata);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('domain');
    });

    it('should detect GLOBAL scope should not have techStack', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.GLOBAL,
        techStack: ['typescript'],
      };

      const result = validateScopeMetadata(metadata);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Utility Function - createScopeFilter', () => {
    it('should create simple scope filter', () => {
      const filter = createScopeFilter(MemoryScope.GLOBAL);

      expect(filter.scope).toBe(MemoryScope.GLOBAL);
      expect(filter.projectName).toBeUndefined();
    });

    it('should create scope filter with options', () => {
      const filter = createScopeFilter(MemoryScope.PROJECT, {
        projectName: 'my-project',
        techStack: ['typescript'],
      });

      expect(filter.scope).toBe(MemoryScope.PROJECT);
      expect(filter.projectName).toBe('my-project');
      expect(filter.techStack).toContain('typescript');
    });

    it('should support DOMAIN scope filter', () => {
      const filter = createScopeFilter(MemoryScope.DOMAIN, {
        domain: 'e-commerce',
        techStack: ['react'],
      });

      expect(filter.scope).toBe(MemoryScope.DOMAIN);
      expect(filter.domain).toBe('e-commerce');
      expect(filter.techStack).toContain('react');
    });
  });
});
