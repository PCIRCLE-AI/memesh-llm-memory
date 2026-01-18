/**
 * Agent Registry - Centralized Agent Discovery and Metadata Management
 *
 * Provides a centralized registry for all available agents in the system with
 * dynamic agent discovery, categorization, classification filtering, and metadata
 * management. Supports a curated set of agents across development, analysis,
 * operations, and creative domains with real implementations, enhanced prompts,
 * and optional features.
 *
 * Features:
 * - Automatic agent registration on instantiation
 * - Agent discovery by name, category, or classification
 * - Three classification types: real-implementation, enhanced-prompt, optional-feature
 * - Agent metadata including capabilities, MCP tools, and dependencies
 * - Validation for agent queries
 * - Agent count and type enumeration
 *
 * Agent Categories:
 * - **development**: Frontend, backend, testing, code review, refactoring
 * - **analysis**: Architecture, research, data analysis
 * - **operations**: Security auditing, infrastructure guidance
 * - **management**: Project management, product management
 * - **creative**: UI/UX design, marketing strategy
 * - **engineering**: ML engineering, data engineering
 *
 * @example
 * ```typescript
 * import { AgentRegistry } from './AgentRegistry.js';
 *
 * // Create registry (auto-registers all agents)
 * const registry = new AgentRegistry();
 *
 * // Get specific agent
 * const codeReviewer = registry.getAgent('code-reviewer');
 * console.log(codeReviewer?.description);
 * console.log(codeReviewer?.capabilities);
 *
 * // Get all development agents
 * const devAgents = registry.getAgentsByCategory('development');
 * console.log(`Found ${devAgents.length} development agents`);
 *
 * // Get agents by classification
 * const realAgents = registry.getRealImplementations();
 * const promptAgents = registry.getEnhancedPrompts();
 * const optionalAgents = registry.getOptionalAgents();
 *
 * console.log(`Real: ${realAgents.length}, Prompt: ${promptAgents.length}, Optional: ${optionalAgents.length}`);
 *
 * // Check agent availability
 * if (registry.hasAgent('frontend-developer')) {
 *   console.log('Frontend development agent available');
 * }
 *
 * // List all agent types
 * const allTypes = registry.getAllAgentTypes();
 * console.log(`Total agents: ${allTypes.length}`);
 * ```
 */

import { AgentType } from '../orchestrator/types.js';
import { AgentClassification } from '../types/AgentClassification.js';
import { ValidationError } from '../errors/index.js';

