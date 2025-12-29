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

      // According to the plan:
      // Real Implementations: 5 (development-butler, test-writer, devops-engineer, project-manager, data-engineer)
      // Enhanced Prompts: 7 (architecture-agent, code-reviewer, security-auditor, ui-designer, marketing-strategist, product-manager, ml-engineer)
      // Optional: 1 (rag-agent)

      expect(realImplementations).toHaveLength(5);
      expect(enhancedPrompts).toHaveLength(7);
      expect(optionalAgents).toHaveLength(1);
    });

    it('should return correct agent types for real implementations', () => {
      const realImplementations = registry.getRealImplementations();
      const realNames = realImplementations.map(a => a.name);

      expect(realNames).toContain('development-butler');
      expect(realNames).toContain('test-writer');
      expect(realNames).toContain('devops-engineer');
      expect(realNames).toContain('project-manager');
      expect(realNames).toContain('data-engineer');
    });

    it('should return correct agent types for enhanced prompts', () => {
      const enhancedPrompts = registry.getEnhancedPrompts();
      const enhancedNames = enhancedPrompts.map(a => a.name);

      expect(enhancedNames).toContain('architecture-agent');
      expect(enhancedNames).toContain('code-reviewer');
      expect(enhancedNames).toContain('security-auditor');
      expect(enhancedNames).toContain('ui-designer');
      expect(enhancedNames).toContain('marketing-strategist');
      expect(enhancedNames).toContain('product-manager');
      expect(enhancedNames).toContain('ml-engineer');
    });

    it('should return correct agent for optional features', () => {
      const optionalAgents = registry.getOptionalAgents();

      expect(optionalAgents).toHaveLength(1);
      expect(optionalAgents[0].name).toBe('rag-agent');
      expect(optionalAgents[0].requiredDependencies).toBeDefined();
      expect(optionalAgents[0].requiredDependencies).toContain('chromadb');
      expect(optionalAgents[0].requiredDependencies).toContain('openai');
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

    it('should have requiredDependencies for optional agents', () => {
      const ragAgent = registry.getAgent('rag-agent');

      expect(ragAgent).toBeDefined();
      expect(ragAgent?.classification).toBe(AgentClassification.OPTIONAL_FEATURE);
      expect(ragAgent?.requiredDependencies).toBeDefined();
      expect(ragAgent?.requiredDependencies).toContain('chromadb');
      expect(ragAgent?.requiredDependencies).toContain('openai');
    });

    it('should not have requiredDependencies for non-optional agents', () => {
      const codeReviewer = registry.getAgent('code-reviewer');

      expect(codeReviewer).toBeDefined();
      expect(codeReviewer?.classification).toBe(AgentClassification.ENHANCED_PROMPT);
      expect(codeReviewer?.requiredDependencies).toBeUndefined();
    });
  });

  describe('getAllAgents should return all agents', () => {
    it('should return total of 13 agents (5 real + 7 enhanced + 1 optional)', () => {
      const allAgents = registry.getAllAgents();

      expect(allAgents).toHaveLength(13);
    });
  });
});
