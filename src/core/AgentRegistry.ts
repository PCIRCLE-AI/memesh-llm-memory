/**
 * Agent Registry
 *
 * Centralized registry for all available agents in the smart-agents system.
 * Provides dynamic agent discovery and metadata management.
 */

import { AgentType } from '../orchestrator/types.js';

/**
 * Agent metadata for MCP tool registration
 */
export interface AgentMetadata {
  name: AgentType;
  description: string;
  category: string;
  inputSchema?: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

/**
 * Agent Registry Class
 *
 * Manages the registration and retrieval of all available agents.
 * Provides a centralized source of truth for agent metadata.
 */
export class AgentRegistry {
  private agents: Map<AgentType, AgentMetadata> = new Map();

  constructor() {
    // Auto-register all agents on instantiation
    this.registerAllAgents();
  }

  /**
   * Register a single agent
   */
  registerAgent(agent: AgentMetadata): void {
    this.agents.set(agent.name, agent);
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): AgentMetadata[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent by name
   */
  getAgent(name: AgentType): AgentMetadata | undefined {
    return this.agents.get(name);
  }

  /**
   * Get agents by category
   */
  getAgentsByCategory(category: string): AgentMetadata[] {
    return this.getAllAgents().filter(agent => agent.category === category);
  }

  /**
   * Check if agent exists
   */
  hasAgent(name: AgentType): boolean {
    return this.agents.has(name);
  }

  /**
   * Get total agent count
   */
  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Register all agents (called automatically in constructor)
   *
   * This is the centralized list of all available agents.
   * When new agents are created via scripts/create-agent.sh,
   * they should be added here.
   */
  private registerAllAgents(): void {
    const allAgents: AgentMetadata[] = [
      // Development Agents (9)
      {
        name: 'code-reviewer',
        description: 'Expert code review, security analysis, and best practices validation',
        category: 'development',
      },
      {
        name: 'test-writer',
        description: 'Test automation specialist, TDD expert, coverage analysis',
        category: 'development',
      },
      {
        name: 'debugger',
        description: 'Root cause analysis, debugging specialist, systematic troubleshooting',
        category: 'development',
      },
      {
        name: 'refactorer',
        description: 'Code refactoring expert, design patterns, clean architecture',
        category: 'development',
      },
      {
        name: 'api-designer',
        description: 'API design specialist, RESTful principles, GraphQL expert',
        category: 'development',
      },
      {
        name: 'db-optimizer',
        description: 'Database optimization, query tuning, index design specialist',
        category: 'development',
      },
      {
        name: 'frontend-specialist',
        description: 'Frontend development, React, Vue, modern web frameworks expert',
        category: 'development',
      },
      {
        name: 'backend-specialist',
        description: 'Backend development, API design, server architecture expert',
        category: 'development',
      },
      {
        name: 'development-butler',
        description: 'Event-driven workflow automation, code maintenance, testing, dependency management, git workflow, build automation, development monitoring',
        category: 'development',
      },

      // Analysis Agents (5)
      {
        name: 'rag-agent',
        description: 'Knowledge retrieval, vector search, embedding-based context search',
        category: 'analysis',
      },
      {
        name: 'research-agent',
        description: 'Research specialist, investigation, comparative analysis',
        category: 'analysis',
      },
      {
        name: 'architecture-agent',
        description: 'System architecture expert, design patterns, scalability analysis',
        category: 'analysis',
      },
      {
        name: 'data-analyst',
        description: 'Data analysis, statistics, metrics, visualization specialist',
        category: 'analysis',
      },
      {
        name: 'performance-profiler',
        description: 'Performance profiling, optimization, bottleneck identification',
        category: 'analysis',
      },

      // Knowledge Agents (1)
      {
        name: 'knowledge-agent',
        description: 'Knowledge management, organization, information synthesis',
        category: 'knowledge',
      },

      // Operations Agents (2)
      {
        name: 'devops-engineer',
        description: 'DevOps, CI/CD, infrastructure automation, deployment expert',
        category: 'operations',
      },
      {
        name: 'security-auditor',
        description: 'Security auditing, vulnerability assessment, compliance expert',
        category: 'operations',
      },

      // Creative Agents (2)
      {
        name: 'technical-writer',
        description: 'Technical writing, documentation, user guides, API docs expert',
        category: 'creative',
      },
      {
        name: 'ui-designer',
        description: 'UI/UX design, user experience, interface design specialist',
        category: 'creative',
      },

      // Utility Agents (2)
      {
        name: 'migration-assistant',
        description: 'Migration assistance, upgrade planning, legacy modernization',
        category: 'utility',
      },
      {
        name: 'api-integrator',
        description: 'API integration, third-party services, SDK implementation',
        category: 'utility',
      },

      // General Agent (1)
      {
        name: 'general-agent',
        description: 'Versatile AI assistant for general tasks and fallback operations',
        category: 'general',
      },
    ];

    // Register all agents
    allAgents.forEach(agent => this.registerAgent(agent));
  }
}
