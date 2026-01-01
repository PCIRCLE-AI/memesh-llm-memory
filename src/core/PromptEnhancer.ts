/**
 * PromptEnhancer - Enhanced Prompt Builder for Specialized Agents
 *
 * Builds optimized prompts for specialized agents by combining agent personas,
 * task descriptions, and complexity-aware model selection. Works in "Prompt Enhancement Mode"
 * where agents return enhanced prompts instead of directly calling the Claude API.
 *
 * Architecture:
 * 1. Agent receives task → PromptEnhancer builds enhanced prompt
 * 2. Agent returns EnhancedPrompt (system + user + model suggestion)
 * 3. MCP Server passes prompt back to Claude Code
 * 4. Claude Code executes prompt using Claude API subscription
 *
 * Benefits:
 * - **No API Key Management**: Uses Claude Code's built-in Claude API subscription
 * - **Context Preservation**: Maintains conversation context within Claude Code
 * - **User Control**: Allows user to review/modify prompts before execution
 * - **Cost Optimization**: Complexity-based model selection (Haiku/Sonnet/Opus)
 * - **Specialized Expertise**: Agent-specific personas and tool definitions
 *
 * Agent Types Supported (33 total):
 * - **Development**: code-reviewer, test-writer, debugger, refactorer, api-designer
 * - **Frontend/Backend**: frontend-specialist, backend-specialist, frontend-developer, backend-developer
 * - **Infrastructure**: devops-engineer, database-administrator, performance-engineer
 * - **Security**: security-auditor
 * - **Data**: data-analyst, data-engineer, ml-engineer, db-optimizer
 * - **Research**: research-agent, rag-agent, knowledge-agent
 * - **Management**: project-manager, product-manager, marketing-strategist
 * - **Documentation**: technical-writer, ui-designer
 * - **Automation**: development-butler, test-automator, performance-profiler
 * - **Integration**: api-integrator, migration-assistant
 * - **Architecture**: architecture-agent
 * - **General**: general-agent
 *
 * Complexity-Based Model Selection:
 * - **simple**: claude-3-5-haiku-20241022 (fast, cost-effective)
 * - **medium**: claude-sonnet-4-5-20250929 (balanced performance)
 * - **complex**: claude-opus-4-5-20251101 (highest quality, most expensive)
 *
 * @example
 * ```typescript
 * import { PromptEnhancer } from './PromptEnhancer.js';
 * import { Task } from '../orchestrator/types.js';
 *
 * const enhancer = new PromptEnhancer();
 *
 * // Simple code review task
 * const task1: Task = {
 *   id: 'task-001',
 *   description: 'Review authentication.ts for security issues',
 *   agentType: 'code-reviewer',
 *   status: 'pending'
 * };
 *
 * const prompt1 = enhancer.enhance('code-reviewer', task1, 'simple');
 * console.log(prompt1.suggestedModel); // 'claude-3-5-haiku-20241022'
 * console.log(prompt1.systemPrompt); // Code reviewer persona + tools
 * console.log(prompt1.userPrompt); // Task description + instructions
 *
 * // Complex architecture design task
 * const task2: Task = {
 *   id: 'task-002',
 *   description: 'Design microservices architecture for e-commerce platform',
 *   agentType: 'architecture-agent',
 *   status: 'pending',
 *   metadata: { userCount: '1M', regions: ['US', 'EU', 'APAC'] }
 * };
 *
 * const prompt2 = enhancer.enhance('architecture-agent', task2, 'complex');
 * console.log(prompt2.suggestedModel); // 'claude-opus-4-5-20251101'
 * console.log(prompt2.metadata.tools); // Architecture-specific tools
 *
 * // Get agent information (for debugging)
 * const persona = enhancer.getAgentPersona('debugger');
 * const tools = enhancer.getAgentTools('debugger');
 * console.log(`Debugger persona: ${persona.substring(0, 50)}...`);
 * console.log(`Debugger tools: ${tools.join(', ')}`);
 * ```
 */

import { AgentType, Task, EnhancedPrompt } from '../orchestrator/types.js';
import {
  AGENT_PERSONAS,
  AGENT_TOOLS,
  AGENT_INSTRUCTIONS,
  MODEL_SUGGESTIONS,
  type ModelSuggestion,
} from '../prompts/templates/PromptTemplates.js';

