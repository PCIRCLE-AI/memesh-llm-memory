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
    it('應該包含所有必要的 scope 層級', () => {
      expect(MemoryScope.GLOBAL).toBe('global');
      expect(MemoryScope.PROJECT).toBe('project');
      expect(MemoryScope.TECH_STACK).toBe('tech');
      expect(MemoryScope.DOMAIN).toBe('domain');
      expect(MemoryScope.SESSION).toBe('session');
    });

    it('應該正確定義 scope 的優先級順序（從高到低）', () => {
      // 根據設計，優先級由高到低應為：SESSION > DOMAIN > PROJECT > TECH_STACK > GLOBAL
      // 這個測試驗證 enum 值的存在性
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
    it('應該允許創建 GLOBAL scope metadata', () => {
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

    it('GLOBAL scope 不應該需要 projectName', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.GLOBAL,
      };

      expect(metadata.projectName).toBeUndefined();
    });

    it('應該允許 GLOBAL scope 有多個 category', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.GLOBAL,
        category: ['best-practice', 'anti-pattern', 'coding-standard'],
      };

      expect(metadata.category).toHaveLength(3);
    });
  });

  describe('MemoryScopeMetadata - PROJECT scope', () => {
    it('應該允許創建 PROJECT scope metadata', () => {
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

    it('PROJECT scope 應該支援 techStack 陣列', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.PROJECT,
        projectName: 'my-project',
        techStack: ['react', 'typescript', 'vite', 'vitest'],
      };

      expect(metadata.techStack).toHaveLength(4);
      expect(metadata.techStack).toContain('react');
    });

    it('PROJECT scope 可以包含 domain 資訊', () => {
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
    it('應該允許創建 TECH_STACK scope metadata', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.TECH_STACK,
        techStack: ['react', 'typescript'],
        category: ['best-practice'],
      };

      expect(metadata.scope).toBe(MemoryScope.TECH_STACK);
      expect(metadata.techStack).toHaveLength(2);
      expect(metadata.category).toContain('best-practice');
    });

    it('TECH_STACK scope 應該可以針對單一技術', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.TECH_STACK,
        techStack: ['typescript'],
        category: ['type-safety', 'generics'],
      };

      expect(metadata.techStack).toHaveLength(1);
      expect(metadata.category).toHaveLength(2);
    });

    it('TECH_STACK scope 應該可以組合多個相關技術', () => {
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
    it('應該允許創建 DOMAIN scope metadata', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.DOMAIN,
        domain: 'ai-automation',
        category: ['workflow', 'integration'],
      };

      expect(metadata.scope).toBe(MemoryScope.DOMAIN);
      expect(metadata.domain).toBe('ai-automation');
      expect(metadata.category).toContain('workflow');
    });

    it('DOMAIN scope 可以包含相關的 techStack', () => {
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
    it('應該允許創建 SESSION scope metadata', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.SESSION,
        sessionId: 'session-2026-02-01-001',
        projectName: 'claude-code-buddy',
      };

      expect(metadata.scope).toBe(MemoryScope.SESSION);
      expect(metadata.sessionId).toBe('session-2026-02-01-001');
      expect(metadata.projectName).toBe('claude-code-buddy');
    });

    it('SESSION scope 應該可以包含臨時的決策和上下文', () => {
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
    it('應該允許在 UnifiedMemory 中加入 scopeMetadata', () => {
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

    it('應該允許 GLOBAL scope memory 不含 project 資訊', () => {
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

    it('應該允許 PROJECT scope memory 包含完整的專案上下文', () => {
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

    it('應該允許 SESSION scope memory 包含臨時上下文', () => {
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

    it('UnifiedMemory 應該可以不包含 scopeMetadata（向後兼容）', () => {
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

  describe('Scope Metadata 組合測試', () => {
    it('應該支援多層級的 scope metadata 組合', () => {
      // 測試一個記憶可以同時有多個層級的資訊
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

  describe('Type Safety 測試', () => {
    it('應該在編譯時檢查 scope 與必需欄位的一致性', () => {
      // 這個測試主要是確保 TypeScript 型別系統正確
      // 如果型別定義錯誤，這些程式碼將無法編譯

      const globalScope: MemoryScopeMetadata = {
        scope: MemoryScope.GLOBAL,
        // projectName 應該是 optional
      };

      const projectScope: MemoryScopeMetadata = {
        scope: MemoryScope.PROJECT,
        projectName: 'test-project',
        // projectName 雖然建議提供，但根據目前設計應該是 optional
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

  describe('工具函數 - requiresProjectName', () => {
    it('PROJECT scope 應該需要 projectName', () => {
      expect(requiresProjectName(MemoryScope.PROJECT)).toBe(true);
    });

    it('SESSION scope 應該需要 projectName', () => {
      expect(requiresProjectName(MemoryScope.SESSION)).toBe(true);
    });

    it('GLOBAL scope 不應該需要 projectName', () => {
      expect(requiresProjectName(MemoryScope.GLOBAL)).toBe(false);
    });

    it('TECH_STACK scope 不應該需要 projectName', () => {
      expect(requiresProjectName(MemoryScope.TECH_STACK)).toBe(false);
    });

    it('DOMAIN scope 不應該需要 projectName', () => {
      expect(requiresProjectName(MemoryScope.DOMAIN)).toBe(false);
    });
  });

  describe('工具函數 - canHaveTechStack', () => {
    it('TECH_STACK scope 應該可以有 techStack', () => {
      expect(canHaveTechStack(MemoryScope.TECH_STACK)).toBe(true);
    });

    it('PROJECT scope 應該可以有 techStack', () => {
      expect(canHaveTechStack(MemoryScope.PROJECT)).toBe(true);
    });

    it('DOMAIN scope 應該可以有 techStack', () => {
      expect(canHaveTechStack(MemoryScope.DOMAIN)).toBe(true);
    });

    it('GLOBAL scope 不應該有 techStack', () => {
      expect(canHaveTechStack(MemoryScope.GLOBAL)).toBe(false);
    });

    it('SESSION scope 不應該有 techStack', () => {
      expect(canHaveTechStack(MemoryScope.SESSION)).toBe(false);
    });
  });

  describe('工具函數 - canHaveDomain', () => {
    it('DOMAIN scope 應該可以有 domain', () => {
      expect(canHaveDomain(MemoryScope.DOMAIN)).toBe(true);
    });

    it('PROJECT scope 應該可以有 domain', () => {
      expect(canHaveDomain(MemoryScope.PROJECT)).toBe(true);
    });

    it('GLOBAL scope 不應該有 domain', () => {
      expect(canHaveDomain(MemoryScope.GLOBAL)).toBe(false);
    });

    it('TECH_STACK scope 不應該有 domain', () => {
      expect(canHaveDomain(MemoryScope.TECH_STACK)).toBe(false);
    });

    it('SESSION scope 不應該有 domain', () => {
      expect(canHaveDomain(MemoryScope.SESSION)).toBe(false);
    });
  });

  describe('工具函數 - getScopePriority', () => {
    it('SESSION scope 應該有最高優先級', () => {
      expect(getScopePriority(MemoryScope.SESSION)).toBe(5);
    });

    it('DOMAIN scope 應該有第二優先級', () => {
      expect(getScopePriority(MemoryScope.DOMAIN)).toBe(4);
    });

    it('PROJECT scope 應該有中等優先級', () => {
      expect(getScopePriority(MemoryScope.PROJECT)).toBe(3);
    });

    it('TECH_STACK scope 應該有低優先級', () => {
      expect(getScopePriority(MemoryScope.TECH_STACK)).toBe(2);
    });

    it('GLOBAL scope 應該有最低優先級', () => {
      expect(getScopePriority(MemoryScope.GLOBAL)).toBe(1);
    });

    it('應該能正確比較優先級順序', () => {
      const priorities = [
        getScopePriority(MemoryScope.GLOBAL),
        getScopePriority(MemoryScope.TECH_STACK),
        getScopePriority(MemoryScope.PROJECT),
        getScopePriority(MemoryScope.DOMAIN),
        getScopePriority(MemoryScope.SESSION),
      ];

      // 應該是遞增的
      expect(priorities).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('工具函數 - compareScopePriority', () => {
    it('SESSION 應該有比 GLOBAL 更高的優先級（用於 sort 時應返回負數）', () => {
      // 在 sort 中，返回負數表示第一個參數應排在前面
      expect(compareScopePriority(MemoryScope.SESSION, MemoryScope.GLOBAL)).toBeLessThan(0);
    });

    it('GLOBAL 應該有比 SESSION 更低的優先級（用於 sort 時應返回正數）', () => {
      // 在 sort 中，返回正數表示第二個參數應排在前面
      expect(compareScopePriority(MemoryScope.GLOBAL, MemoryScope.SESSION)).toBeGreaterThan(0);
    });

    it('相同的 scope 應該返回 0', () => {
      expect(compareScopePriority(MemoryScope.PROJECT, MemoryScope.PROJECT)).toBe(0);
    });

    it('應該能排序 scopes（從高優先級到低優先級）', () => {
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

  describe('工具函數 - getScopeDescription', () => {
    it('應該為 GLOBAL scope 返回描述', () => {
      expect(getScopeDescription(MemoryScope.GLOBAL)).toContain('Universal');
    });

    it('應該為 TECH_STACK scope 返回描述', () => {
      expect(getScopeDescription(MemoryScope.TECH_STACK)).toContain('technology');
    });

    it('應該為 PROJECT scope 返回描述', () => {
      expect(getScopeDescription(MemoryScope.PROJECT)).toContain('project');
    });

    it('應該為 DOMAIN scope 返回描述', () => {
      expect(getScopeDescription(MemoryScope.DOMAIN)).toContain('domain');
    });

    it('應該為 SESSION scope 返回描述', () => {
      expect(getScopeDescription(MemoryScope.SESSION)).toContain('session');
    });

    it('所有 scope 都應該有描述', () => {
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

  describe('工具函數 - validateScopeMetadata', () => {
    it('應該驗證有效的 GLOBAL scope metadata', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.GLOBAL,
        category: ['security'],
      };

      const result = validateScopeMetadata(metadata);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('應該驗證有效的 TECH_STACK scope metadata', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.TECH_STACK,
        techStack: ['typescript'],
      };

      const result = validateScopeMetadata(metadata);
      expect(result.valid).toBe(true);
    });

    it('應該驗證有效的 DOMAIN scope metadata', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.DOMAIN,
        domain: 'e-commerce',
      };

      const result = validateScopeMetadata(metadata);
      expect(result.valid).toBe(true);
    });

    it('應該檢測 TECH_STACK scope 沒有 techStack', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.TECH_STACK,
      };

      const result = validateScopeMetadata(metadata);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('techStack');
    });

    it('應該檢測 DOMAIN scope 沒有 domain', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.DOMAIN,
      };

      const result = validateScopeMetadata(metadata);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('domain');
    });

    it('應該檢測 GLOBAL scope 不應該有 techStack', () => {
      const metadata: MemoryScopeMetadata = {
        scope: MemoryScope.GLOBAL,
        techStack: ['typescript'],
      };

      const result = validateScopeMetadata(metadata);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('工具函數 - createScopeFilter', () => {
    it('應該創建簡單的 scope filter', () => {
      const filter = createScopeFilter(MemoryScope.GLOBAL);

      expect(filter.scope).toBe(MemoryScope.GLOBAL);
      expect(filter.projectName).toBeUndefined();
    });

    it('應該創建帶有 options 的 scope filter', () => {
      const filter = createScopeFilter(MemoryScope.PROJECT, {
        projectName: 'my-project',
        techStack: ['typescript'],
      });

      expect(filter.scope).toBe(MemoryScope.PROJECT);
      expect(filter.projectName).toBe('my-project');
      expect(filter.techStack).toContain('typescript');
    });

    it('應該支援 DOMAIN scope filter', () => {
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
