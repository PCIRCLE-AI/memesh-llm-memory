/**
 * Agent Registry
 *
 * Centralized registry for all available agents in the smart-agents system.
 * Provides dynamic agent discovery and metadata management.
 */

import { AgentType } from '../orchestrator/types.js';
import { AgentClassification } from '../types/AgentClassification.js';

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

  /** Agent classification (real-implementation, enhanced-prompt, optional-feature) */
  classification: AgentClassification;

  /** MCP tools required by this agent */
  mcpTools?: string[];

  /** External dependencies required for optional agents */
  requiredDependencies?: string[];

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
   * Get agents by classification type
   *
   * @returns Array of agents with REAL_IMPLEMENTATION classification
   */
  getRealImplementations(): AgentMetadata[] {
    return this.getAllAgents().filter(
      agent => agent.classification === AgentClassification.REAL_IMPLEMENTATION
    );
  }

  /**
   * Get agents by classification type
   *
   * @returns Array of agents with ENHANCED_PROMPT classification
   */
  getEnhancedPrompts(): AgentMetadata[] {
    return this.getAllAgents().filter(
      agent => agent.classification === AgentClassification.ENHANCED_PROMPT
    );
  }

  /**
   * Get agents by classification type
   *
   * @returns Array of agents with OPTIONAL_FEATURE classification
   */
  getOptionalAgents(): AgentMetadata[] {
    return this.getAllAgents().filter(
      agent => agent.classification === AgentClassification.OPTIONAL_FEATURE
    );
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
      // Real Implementation Agents (5)
      {
        name: 'development-butler',
        description: 'Event-driven workflow automation, code maintenance, testing, dependency management, git workflow, build automation, development monitoring',
        category: 'development',
        classification: AgentClassification.REAL_IMPLEMENTATION,
        mcpTools: ['filesystem', 'memory', 'bash'],
      },
      {
        name: 'test-writer',
        description: 'Test automation specialist, TDD expert, coverage analysis',
        category: 'development',
        classification: AgentClassification.REAL_IMPLEMENTATION,
        mcpTools: ['filesystem', 'bash'],
      },
      {
        name: 'devops-engineer',
        description: 'DevOps, CI/CD, infrastructure automation, deployment expert',
        category: 'operations',
        classification: AgentClassification.REAL_IMPLEMENTATION,
        mcpTools: ['bash', 'filesystem'],
      },
      {
        name: 'project-manager',
        description: 'Project planning, task management, milestone tracking, team coordination',
        category: 'management',
        classification: AgentClassification.REAL_IMPLEMENTATION,
        mcpTools: ['memory', 'filesystem'],
      },
      {
        name: 'data-engineer',
        description: 'Data pipeline development, ETL processes, data quality management',
        category: 'engineering',
        classification: AgentClassification.REAL_IMPLEMENTATION,
        mcpTools: ['bash', 'filesystem'],
      },

      // Enhanced Prompt Agents (7)
      {
        name: 'architecture-agent',
        description: 'System architecture expert, design patterns, scalability analysis',
        category: 'analysis',
        classification: AgentClassification.ENHANCED_PROMPT,
      },
      {
        name: 'code-reviewer',
        description: 'Expert code review, security analysis, and best practices validation',
        category: 'development',
        classification: AgentClassification.ENHANCED_PROMPT,
      },
      {
        name: 'security-auditor',
        description: 'Security auditing, vulnerability assessment, compliance expert',
        category: 'operations',
        classification: AgentClassification.ENHANCED_PROMPT,
      },
      {
        name: 'ui-designer',
        description: 'UI/UX design, user experience, interface design specialist',
        category: 'creative',
        classification: AgentClassification.ENHANCED_PROMPT,
      },
      {
        name: 'marketing-strategist',
        description: 'Marketing strategy, brand positioning, growth hacking expert',
        category: 'business',
        classification: AgentClassification.ENHANCED_PROMPT,
      },
      {
        name: 'product-manager',
        description: 'Product strategy, user research, feature prioritization expert',
        category: 'management',
        classification: AgentClassification.ENHANCED_PROMPT,
      },
      {
        name: 'ml-engineer',
        description: 'Machine learning engineering, model training, ML pipeline expert',
        category: 'engineering',
        classification: AgentClassification.ENHANCED_PROMPT,
      },

      // Optional Feature Agents (1)
      {
        name: 'rag-agent',
        description: 'Knowledge retrieval, vector search, embedding-based context search',
        category: 'analysis',
        classification: AgentClassification.OPTIONAL_FEATURE,
        requiredDependencies: ['chromadb', 'openai'],
      },
    ];

    // Register all agents
    allAgents.forEach(agent => this.registerAgent(agent));
  }
}