/**
 * All constant templates have been extracted to PromptTemplates.ts
 * This reduces file size from 1,615 lines to ~200 lines (88% reduction)
 * @see ../prompts/templates/PromptTemplates.ts
 */

/**
 * PromptEnhancer Class
 *
 * Builds optimized prompts for specialized agents by combining:
 * - Agent personas (expert identity and capabilities)
 * - Agent-specific tools and instructions
 * - Task descriptions with metadata
 * - Complexity-aware model selection
 *
 * Core Responsibilities:
 * - Generate system prompts with agent personas and tool lists
 * - Generate user prompts with task descriptions and agent-specific instructions
 * - Suggest appropriate Claude models based on agent type and task complexity
 * - Provide prompt metadata for tracking and debugging
 *
 * @example
 * ```typescript
 * import { PromptEnhancer } from './PromptEnhancer.js';
 * import { Task } from '../orchestrator/types.js';
 *
 * const enhancer = new PromptEnhancer();
 *
 * // Simple task - code review
 * const task1: Task = {
 *   id: 'task-001',
 *   description: 'Review login.ts for security vulnerabilities',
 *   agentType: 'code-reviewer',
 *   status: 'pending'
 * };
 *
 * const prompt1 = enhancer.enhance('code-reviewer', task1, 'simple');
 * console.log(prompt1.suggestedModel); // 'claude-3-5-haiku-20241022'
 * console.log(prompt1.systemPrompt.includes('Code Review Expert')); // true
 * console.log(prompt1.metadata.tools); // ['read_file', 'grep_code', 'run_tests', ...]
 *
 * // Complex task - architecture design
 * const task2: Task = {
 *   id: 'task-002',
 *   description: 'Design scalable microservices architecture',
 *   agentType: 'architecture-agent',
 *   status: 'pending',
 *   metadata: {
 *     requirements: ['high availability', 'horizontal scaling'],
 *     constraints: ['budget', 'timeline']
 *   }
 * };
 *
 * const prompt2 = enhancer.enhance('architecture-agent', task2, 'complex');
 * console.log(prompt2.suggestedModel); // 'claude-opus-4-5-20251101'
 * console.log(prompt2.userPrompt.includes('Additional Context')); // true
 *
 * // Debugging - get agent information
 * const persona = enhancer.getAgentPersona('debugger');
 * const tools = enhancer.getAgentTools('debugger');
 * console.log(persona.substring(0, 50)); // 'You are an expert Debugger specializing in...'
 * console.log(tools); // ['read_file', 'run_code', 'read_logs', 'profiler']
 * ```
 */
