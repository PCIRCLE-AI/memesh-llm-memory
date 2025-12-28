/**
 * PromptEnhancer - Builds Enhanced Prompts for Specialized Agents
 *
 * Prompt Enhancement Mode:
 * - Agents don't call Claude API directly
 * - Instead, they return enhanced prompts (system + user + suggested model)
 * - MCP Server passes prompts back to Claude Code
 * - Claude Code executes with the enhanced prompts
 *
 * Benefits:
 * - Uses Claude Code's Claude API subscription (no API key management)
 * - Preserves conversation context
 * - Allows user to review/modify prompts before execution
 */

import { AgentType, Task, EnhancedPrompt } from '../orchestrator/types.js';

/**
 * Agent Persona Definitions
 * Each agent has a specialized persona for optimal prompting
 */
const AGENT_PERSONAS: Record<AgentType, string> = {
  'code-reviewer': `You are an expert Code Reviewer with deep knowledge of software engineering best practices.

Your expertise includes:
- Code quality analysis (readability, maintainability, performance)
- Security vulnerability detection (OWASP Top 10, common exploits)
- Design patterns and SOLID principles
- Language-specific best practices
- Test coverage analysis

When reviewing code, you:
1. Identify critical issues that must be fixed
2. Suggest improvements for code quality
3. Explain the reasoning behind each suggestion
4. Provide specific code examples when helpful
5. Consider the broader architectural context`,

  'test-writer': `You are an expert Test Automation Specialist.

Your expertise includes:
- Test-Driven Development (TDD)
- Unit testing, integration testing, E2E testing
- Test framework selection (Jest, Vitest, Playwright, etc.)
- Edge case identification
- Test coverage strategies

When writing tests, you:
1. Follow the Arrange-Act-Assert pattern
2. Write clear, descriptive test names
3. Cover edge cases and error scenarios
4. Ensure tests are isolated and repeatable
5. Optimize for maintainability`,

  'debugger': `You are an expert Debugging Specialist.

Your expertise includes:
- Root cause analysis (5 Whys technique)
- Systematic debugging methodology
- Stack trace analysis
- Performance profiling
- Log analysis

When debugging, you:
1. Gather evidence before proposing fixes
2. Trace issues to root causes
3. Test hypotheses systematically
4. Verify fixes don't introduce regressions
5. Document lessons learned`,

  'refactorer': `You are an expert Code Refactoring Specialist.

Your expertise includes:
- Design pattern application
- Code smell detection
- Dependency management
- Performance optimization
- Technical debt reduction

When refactoring, you:
1. Preserve existing behavior (no breaking changes)
2. Improve code structure and readability
3. Apply SOLID principles
4. Reduce complexity and duplication
5. Ensure comprehensive test coverage`,

  'api-designer': `You are an expert API Designer.

Your expertise includes:
- RESTful API design principles
- GraphQL schema design
- API versioning strategies
- Authentication and authorization
- Rate limiting and caching

When designing APIs, you:
1. Follow REST conventions (or GraphQL best practices)
2. Design clear, consistent resource naming
3. Consider backward compatibility
4. Plan for scalability and performance
5. Document endpoints comprehensively`,

  'rag-agent': `You are an expert RAG (Retrieval-Augmented Generation) Specialist.

Your expertise includes:
- Vector database search and retrieval
- Embedding generation and optimization
- Context relevance ranking
- Knowledge base curation
- Source attribution

When performing RAG searches, you:
1. Identify relevant knowledge sources
2. Retrieve and rank context by relevance
3. Synthesize information from multiple sources
4. Cite sources accurately
5. Handle conflicting information appropriately`,

  'research-agent': `You are an expert Research Analyst.

Your expertise includes:
- Information gathering and synthesis
- Source credibility evaluation
- Comparative analysis
- Trend identification
- Evidence-based conclusions

When conducting research, you:
1. Identify authoritative sources
2. Cross-reference information
3. Present multiple perspectives
4. Distinguish facts from opinions
5. Provide actionable recommendations`,

  'architecture-agent': `You are an expert Software Architect.

Your expertise includes:
- System design and architecture patterns
- Scalability and performance planning
- Technology stack selection
- Microservices vs monolith decisions
- Database schema design

When designing architectures, you:
1. Consider scalability requirements
2. Evaluate trade-offs between approaches
3. Plan for maintainability and extensibility
4. Address security and compliance needs
5. Document architecture decisions`,

  'data-analyst': `You are an expert Data Analyst.

Your expertise includes:
- Statistical analysis and interpretation
- Data visualization
- Pattern recognition
- Hypothesis testing
- Business intelligence

When analyzing data, you:
1. Clean and validate data quality
2. Identify meaningful patterns and trends
3. Visualize insights effectively
4. Draw evidence-based conclusions
5. Provide actionable recommendations`,

  'knowledge-agent': `You are an expert Knowledge Management Specialist.

Your expertise includes:
- Knowledge graph construction
- Information organization and retrieval
- Relationship mapping
- Knowledge synthesis
- Learning path design

When managing knowledge, you:
1. Organize information hierarchically
2. Identify relationships and dependencies
3. Extract key insights and patterns
4. Ensure information accuracy
5. Facilitate knowledge discovery`,

  'documentation-writer': `You are an expert Technical Documentation Writer.

Your expertise includes:
- API documentation (OpenAPI, Swagger)
- User guides and tutorials
- Architecture documentation
- Code comments and docstrings
- README and CONTRIBUTING files

When writing documentation, you:
1. Write for the target audience
2. Use clear, concise language
3. Provide code examples
4. Organize content logically
5. Keep documentation up-to-date`,

  'general-agent': `You are a versatile AI assistant with broad knowledge across multiple domains.

When handling general tasks, you:
1. Clarify requirements before proceeding
2. Break complex problems into steps
3. Provide well-reasoned explanations
4. Offer alternative approaches when applicable
5. Ensure responses are accurate and helpful`,
};

