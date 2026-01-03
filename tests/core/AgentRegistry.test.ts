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

      // Current agent counts (as of AgentRegistry implementation):
      // Real Implementations: 9 (development-butler, test-writer, e2e-healing-agent, devops-engineer, project-manager, data-engineer, workflow-orchestrator, opal-automation, n8n-workflow)
      // Enhanced Prompts: 26 (all prompt-based agents)
      // Optional: 1 (rag-agent)

      expect(realImplementations).toHaveLength(9);
      expect(enhancedPrompts).toHaveLength(26);
      expect(optionalAgents).toHaveLength(1);
    });

    it('should return correct agent types for real implementations', () => {
      const realImplementations = registry.getRealImplementations();
      const realNames = realImplementations.map(a => a.name);

      expect(realNames).toContain('development-butler');
      expect(realNames).toContain('test-writer');
      expect(realNames).toContain('e2e-healing-agent');
      expect(realNames).toContain('devops-engineer');
      expect(realNames).toContain('project-manager');
      expect(realNames).toContain('data-engineer');
      expect(realNames).toContain('workflow-orchestrator');
      expect(realNames).toContain('opal-automation');
      expect(realNames).toContain('n8n-workflow');
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
    it('should return total of 36 agents (9 real + 26 enhanced + 1 optional)', () => {
      const allAgents = registry.getAllAgents();

      expect(allAgents).toHaveLength(36);
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

    it('should update total enhanced prompts count to 26', () => {
      const enhancedPrompts = registry.getEnhancedPrompts();
      expect(enhancedPrompts).toHaveLength(26); // All enhanced prompt agents
    });
  });
});