export class PromptEnhancer {
  /**
   * Enhance prompt for a specific agent and task
   *
   * Generates a complete enhanced prompt by combining agent persona, task description,
   * agent-specific instructions, and complexity-appropriate model suggestion.
   *
   * Process:
   * 1. Build system prompt with agent persona and tool list
   * 2. Build user prompt with task description and agent-specific instructions
   * 3. Suggest model based on agent type and complexity
   * 4. Package prompt components with metadata
   *
   * @param agentType - Type of agent (e.g., 'code-reviewer', 'debugger')
   * @param task - Task object with description and metadata
   * @param complexity - Task complexity level (default: 'medium')
   * @returns EnhancedPrompt with system/user prompts, model suggestion, and metadata
   *
   * @example
   * ```typescript
   * // Simple code review
   * const task1: Task = {
   *   id: 'cr-001',
   *   description: 'Review auth.ts for best practices',
   *   agentType: 'code-reviewer',
   *   status: 'pending'
   * };
   * const prompt1 = enhancer.enhance('code-reviewer', task1, 'simple');
   * // Returns: {
   * //   systemPrompt: 'You are an expert Code Review...\n\nAvailable Tools:\n- read_file\n...',
   * //   userPrompt: 'Review auth.ts...\n\nPlease provide:\n1. Critical issues...',
   * //   suggestedModel: 'claude-3-5-haiku-20241022',
   * //   metadata: { agentType: 'code-reviewer', taskId: 'cr-001', complexity: 'simple', ... }
   * // }
   *
   * // Medium debugging task
   * const task2: Task = {
   *   id: 'debug-002',
   *   description: 'Investigate memory leak in WebSocket handler',
   *   agentType: 'debugger',
   *   status: 'pending',
   *   metadata: { errorLog: '...', heapSnapshot: '...' }
   * };
   * const prompt2 = enhancer.enhance('debugger', task2, 'medium');
   * // Returns: {
   * //   systemPrompt: 'You are an expert Debugger...\n\nAvailable Tools:\n- profiler\n...',
   * //   userPrompt: 'Investigate memory leak...\n\nAdditional Context:\n{ errorLog: ... }',
   * //   suggestedModel: 'claude-sonnet-4-5-20250929',
   * //   metadata: { agentType: 'debugger', taskId: 'debug-002', complexity: 'medium', ... }
   * // }
   *
   * // Complex architecture design
   * const task3: Task = {
   *   id: 'arch-003',
   *   description: 'Design distributed caching system for 10M users',
   *   agentType: 'architecture-agent',
   *   status: 'pending'
   * };
   * const prompt3 = enhancer.enhance('architecture-agent', task3, 'complex');
   * // Returns: {
   * //   systemPrompt: 'You are an expert Software Architect...',
   * //   userPrompt: 'Design distributed caching system...',
   * //   suggestedModel: 'claude-opus-4-5-20251101',
   * //   metadata: { complexity: 'complex', ... }
   * // }
   * ```
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
   *
   * Constructs the system prompt by combining:
   * 1. Agent persona (from AGENT_PERSONAS constant)
   * 2. Available tools list (from AGENT_TOOLS constant)
   * 3. General instruction for detailed, actionable responses
   *
   * System Prompt Structure:
   * ```
   * [Agent Persona]
   *
   * Available Tools:
   * - tool1
   * - tool2
   * ...
   *
   * IMPORTANT: Provide detailed, actionable responses with specific examples when helpful.
   * ```
   *
   * @param agentType - Type of agent to build prompt for
   * @returns Complete system prompt string
   *
   * @example
   * ```typescript
   * // Code reviewer system prompt
   * const systemPrompt1 = enhancer['buildSystemPrompt']('code-reviewer');
   * // Returns:
   * // "You are an expert Code Review Specialist...
   * //
   * // Available Tools:
   * // - read_file
   * // - grep_code
   * // - run_tests
   * // - static_analysis
   * //
   * // IMPORTANT: Provide detailed, actionable responses with specific examples when helpful."
   *
   * // General agent (no tools)
   * const systemPrompt2 = enhancer['buildSystemPrompt']('general-agent');
   * // Returns:
   * // "You are a helpful AI assistant...
   * //
   * // IMPORTANT: Provide detailed, actionable responses with specific examples when helpful."
   * // (No "Available Tools" section)
   * ```
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
   *
   * Constructs the user prompt by combining:
   * 1. Task description
   * 2. Agent-specific instructions (from getAgentSpecificInstructions)
   * 3. Task metadata (if present) as "Additional Context"
   *
   * User Prompt Structure:
   * ```
   * [Task Description]
   *
   * [Agent-Specific Instructions]
   *
   * Additional Context:
   * { ...task.metadata }
   * ```
   *
   * @param task - Task object with description and optional metadata
   * @param agentType - Type of agent to get instructions for
   * @returns Complete user prompt string
   *
   * @example
   * ```typescript
   * // Simple task without metadata
   * const task1: Task = {
   *   id: 'task-001',
   *   description: 'Review authentication.ts for security issues',
   *   agentType: 'code-reviewer',
   *   status: 'pending'
   * };
   * const userPrompt1 = enhancer['buildUserPrompt'](task1, 'code-reviewer');
   * // Returns:
   * // "Review authentication.ts for security issues
   * //
   * // Please provide:
   * // 1. Critical issues (security, bugs)
   * // 2. Code quality suggestions
   * // 3. Best practices recommendations"
   *
   * // Task with metadata
   * const task2: Task = {
   *   id: 'task-002',
   *   description: 'Design microservices architecture',
   *   agentType: 'architecture-agent',
   *   status: 'pending',
   *   metadata: {
   *     constraints: ['budget: $50k', 'timeline: 6 months'],
   *     requirements: ['high availability', 'horizontal scaling']
   *   }
   * };
   * const userPrompt2 = enhancer['buildUserPrompt'](task2, 'architecture-agent');
   * // Returns:
   * // "Design microservices architecture
   * //
   * // Please provide:
   * // 1. System design proposal
   * // 2. Trade-offs analysis
   * // 3. Implementation roadmap
   * //
   * // Additional Context:
   * // {
   * //   "constraints": ["budget: $50k", "timeline: 6 months"],
   * //   "requirements": ["high availability", "horizontal scaling"]
   * // }"
   * ```
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
   *
   * Returns standardized instructions for each agent type that guide the agent
   * on what to include in their response. Each agent has a numbered checklist
   * of expected deliverables to ensure consistent, comprehensive responses.
   *
   * Instruction Categories:
   * - **Development agents**: Critical issues, code quality, best practices
   * - **Testing agents**: Test cases, edge cases, framework recommendations
   * - **Debugging agents**: Root cause, reproduction steps, verification
   * - **Architecture agents**: Design proposals, trade-offs, roadmaps
   * - **Research agents**: Findings, credibility analysis, recommendations
   * - **Management agents**: Plans, resource allocation, risk assessment
   *
   * @param agentType - Type of agent to get instructions for
   * @returns Agent-specific instruction string
   *
   * @example
   * ```typescript
   * // Code reviewer instructions
   * const instructions1 = enhancer['getAgentSpecificInstructions']('code-reviewer');
   * console.log(instructions1);
   * // "Please provide:
   * // 1. Critical issues (security, bugs)
   * // 2. Code quality suggestions
   * // 3. Best practices recommendations"
   *
   * // Debugger instructions
   * const instructions2 = enhancer['getAgentSpecificInstructions']('debugger');
   * console.log(instructions2);
   * // "Please provide:
   * // 1. Root cause analysis
   * // 2. Reproduction steps
   * // 3. Proposed fix with verification"
   *
   * // Architecture agent instructions
   * const instructions3 = enhancer['getAgentSpecificInstructions']('architecture-agent');
   * console.log(instructions3);
   * // "Please provide:
   * // 1. System design proposal
   * // 2. Trade-offs analysis
   * // 3. Implementation roadmap"
   *
   * // General agent instructions
   * const instructions4 = enhancer['getAgentSpecificInstructions']('general-agent');
   * console.log(instructions4);
   * // "Please provide clear, actionable recommendations."
   * ```
   */
  private getAgentSpecificInstructions(agentType: AgentType): string {
    return AGENT_INSTRUCTIONS[agentType];
  }

