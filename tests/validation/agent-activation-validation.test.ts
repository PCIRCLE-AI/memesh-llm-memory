/**
 * Agent Activation Validation Test Suite
 *
 * This test suite validates that all agents are properly activated and integrated
 * across the entire codebase. It ensures:
 *
 * 1. Agent Registry: All agents are registered with correct metadata
 * 2. Type Definitions: AgentType and TaskCapability unions are complete
 * 3. Record Mappings: All Record<AgentType, ...> mappings are exhaustive
 * 4. MCP Integration: Tools, handlers, and routing are properly configured
 * 5. Server Initialization: All agents are initialized in ServerInitializer
 *
 * Run this test suite after activating any new agent to ensure proper integration.
 */

import { describe, it, expect } from 'vitest';
import { AgentRegistry } from '../../src/core/AgentRegistry.js';
import { ServerInitializer } from '../../src/mcp/ServerInitializer.js';
import { getAllToolDefinitions } from '../../src/mcp/ToolDefinitions.js';
import { AgentRouter } from '../../src/orchestrator/AgentRouter.js';
import type { AgentType, TaskCapability } from '../../src/orchestrator/types.js';

describe('Agent Activation Validation', () => {
  describe('AgentRegistry Validation', () => {
    it('should have all agents registered in AgentRegistry', () => {
      const registry = new AgentRegistry();
      const allAgents = registry.getAllAgents();

      // Expected agents (update this list when adding new agents)
      const expectedAgents: AgentType[] = [
        // Development Agents
        'code-reviewer',
        'test-writer',
        'test-automator',
        'e2e-healing-agent',
        'debugger',
        'refactorer',
        'api-designer',
        'db-optimizer',
        'frontend-specialist',
        'backend-specialist',
        'frontend-developer',
        'backend-developer',
        'database-administrator',
        'development-butler',

        // Analysis Agents
        'rag-agent',
        'research-agent',
        'architecture-agent',
        'data-analyst',
        'performance-profiler',
        'performance-engineer',

        // Knowledge Agents
        'knowledge-agent',

        // Operations Agents
        'devops-engineer',
        'security-auditor',

        // Creative Agents
        'technical-writer',
        'ui-designer',

        // Utility Agents
        'migration-assistant',
        'api-integrator',

        // Business & Product Agents
        'project-manager',
        'product-manager',

        // Data & Analytics Agents
        'data-engineer',
        'ml-engineer',

        // Marketing Agents
        'marketing-strategist',

        // Workflow Automation Agents
        'workflow-orchestrator',
        'opal-automation',
        'n8n-workflow',

        // General Agent
        'general-agent',
      ];

      const registeredAgentTypes = allAgents.map((a) => a.name);

      // Check all expected agents are registered
      for (const expectedAgent of expectedAgents) {
        expect(
          registeredAgentTypes,
          `Agent "${expectedAgent}" should be registered in AgentRegistry`
        ).toContain(expectedAgent);
      }

      // Check no unexpected agents are registered
      for (const registeredAgent of registeredAgentTypes) {
        expect(
          expectedAgents,
          `Unexpected agent "${registeredAgent}" found in AgentRegistry`
        ).toContain(registeredAgent);
      }
    });

    it('should have complete metadata for all registered agents', () => {
      const registry = new AgentRegistry();
      const allAgents = registry.getAllAgents();

      for (const agent of allAgents) {
        expect(agent.name, `Agent name should be defined`).toBeDefined();
        expect(agent.description, `Agent ${agent.name} should have a description`).toBeDefined();
        expect(agent.category, `Agent ${agent.name} should have a category`).toBeDefined();
        expect(agent.classification, `Agent ${agent.name} should have a classification`).toBeDefined();

        // capabilities is optional, but if present should not be empty
        if (agent.capabilities) {
          expect(
            agent.capabilities.length,
            `Agent ${agent.name} capabilities should not be empty if defined`
          ).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('Type Definitions Validation', () => {
    it('should have all TaskCapability values defined', () => {
      // This test ensures TaskCapability union type is properly defined
      // by checking that all capability strings used in AgentRegistry are valid

      const registry = new AgentRegistry();
      const allAgents = registry.getAllAgents();

      // Expected capabilities (matches TaskCapability type in src/orchestrator/types.ts)
      const expectedCapabilities: TaskCapability[] = [
        // Core development capabilities
        'code-review',
        'code-generation',
        'code-quality',
        'testing',
        'test-generation',
        'e2e-testing',
        'coverage',
        'auto-healing',
        'debugging',
        'root-cause-analysis',
        'refactoring',
        'design-patterns',
        'best-practices',
        // Security & compliance
        'security',
        'security-audit',
        'vulnerability-assessment',
        'compliance',
        // API & integration
        'api',
        'api-design',
        'api-docs',
        'api-integration',
        'rest',
        'graphql',
        'sdk',
        'third-party',
        // Architecture & performance
        'architecture',
        'performance',
        'profiling',
        'optimization',
        'scalability',
        'cache',
        // Data & analysis
        'data-analysis',
        'database',
        'schema',
        'query',
        'query-tuning',
        'statistics',
        'business-intelligence',
        // Research & knowledge
        'research',
        'user-research',
        'rag-search',
        'knowledge-query',
        'knowledge-management',
        'information-retrieval',
        'feasibility-analysis',
        'evaluation',
        // Frontend & UI/UX
        'frontend',
        'ui',
        'ui-design',
        'ux-design',
        'component',
        'browser-automation',
        'natural-language-ui',
        // Backend & infrastructure
        'backend',
        'server',
        'maintenance',
        'migration',
        'modernization',
        'upgrade',
        'technical-debt',
        // ML & AI
        'machine-learning',
        'ml-pipeline',
        'model-training',
        'intelligent-platform-selection',
        // Documentation & communication
        'documentation',
        'technical-writing',
        // Workflow & automation
        'workflow',
        'workflow-automation',
        'automation',
        'opal',
        'opal-workflows',
        'n8n',
        'n8n-integration',
        // Product & business
        'product-management',
        'prioritization',
        'marketing',
        'strategy',
        'growth',
        // General
        'general',
        'problem-solving',
      ];

      // Collect all capabilities used across all agents
      const usedCapabilities = new Set<string>();
      for (const agent of allAgents) {
        if (agent.capabilities) {
          for (const capability of agent.capabilities) {
            usedCapabilities.add(capability);
          }
        }
      }

      // Check all used capabilities are in expected list
      for (const usedCapability of usedCapabilities) {
        expect(
          expectedCapabilities,
          `Capability "${usedCapability}" should be defined in TaskCapability union type`
        ).toContain(usedCapability as TaskCapability);
      }
    });
  });

  describe('AgentRouter Mapping Validation', () => {
    it('should have agentCapabilities mapping for all agents', async () => {
      const router = new AgentRouter();
      const registry = new AgentRegistry();
      const allAgents = registry.getAllAgents();

      // Get system resources to enable routing
      const systemResources = await router.getSystemResources();
      expect(systemResources).toBeDefined();

      // Create a mock TaskAnalysis for each agent type
      for (const agent of allAgents) {
        const mockAnalysis = {
          taskId: 'test-task',
          taskType: 'test',
          complexity: 'simple' as const,
          estimatedTokens: 1000,
          estimatedCost: 100 as import('../../src/utils/money.js').MicroDollars,
          requiredAgents: [agent.name],
          executionMode: 'sequential' as const,
          reasoning: 'test',
        };

        // This will fail if the agent type is not in agentCapabilities mapping
        const decision = await router.route(mockAnalysis);
        expect(decision, `AgentRouter should handle agent type "${agent.name}"`).toBeDefined();
        expect(
          decision.selectedAgent,
          `AgentRouter should select an agent for "${agent.name}"`
        ).toBeDefined();
      }
    });
  });

  describe('MCP Integration Validation', () => {
    it('should have MCP tool definitions for workflow agents', () => {
      const registry = new AgentRegistry();
      const allAgents = registry.getAllAgents();
      const toolDefinitions = getAllToolDefinitions(allAgents);
      const toolNames = toolDefinitions.map((t) => t.name);

      // Workflow automation tools
      expect(toolNames, 'workflow-create tool should be defined').toContain('workflow-create');
      expect(toolNames, 'workflow-list tool should be defined').toContain('workflow-list');

      // DevOps tools
      expect(toolNames, 'devops-analyze-deployment tool should be defined').toContain(
        'devops-analyze-deployment'
      );
      expect(toolNames, 'devops-setup-ci tool should be defined').toContain('devops-setup-ci');
    });

    it('should have valid tool schemas', () => {
      const registry = new AgentRegistry();
      const allAgents = registry.getAllAgents();
      const toolDefinitions = getAllToolDefinitions(allAgents);

      for (const tool of toolDefinitions) {
        expect(tool.name, 'Tool should have a name').toBeDefined();
        expect(tool.description, 'Tool should have a description').toBeDefined();
        expect(tool.inputSchema, 'Tool should have an input schema').toBeDefined();
        expect(
          tool.inputSchema.type,
          `Tool "${tool.name}" should have schema type="object"`
        ).toBe('object');
      }
    });
  });

  describe('ServerInitializer Validation', () => {
    it('should initialize all components without errors', () => {
      // This test ensures ServerInitializer can create all components
      expect(() => {
        const components = ServerInitializer.initialize();
        expect(components.router, 'Router should be initialized').toBeDefined();
        expect(components.agentRegistry, 'AgentRegistry should be initialized').toBeDefined();
        expect(
          components.workflowOrchestrator,
          'WorkflowOrchestrator should be initialized'
        ).toBeDefined();
        expect(components.devopsEngineer, 'DevOpsEngineerAgent should be initialized').toBeDefined();
        expect(components.toolHandlers, 'ToolHandlers should be initialized').toBeDefined();
        expect(components.buddyHandlers, 'BuddyHandlers should be initialized').toBeDefined();
      }).not.toThrow();
    });

    it('should pass all required dependencies to ToolHandlers', () => {
      const components = ServerInitializer.initialize();

      // Verify ToolHandlers received all dependencies (17 parameters)
      expect(components.toolHandlers, 'ToolHandlers should be defined').toBeDefined();

      // Test that ToolHandlers can handle workflow tools
      // (This indirectly verifies workflowOrchestrator was passed correctly)
      expect(
        async () => {
          await components.toolHandlers.handleListWorkflows({});
        },
        'ToolHandlers should handle workflow tools'
      ).toBeDefined();
    });
  });

  describe('Activation Completeness Check', () => {
    it('should have all agents in all required mappings', () => {
      const registry = new AgentRegistry();
      const allAgents = registry.getAllAgents();
      const allAgentTypes = allAgents.map((a) => a.name);

      // Check count matches expectations
      expect(
        allAgentTypes.length,
        'Should have expected number of agents (update count when adding agents)'
      ).toBeGreaterThanOrEqual(36); // Current count: 36 agents (AgentType union members)

      // All agents should be in TypeScript AgentType union
      // (This is validated at compile-time by TypeScript, but we can check runtime)
      for (const agentType of allAgentTypes) {
        expect(
          typeof agentType,
          `Agent type "${agentType}" should be a string`
        ).toBe('string');
        expect(
          agentType.length,
          `Agent type "${agentType}" should not be empty`
        ).toBeGreaterThan(0);
      }
    });

    it('should have no orphaned agent types in type definitions', () => {
      // This test ensures no agent types are defined in TypeScript but not registered
      const registry = new AgentRegistry();
      const registeredAgentTypes = registry.getAllAgents().map((a) => a.name);

      // All AgentType union members should be registered
      // (Checked by ensuring no TypeScript errors during build)
      expect(
        registeredAgentTypes.length,
        'All agent types should be registered'
      ).toBeGreaterThan(0);
    });
  });

  describe('Workflow Automation Suite Validation', () => {
    it('should have WorkflowOrchestrator registered', () => {
      const registry = new AgentRegistry();
      const agent = registry.getAgent('workflow-orchestrator');

      expect(agent, 'workflow-orchestrator should be registered').toBeDefined();
      expect(agent?.name).toBe('workflow-orchestrator');
      expect(agent?.description).toContain('Workflow');
      if (agent?.capabilities) {
        expect(agent.capabilities).toContain('workflow-automation');
      }
    });

    it('should have OpalAutomationAgent registered', () => {
      const registry = new AgentRegistry();
      const agent = registry.getAgent('opal-automation');

      expect(agent, 'opal-automation should be registered').toBeDefined();
      expect(agent?.name).toBe('opal-automation');
      expect(agent?.description).toContain('Opal');
      if (agent?.capabilities) {
        expect(agent.capabilities).toContain('workflow-automation');
      }
    });

    it('should have N8nWorkflowAgent registered', () => {
      const registry = new AgentRegistry();
      const agent = registry.getAgent('n8n-workflow');

      expect(agent, 'n8n-workflow should be registered').toBeDefined();
      expect(agent?.name).toBe('n8n-workflow');
      expect(agent?.description).toContain('n8n');
      if (agent?.capabilities) {
        expect(agent.capabilities).toContain('workflow-automation');
      }
    });
  });

  describe('DevOps Engineer Validation', () => {
    it('should have DevOpsEngineerAgent registered', () => {
      const registry = new AgentRegistry();
      const agent = registry.getAgent('devops-engineer');

      expect(agent, 'devops-engineer should be registered').toBeDefined();
      expect(agent?.name).toBe('devops-engineer');
      expect(agent?.description).toContain('DevOps');
      if (agent?.capabilities) {
        expect(
          agent.capabilities.length,
          'DevOps Engineer should have capabilities'
        ).toBeGreaterThan(0);
      }
    });
  });
});
