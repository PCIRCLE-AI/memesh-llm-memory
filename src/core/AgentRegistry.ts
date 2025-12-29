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
  /** Unique agent identifier */
  name: AgentType;

  /** Human-readable description of agent capabilities */
  description: string;

  /** Agent category for organization (development, analysis, knowledge, operations, creative, utility, general) */
  category: string;

  /** Optional JSON schema for input validation */
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
   *
   * @param agent - Agent metadata to register
   */
  registerAgent(agent: AgentMetadata): void {
    this.agents.set(agent.name, agent);
  }

  /**
   * Get all registered agents
   *
   * @returns Array of all agent metadata
   */
  getAllAgents(): AgentMetadata[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent by name
   *
   * @param name - Agent type identifier
   * @returns Agent metadata or undefined if not found
   * @throws Error if name is empty or invalid
   */
  getAgent(name: AgentType): AgentMetadata | undefined {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Agent name must be a non-empty string');
    }
    return this.agents.get(name);
  }

  /**
   * Get agents by category
   *
   * @param category - Category to filter by (e.g., 'development', 'analysis')
   * @returns Array of agents in the specified category
   * @throws Error if category is empty or invalid
   */
  getAgentsByCategory(category: string): AgentMetadata[] {
    if (!category || typeof category !== 'string' || category.trim() === '') {
      throw new Error('Category must be a non-empty string');
    }
    return this.getAllAgents().filter(agent => agent.category === category);
  }

  /**
   * Check if agent exists
   *
   * @param name - Agent type identifier
   * @returns True if agent is registered
   * @throws Error if name is empty or invalid
   */
  hasAgent(name: AgentType): boolean {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Agent name must be a non-empty string');
    }
    return this.agents.has(name);
  }

  /**
   * Get total agent count
   *
   * @returns Number of registered agents
   */
  getAgentCount(): number {
    return this.agents.size;
  }

  /**
   * Get all agent types (names only)
   *
   * Useful for validation and type checking
   *
   * @returns Array of all agent type identifiers
   */
  getAllAgentTypes(): AgentType[] {
    return Array.from(this.agents.keys());
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