  /**
   * Suggest model based on agent type and complexity
   *
   * Selects the most appropriate Claude model for the given agent type and task complexity
   * by looking up the MODEL_SUGGESTIONS constant. Different agent types may have different
   * model preferences even at the same complexity level.
   *
   * Model Selection Strategy:
   * - **simple**: Fast, cost-effective (typically Haiku)
   * - **medium**: Balanced performance (typically Sonnet)
   * - **complex**: Highest quality (typically Opus for critical agents)
   *
   * Agent-Specific Preferences:
   * - Most agents: Haiku (simple) → Sonnet (medium) → Sonnet (complex)
   * - Architecture/ML agents: Sonnet (simple) → Opus (medium) → Opus (complex)
   * - Debugger/Refactorer: Sonnet (simple) → Sonnet (medium) → Opus (complex)
   *
   * @param agentType - Type of agent requesting model suggestion
   * @param complexity - Task complexity level
   * @returns Claude model ID (e.g., 'claude-sonnet-4-5-20250929')
   *
   * @example
   * ```typescript
   * // Code reviewer - simple task
   * const model1 = enhancer['suggestModel']('code-reviewer', 'simple');
   * console.log(model1); // 'claude-3-5-haiku-20241022'
   *
   * // Code reviewer - complex task
   * const model2 = enhancer['suggestModel']('code-reviewer', 'complex');
   * console.log(model2); // 'claude-opus-4-5-20251101'
   *
   * // Architecture agent - simple task (still needs Sonnet)
   * const model3 = enhancer['suggestModel']('architecture-agent', 'simple');
   * console.log(model3); // 'claude-sonnet-4-5-20250929'
   *
   * // Architecture agent - complex task (needs Opus)
   * const model4 = enhancer['suggestModel']('architecture-agent', 'complex');
   * console.log(model4); // 'claude-opus-4-5-20251101'
   *
   * // Development butler - even complex tasks use cheaper models
   * const model5 = enhancer['suggestModel']('development-butler', 'complex');
   * console.log(model5); // 'claude-sonnet-4-5-20250929'
   * ```
   */
  private suggestModel(agentType: AgentType, complexity: 'simple' | 'medium' | 'complex'): string {
    return MODEL_SUGGESTIONS[agentType][complexity];
  }