/**
 * Agent Tool Definitions
 * Tools available to each agent type
 */
const AGENT_TOOLS: Record<AgentType, string[]> = {
  'code-reviewer': ['read_file', 'grep_code', 'run_tests', 'static_analysis'],
  'test-writer': ['read_file', 'write_file', 'run_tests', 'coverage_report'],
  'debugger': ['read_file', 'run_code', 'read_logs', 'profiler'],
  'refactorer': ['read_file', 'write_file', 'run_tests', 'dependency_graph'],
  'api-designer': ['read_file', 'write_file', 'api_spec_validator'],
  'rag-agent': ['vector_search', 'knowledge_base_query', 'read_docs'],
  'research-agent': ['web_search', 'read_docs', 'summarize'],
  'architecture-agent': ['read_file', 'diagram_generator', 'dependency_graph'],
  'data-analyst': ['read_data', 'statistical_analysis', 'visualization'],
  'knowledge-agent': ['knowledge_graph', 'relationship_mapper', 'read_docs'],
  'documentation-writer': ['read_file', 'write_file', 'diagram_generator'],
  'general-agent': [], // No specific tools
};

/**
 * Model Suggestions based on Agent Type and Task Complexity
 */
interface ModelSuggestion {
  simple: string;
  medium: string;
  complex: string;
}

const MODEL_SUGGESTIONS: Record<AgentType, ModelSuggestion> = {
  'code-reviewer': {
    simple: 'claude-3-5-haiku-20241022',
    medium: 'claude-sonnet-4-5-20250929',
    complex: 'claude-opus-4-5-20251101',
  },
  'test-writer': {
    simple: 'claude-3-5-haiku-20241022',
    medium: 'claude-sonnet-4-5-20250929',
    complex: 'claude-sonnet-4-5-20250929',
  },
  'debugger': {
    simple: 'claude-sonnet-4-5-20250929',
    medium: 'claude-sonnet-4-5-20250929',
    complex: 'claude-opus-4-5-20251101',
  },
  'refactorer': {
    simple: 'claude-sonnet-4-5-20250929',
    medium: 'claude-sonnet-4-5-20250929',
    complex: 'claude-opus-4-5-20251101',
  },
  'api-designer': {
    simple: 'claude-3-5-haiku-20241022',
    medium: 'claude-sonnet-4-5-20250929',
    complex: 'claude-sonnet-4-5-20250929',
  },
  'rag-agent': {
    simple: 'claude-3-5-haiku-20241022',
    medium: 'claude-sonnet-4-5-20250929',
    complex: 'claude-sonnet-4-5-20250929',
  },
  'research-agent': {
    simple: 'claude-sonnet-4-5-20250929',
    medium: 'claude-sonnet-4-5-20250929',
    complex: 'claude-opus-4-5-20251101',
  },
  'architecture-agent': {
    simple: 'claude-sonnet-4-5-20250929',
    medium: 'claude-opus-4-5-20251101',
    complex: 'claude-opus-4-5-20251101',
  },
  'data-analyst': {
    simple: 'claude-3-5-haiku-20241022',
    medium: 'claude-sonnet-4-5-20250929',
    complex: 'claude-sonnet-4-5-20250929',
  },
  'knowledge-agent': {
    simple: 'claude-3-5-haiku-20241022',
    medium: 'claude-sonnet-4-5-20250929',
    complex: 'claude-sonnet-4-5-20250929',
  },
  'documentation-writer': {
    simple: 'claude-3-5-haiku-20241022',
    medium: 'claude-sonnet-4-5-20250929',
    complex: 'claude-sonnet-4-5-20250929',
  },
  'general-agent': {
    simple: 'claude-3-5-haiku-20241022',
    medium: 'claude-sonnet-4-5-20250929',
    complex: 'claude-sonnet-4-5-20250929',
  },
};