/**
 * Agent metadata for MCP tool registration and discovery
 *
 * Comprehensive metadata structure describing agent capabilities, dependencies,
 * and classification. Used for agent discovery, validation, and task assignment.
 *
 * @example
 * ```typescript
 * // Real implementation agent with MCP tools
 * const devButler: AgentMetadata = {
 *   name: 'development-butler',
 *   description: 'Event-driven workflow automation, code maintenance, testing',
 *   category: 'development',
 *   classification: AgentClassification.REAL_IMPLEMENTATION,
 *   capabilities: ['workflow', 'testing', 'maintenance'],
 *   mcpTools: ['filesystem', 'memory', 'bash']
 * };
 *
 * // Enhanced prompt agent (no MCP tools needed)
 * const codeReviewer: AgentMetadata = {
 *   name: 'code-reviewer',
 *   description: 'Expert code review, security analysis, best practices',
 *   category: 'development',
 *   classification: AgentClassification.ENHANCED_PROMPT,
 *   capabilities: ['code-review', 'security', 'best-practices']
 * };
 *
 * ```
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

  /** Agent capabilities for task assignment */
  capabilities?: string[];

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
 * Centralized registry managing all available agents in the system.
 * Automatically registers available agents on instantiation with support for
 * dynamic discovery, filtering by category/classification, and metadata queries.
 *
 * @example
 * ```typescript
 * import { AgentRegistry } from './AgentRegistry.js';
 *
 * // Registry auto-registers all agents on creation
 * const registry = new AgentRegistry();
 *
 * // Discover agents by category
 * const developmentAgents = registry.getAgentsByCategory('development');
 * developmentAgents.forEach(agent => {
 *   console.log(`${agent.name}: ${agent.description}`);
 * });
 *
 * // Filter by classification
 * const realAgents = registry.getRealImplementations();
 * console.log(`Real agents with MCP tools: ${realAgents.length}`);
 *
 * // Query specific agent
 * const debugger = registry.getAgent('debugger');
 * if (debugger) {
 *   console.log(`Capabilities: ${debugger.capabilities?.join(', ')}`);
 * }
 * ```
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
   * Retrieves detailed metadata for a specific agent by its type identifier.
   * Returns undefined if agent is not registered. Validates input to ensure
   * non-empty string values.
   *
   * @param name - Agent type identifier (e.g., 'code-reviewer', 'frontend-developer')
   * @returns Agent metadata or undefined if not found
   * @throws ValidationError if name is empty or invalid
   *
   * @example
   * ```typescript
   * const registry = new AgentRegistry();
   *
   * // Get code reviewer agent
   * const reviewer = registry.getAgent('code-reviewer');
   * if (reviewer) {
   *   console.log(`Description: ${reviewer.description}`);
   *   console.log(`Category: ${reviewer.category}`);
   *   console.log(`Classification: ${reviewer.classification}`);
   *   console.log(`Capabilities: ${reviewer.capabilities?.join(', ')}`);
   * } else {
   *   console.log('Agent not found');
   * }
   *
   * // Check for real implementation
   * const devButler = registry.getAgent('development-butler');
   * if (devButler?.mcpTools) {
   *   console.log(`MCP Tools: ${devButler.mcpTools.join(', ')}`);
   * }
   *
   * // Handle invalid input (throws ValidationError)
   * try {
   *   registry.getAgent('');
   * } catch (error) {
   *   console.error('Invalid agent name');
   * }
   * ```
   */
  getAgent(name: AgentType): AgentMetadata | undefined {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new ValidationError('Agent name must be a non-empty string', {
        providedValue: name,
        expectedType: 'non-empty string',
      });
    }
    return this.agents.get(name);
  }

  /**
   * Get agents by category
   *
   * Filters agents by category to find all agents in a specific domain.
   * Useful for discovering available agents for particular types of tasks.
   *
   * Available Categories:
   * - **development**: Frontend, backend, testing, code review, debugging, refactoring
   * - **analysis**: Architecture analysis, research, data analysis
   * - **operations**: Security auditing, infrastructure guidance
   * - **management**: Project management, product management
   * - **creative**: UI/UX design, marketing strategy
   * - **engineering**: ML engineering, data engineering
   *
   * @param category - Category to filter by (e.g., 'development', 'analysis')
   * @returns Array of agents in the specified category
   * @throws ValidationError if category is empty or invalid
   *
   * @example
   * ```typescript
   * const registry = new AgentRegistry();
   *
   * // Get all development agents
   * const devAgents = registry.getAgentsByCategory('development');
   * console.log(`Found ${devAgents.length} development agents:`);
   * devAgents.forEach(agent => {
   *   console.log(`- ${agent.name}: ${agent.description}`);
   * });
   *
   * // Get all analysis agents
   * const analysisAgents = registry.getAgentsByCategory('analysis');
   * const capabilities = analysisAgents.flatMap(a => a.capabilities || []);
   * console.log(`Analysis capabilities: ${capabilities.join(', ')}`);
   *
   * // Get operations agents and check MCP tools
   * const opsAgents = registry.getAgentsByCategory('operations');
   * const toolsNeeded = new Set(opsAgents.flatMap(a => a.mcpTools || []));
   * console.log(`Required MCP tools: ${Array.from(toolsNeeded).join(', ')}`);
   * ```
   */
  getAgentsByCategory(category: string): AgentMetadata[] {
    if (!category || typeof category !== 'string' || category.trim() === '') {
      throw new ValidationError('Category must be a non-empty string', {
        providedValue: category,
        expectedType: 'non-empty string',
      });
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
      throw new ValidationError('Agent name must be a non-empty string', {
        providedValue: name,
        expectedType: 'non-empty string',
      });
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
   * Returns all agents with REAL_IMPLEMENTATION classification.
   * These agents have actual MCP tool integration and can perform real operations
   * like file system access, memory storage, and bash command execution.
   *
   * @returns Array of agents with REAL_IMPLEMENTATION classification
   *
   * @example
   * ```typescript
   * const registry = new AgentRegistry();
   *
   * // Get all real implementation agents
   * const realAgents = registry.getRealImplementations();
   * console.log(`Real agents: ${realAgents.length}`);
   *
   * // List MCP tools required by real agents
   * const allMcpTools = new Set<string>();
   * realAgents.forEach(agent => {
   *   agent.mcpTools?.forEach(tool => allMcpTools.add(tool));
   * });
   * console.log(`MCP tools needed: ${Array.from(allMcpTools).join(', ')}`);
   *
   * // Find agents that can use filesystem
   * const filesystemAgents = realAgents.filter(a =>
   *   a.mcpTools?.includes('filesystem')
   * );
   * console.log(`Agents with filesystem access: ${filesystemAgents.length}`);
   * ```
   */
  getRealImplementations(): AgentMetadata[] {
    return this.getAllAgents().filter(
      agent => agent.classification === AgentClassification.REAL_IMPLEMENTATION
    );
  }

  /**
   * Get agents by classification type
   *
   * Returns all agents with ENHANCED_PROMPT classification.
   * These agents use specialized prompts without MCP tool integration,
   * relying on the underlying LLM's capabilities for their expertise.
   *
   * @returns Array of agents with ENHANCED_PROMPT classification
   *
   * @example
   * ```typescript
   * const registry = new AgentRegistry();
   *
   * // Get all enhanced prompt agents
   * const promptAgents = registry.getEnhancedPrompts();
   * console.log(`Enhanced prompt agents: ${promptAgents.length}`);
   *
   * // Group by category
   * const byCategory = promptAgents.reduce((acc, agent) => {
   *   acc[agent.category] = (acc[agent.category] || 0) + 1;
   *   return acc;
   * }, {} as Record<string, number>);
   * console.log('Agents by category:', byCategory);
   *
   * // List all capabilities
   * const allCapabilities = new Set(
   *   promptAgents.flatMap(a => a.capabilities || [])
   * );
   * console.log(`Available capabilities: ${Array.from(allCapabilities).join(', ')}`);
   * ```
   */
  getEnhancedPrompts(): AgentMetadata[] {
    return this.getAllAgents().filter(
      agent => agent.classification === AgentClassification.ENHANCED_PROMPT
    );
  }

  /**
   * Get agents by classification type
   *
   * Returns all agents with OPTIONAL_FEATURE classification.
   * These agents require external dependencies and may not be available
   * unless dependencies are installed.
   *
   * @returns Array of agents with OPTIONAL_FEATURE classification
   *
   * @example
   * ```typescript
   * const registry = new AgentRegistry();
   *
   * // Get all optional agents
   * const optionalAgents = registry.getOptionalAgents();
   * console.log(`Optional agents: ${optionalAgents.length}`);
   *
   * // Check required dependencies
   * optionalAgents.forEach(agent => {
   *   console.log(`${agent.name} requires: ${agent.requiredDependencies?.join(', ')}`);
   * });
   *
   * // Simulate dependency check
   * const availableDeps = ['playwright']; // Mock installed dependencies
   * const availableOptionalAgents = optionalAgents.filter(agent =>
   *   agent.requiredDependencies?.every(dep => availableDeps.includes(dep))
   * );
   * console.log(`Available optional agents: ${availableOptionalAgents.length}`);
   * ```
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
      // Real Implementation Agents
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
        capabilities: ['testing', 'test-generation', 'coverage'],
      },
      {
        name: 'test-automator',
        description: 'Test automation specialist, automated testing expert',
        category: 'development',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['testing', 'test-generation', 'automation'],
      },
      {
        name: 'e2e-healing-agent',
        description: 'End-to-end test automation with self-healing capabilities, Playwright-powered browser testing, automatic failure analysis and code fixing, reduces test maintenance burden',
        category: 'development',
        classification: AgentClassification.REAL_IMPLEMENTATION,
        mcpTools: ['playwright', 'filesystem', 'bash', 'memory'],
        capabilities: ['e2e-testing', 'auto-healing', 'testing', 'code-generation', 'debugging'],
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

      // Enhanced Prompt Agents (16)
      {
        name: 'frontend-developer',
        description: 'Frontend development expert, React/Vue/Angular specialist',
        category: 'development',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['frontend', 'ui', 'component'],
      },
      {
        name: 'backend-developer',
        description: 'Backend development expert, API and server-side specialist',
        category: 'development',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['backend', 'api', 'server'],
      },
      {
        name: 'database-administrator',
        description: 'Database expert, schema design, query optimization specialist',
        category: 'development',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['database', 'schema', 'query'],
      },
      {
        name: 'performance-engineer',
        description: 'Performance optimization expert, bottleneck analysis, caching specialist',
        category: 'development',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['performance', 'optimization', 'cache'],
      },
      {
        name: 'architecture-agent',
        description: 'System architecture expert, design patterns, scalability analysis',
        category: 'analysis',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['architecture', 'design-patterns', 'scalability'],
      },
      {
        name: 'code-reviewer',
        description: 'Expert code review, security analysis, and best practices validation',
        category: 'development',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['code-review', 'best-practices'],
      },
      {
        name: 'security-auditor',
        description: 'Security auditing, vulnerability assessment, compliance expert',
        category: 'operations',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['security-audit', 'vulnerability-assessment', 'compliance'],
      },
      {
        name: 'ui-designer',
        description: 'UI/UX design, user experience, interface design specialist',
        category: 'creative',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['ui-design', 'ux-design', 'frontend'],
      },
      {
        name: 'marketing-strategist',
        description: 'Marketing strategy, brand positioning, growth hacking expert',
        category: 'business',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['marketing', 'strategy', 'growth'],
      },
      {
        name: 'product-manager',
        description: 'Product strategy, user research, feature prioritization expert',
        category: 'management',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['product-management', 'user-research', 'prioritization'],
      },
      {
        name: 'ml-engineer',
        description: 'Machine learning engineering, model training, ML pipeline expert',
        category: 'engineering',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['machine-learning', 'model-training', 'ml-pipeline'],
      },
      {
        name: 'debugger',
        description: 'Advanced debugging, root cause analysis, systematic problem solving',
        category: 'development',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['debugging', 'root-cause-analysis', 'problem-solving'],
      },
      {
        name: 'refactorer',
        description: 'Code refactoring, technical debt reduction, code quality improvement',
        category: 'development',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['refactoring', 'code-quality', 'technical-debt'],
      },
      {
        name: 'api-designer',
        description: 'API design, REST/GraphQL architecture, API documentation expert',
        category: 'development',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['api-design', 'rest', 'graphql', 'backend'],
      },
      {
        name: 'research-agent',
        description: 'Technical research, feasibility analysis, technology evaluation',
        category: 'analysis',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['research', 'feasibility-analysis', 'evaluation'],
      },
      {
        name: 'data-analyst',
        description: 'Data analysis, statistical modeling, business intelligence expert',
        category: 'analysis',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['data-analysis', 'statistics', 'business-intelligence'],
      },
      {
        name: 'performance-profiler',
        description: 'Performance profiling, bottleneck identification, optimization analysis',
        category: 'development',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['performance', 'profiling', 'optimization'],
      },
      {
        name: 'db-optimizer',
        description: 'Database optimization, query tuning, index design specialist',
        category: 'development',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['database', 'optimization', 'query-tuning'],
      },
      {
        name: 'frontend-specialist',
        description: 'Frontend architecture, performance optimization, modern frameworks expert',
        category: 'development',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['frontend', 'architecture', 'optimization'],
      },
      {
        name: 'backend-specialist',
        description: 'Backend architecture, scalability, microservices expert',
        category: 'development',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['backend', 'architecture', 'scalability'],
      },
      {
        name: 'knowledge-agent',
        description: 'Knowledge management, information retrieval, documentation organization',
        category: 'knowledge',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['knowledge-management', 'information-retrieval', 'documentation'],
      },
      {
        name: 'technical-writer',
        description: 'Technical documentation, API documentation, user guides expert',
        category: 'creative',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['documentation', 'technical-writing', 'api-docs'],
      },
      {
        name: 'migration-assistant',
        description: 'Migration planning, version upgrades, legacy system modernization',
        category: 'utility',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['migration', 'upgrade', 'modernization'],
      },
      {
        name: 'api-integrator',
        description: 'API integration, third-party services, SDK implementation expert',
        category: 'utility',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['api-integration', 'third-party', 'sdk'],
      },
      {
        name: 'general-agent',
        description: 'General purpose agent for miscellaneous tasks and fallback scenarios',
        category: 'general',
        classification: AgentClassification.ENHANCED_PROMPT,
        capabilities: ['general'],
      },

    ];

    // Register all agents
    allAgents.forEach(agent => this.registerAgent(agent));
  }
}