  /**
   * Get agent persona (for testing/debugging)
   *
   * Retrieves the full persona string for a given agent type from the AGENT_PERSONAS constant.
   * Useful for testing, debugging, or displaying agent capabilities to users.
   *
   * Persona Structure:
   * - Identity statement ("You are an expert [role]...")
   * - Core expertise areas (bulleted list)
   * - Workflow or process description (numbered steps)
   *
   * @param agentType - Type of agent to get persona for
   * @returns Complete agent persona string
   *
   * @example
   * ```typescript
   * // Get code reviewer persona
   * const persona1 = enhancer.getAgentPersona('code-reviewer');
   * console.log(persona1.substring(0, 100));
   * // "You are an expert Code Review Specialist with deep knowledge of software engineering best practices..."
   * console.log(persona1.includes('Security vulnerabilities')); // true
   * console.log(persona1.includes('1. Analyze code structure')); // true
   *
   * // Get debugger persona
   * const persona2 = enhancer.getAgentPersona('debugger');
   * console.log(persona2.substring(0, 100));
   * // "You are an expert Debugger specializing in rapid root cause identification and problem resolution..."
   * console.log(persona2.includes('Systematic troubleshooting')); // true
   *
   * // Get architecture agent persona
   * const persona3 = enhancer.getAgentPersona('architecture-agent');
   * console.log(persona3.includes('Software Architect')); // true
   * console.log(persona3.includes('scalability')); // true
   * console.log(persona3.includes('trade-offs')); // true
   *
   * // Display persona to user (for transparency)
   * console.log(`This agent specializes in:`);
   * console.log(enhancer.getAgentPersona('test-writer'));
   * ```
   */
  getAgentPersona(agentType: AgentType): string {
    return AGENT_PERSONAS[agentType];
  }

  /**
   * Get agent tools (for testing/debugging)
   *
   * Retrieves the list of available tools for a given agent type from the AGENT_TOOLS constant.
   * Useful for testing, debugging, or displaying agent capabilities to users.
   *
   * Tool Categories:
   * - **File operations**: read_file, write_file, grep_code
   * - **Testing**: run_tests, coverage_report, test_framework
   * - **Analysis**: static_analysis, profiler, dependency_graph
   * - **Automation**: formatter, linter, build_system
   * - **Specialized**: vector_search, api_test, security_scan
   *
   * @param agentType - Type of agent to get tools for
   * @returns Array of tool names available to the agent
   *
   * @example
   * ```typescript
   * // Get code reviewer tools
   * const tools1 = enhancer.getAgentTools('code-reviewer');
   * console.log(tools1);
   * // ['read_file', 'grep_code', 'run_tests', 'static_analysis']
   *
   * // Get debugger tools
   * const tools2 = enhancer.getAgentTools('debugger');
   * console.log(tools2);
   * // ['read_file', 'run_code', 'read_logs', 'profiler']
   *
   * // Get development butler tools (many automation tools)
   * const tools3 = enhancer.getAgentTools('development-butler');
   * console.log(tools3.length); // 8
   * console.log(tools3.includes('formatter')); // true
   * console.log(tools3.includes('linter')); // true
   * console.log(tools3.includes('performance_monitor')); // true
   *
   * // General agent has no tools
   * const tools4 = enhancer.getAgentTools('general-agent');
   * console.log(tools4); // []
   *
   * // Check if agent has specific tool
   * const hasProfiler = enhancer.getAgentTools('performance-engineer').includes('profiler');
   * console.log(hasProfiler); // true
   *
   * // Display tools to user
   * const agentType: AgentType = 'test-writer';
   * const tools = enhancer.getAgentTools(agentType);
   * console.log(`${agentType} can use: ${tools.join(', ')}`);
   * // "test-writer can use: read_file, write_file, run_tests, coverage_report"
   * ```
   */
  getAgentTools(agentType: AgentType): string[] {
    return AGENT_TOOLS[agentType];
  }
}
