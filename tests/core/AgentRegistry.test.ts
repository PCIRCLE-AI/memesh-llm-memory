import { describe, it, expect, beforeEach } from 'vitest';
import { AgentRegistry } from '../../src/core/AgentRegistry.js';
import { AgentClassification } from '../../src/types/AgentClassification.js';

describe('AgentRegistry - Agent Classification', () => {
  let registry: AgentRegistry;

  beforeEach(() => {
    registry = new AgentRegistry();
  });

  describe('Agent Classification System', () => {
    it('should classify agents by implementation type', () => {
      const realImplementations = registry.getRealImplementations();
      const enhancedPrompts = registry.getEnhancedPrompts();
      const optionalAgents = registry.getOptionalAgents();

      expect(realImplementations.length).toBeGreaterThan(0);
      expect(enhancedPrompts.length).toBeGreaterThan(0);
      expect(optionalAgents).toHaveLength(0);
    });

    it('should return correct agent types for real implementations', () => {
      const realImplementations = registry.getRealImplementations();
      const realNames = realImplementations.map(a => a.name);

      expect(realNames).toContain('development-butler');
      expect(realNames).toContain('test-writer');
      expect(realNames).toContain('e2e-healing-agent');
      expect(realNames).toContain('project-manager');
      expect(realNames).toContain('data-engineer');
    });

    it('should return correct agent types for enhanced prompts', () => {
      const enhancedPrompts = registry.getEnhancedPrompts();
      const enhancedNames = enhancedPrompts.map(a => a.name);

      // Original 7 agents
      expect(enhancedNames).toContain('architecture-agent');
      expect(enhancedNames).toContain('code-reviewer');
      expect(enhancedNames).toContain('security-auditor');
      expect(enhancedNames).toContain('ui-designer');
      expect(enhancedNames).toContain('marketing-strategist');
      expect(enhancedNames).toContain('product-manager');
      expect(enhancedNames).toContain('ml-engineer');

      // New 5 agents
      expect(enhancedNames).toContain('debugger');
      expect(enhancedNames).toContain('refactorer');
      expect(enhancedNames).toContain('api-designer');
      expect(enhancedNames).toContain('research-agent');
      expect(enhancedNames).toContain('data-analyst');
    });

    it('should have no optional agents by default', () => {
      const optionalAgents = registry.getOptionalAgents();

      expect(optionalAgents).toHaveLength(0);
    });
  });

  describe('Agent Metadata with Classification', () => {
    it('should have classification field in metadata', () => {
      const devButler = registry.getAgent('development-butler');

      expect(devButler).toBeDefined();
      expect(devButler?.classification).toBe(AgentClassification.REAL_IMPLEMENTATION);
    });

    it('should have mcpTools field in metadata', () => {
      const devButler = registry.getAgent('development-butler');

      expect(devButler).toBeDefined();
      expect(devButler?.mcpTools).toBeDefined();
      expect(Array.isArray(devButler?.mcpTools)).toBe(true);
      expect(devButler?.mcpTools).toContain('filesystem');
      expect(devButler?.mcpTools).toContain('memory');
      expect(devButler?.mcpTools).toContain('bash');
    });

    it('should not have requiredDependencies for non-optional agents', () => {
      const codeReviewer = registry.getAgent('code-reviewer');

      expect(codeReviewer).toBeDefined();
      expect(codeReviewer?.classification).toBe(AgentClassification.ENHANCED_PROMPT);
      expect(codeReviewer?.requiredDependencies).toBeUndefined();
    });
  });

  describe('getAllAgents should return all agents', () => {
    it('should match sum of classifications', () => {
      const allAgents = registry.getAllAgents();
      const real = registry.getRealImplementations();
      const enhanced = registry.getEnhancedPrompts();
      const optional = registry.getOptionalAgents();

      expect(allAgents).toHaveLength(real.length + enhanced.length + optional.length);
    });
  });

  describe('Missing Enhanced Prompt Agents', () => {
    it('should include all 5 missing Enhanced Prompt agents', () => {
      const enhancedPrompts = registry.getEnhancedPrompts();
      const enhancedNames = enhancedPrompts.map(a => a.name);

      // The 5 missing agents from the plan
      expect(enhancedNames).toContain('debugger');
      expect(enhancedNames).toContain('refactorer');
      expect(enhancedNames).toContain('api-designer');
      expect(enhancedNames).toContain('research-agent');
      expect(enhancedNames).toContain('data-analyst');
    });

    it('should have correct classification for missing agents', () => {
      const debuggerAgent = registry.getAgent('debugger');
      const refactorer = registry.getAgent('refactorer');
      const apiDesigner = registry.getAgent('api-designer');
      const researchAgent = registry.getAgent('research-agent');
      const dataAnalyst = registry.getAgent('data-analyst');

      expect(debuggerAgent?.classification).toBe(AgentClassification.ENHANCED_PROMPT);
      expect(refactorer?.classification).toBe(AgentClassification.ENHANCED_PROMPT);
      expect(apiDesigner?.classification).toBe(AgentClassification.ENHANCED_PROMPT);
      expect(researchAgent?.classification).toBe(AgentClassification.ENHANCED_PROMPT);
      expect(dataAnalyst?.classification).toBe(AgentClassification.ENHANCED_PROMPT);
    });

    it('should include a stable set of enhanced prompt agents', () => {
      const enhancedPrompts = registry.getEnhancedPrompts();
      expect(enhancedPrompts.length).toBeGreaterThan(0);
    });
  });
});
