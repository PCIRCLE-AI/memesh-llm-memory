/**
 * Agent Classification Enum
 *
 * Categorizes agents by their implementation type to support
 * the Prompt Enhancement System architecture.
 */
export enum AgentClassification {
  /**
   * Agents with full implementation (code, workflows, integrations)
   * Example: development-butler, test-writer, project-manager
   */
  REAL_IMPLEMENTATION = 'real-implementation',

  /**
   * Agents that enhance prompts with specialized knowledge and context
   * Example: architecture-agent, code-reviewer, security-auditor
   */
  ENHANCED_PROMPT = 'enhanced-prompt',

  /**
   * Agents that require external dependencies or services
   * Example: knowledge-agent (requires local database)
   */
  OPTIONAL_FEATURE = 'optional-feature',
}