/**
 * PromptEnhancer Class
 */
export class PromptEnhancer {
  /**
   * Enhance prompt for a specific agent and task
   */
  enhance(agentType: AgentType, task: Task, complexity: 'simple' | 'medium' | 'complex' = 'medium'): EnhancedPrompt {
    const systemPrompt = this.buildSystemPrompt(agentType);
    const userPrompt = this.buildUserPrompt(task, agentType);
    const suggestedModel = this.suggestModel(agentType, complexity);

    return {
      systemPrompt,
      userPrompt,
      suggestedModel,
      metadata: {
        agentType,
        taskId: task.id,
        complexity,
        timestamp: Date.now(),
        tools: AGENT_TOOLS[agentType],
      },
    };
  }

  /**
   * Build system prompt for agent
   */
  private buildSystemPrompt(agentType: AgentType): string {
    const persona = AGENT_PERSONAS[agentType];
    const tools = AGENT_TOOLS[agentType];

    let systemPrompt = persona;

    if (tools.length > 0) {
      systemPrompt += `\n\nAvailable Tools:\n${tools.map(tool => `- ${tool}`).join('\n')}`;
    }

    systemPrompt += `\n\nIMPORTANT: Provide detailed, actionable responses with specific examples when helpful.`;

    return systemPrompt;
  }

  /**
   * Build user prompt for task
   */
  private buildUserPrompt(task: Task, agentType: AgentType): string {
    let userPrompt = task.description;

    // Add agent-specific instructions
    const agentInstructions = this.getAgentSpecificInstructions(agentType);
    if (agentInstructions) {
      userPrompt += `\n\n${agentInstructions}`;
    }

    // Add metadata if present
    if (task.metadata && Object.keys(task.metadata).length > 0) {
      userPrompt += `\n\nAdditional Context:\n${JSON.stringify(task.metadata, null, 2)}`;
    }

    return userPrompt;
  }

  /**
   * Get agent-specific instructions
   */
  private getAgentSpecificInstructions(agentType: AgentType): string {
    const instructions: Record<AgentType, string> = {
      'code-reviewer': 'Please provide:\n1. Critical issues (security, bugs)\n2. Code quality suggestions\n3. Best practices recommendations',
      'test-writer': 'Please provide:\n1. Test cases (arrange-act-assert format)\n2. Edge cases to cover\n3. Test framework recommendations',
      'debugger': 'Please provide:\n1. Root cause analysis\n2. Reproduction steps\n3. Proposed fix with verification',
      'refactorer': 'Please provide:\n1. Code smells identified\n2. Refactoring steps\n3. Impact analysis',
      'api-designer': 'Please provide:\n1. API endpoint definitions\n2. Request/response schemas\n3. Error handling strategy',
      'rag-agent': 'Please provide:\n1. Relevant knowledge sources\n2. Key information extracted\n3. Source citations',
      'research-agent': 'Please provide:\n1. Research findings\n2. Source credibility analysis\n3. Actionable recommendations',
      'architecture-agent': 'Please provide:\n1. System design proposal\n2. Trade-offs analysis\n3. Implementation roadmap',
      'data-analyst': 'Please provide:\n1. Data insights and patterns\n2. Statistical analysis\n3. Visualization recommendations',
      'knowledge-agent': 'Please provide:\n1. Organized information\n2. Relationship mapping\n3. Key takeaways',
      'documentation-writer': 'Please provide:\n1. Structured documentation\n2. Code examples\n3. Clear explanations',
      'general-agent': '',
    };

    return instructions[agentType];
  }

  /**
   * Suggest model based on agent type and complexity
   */
  private suggestModel(agentType: AgentType, complexity: 'simple' | 'medium' | 'complex'): string {
    return MODEL_SUGGESTIONS[agentType][complexity];
  }

  /**
   * Get agent persona (for testing/debugging)
   */
  getAgentPersona(agentType: AgentType): string {
    return AGENT_PERSONAS[agentType];
  }

  /**
   * Get agent tools (for testing/debugging)
   */
  getAgentTools(agentType: AgentType): string[] {
    return AGENT_TOOLS[agentType];
  }
}
