/**
 * Agent Template - Use this as a guide for creating new agents
 *
 * INSTRUCTIONS:
 * This is a template showing the structure of MCP-compatible agents.
 * For the Prompt Enhancement Mode architecture, agents don't need separate class files.
 * Instead, add your agent to three core files:
 *
 * 1. src/orchestrator/types.ts - Add to AgentType union
 * 2. src/core/PromptEnhancer.ts - Add persona, tools, model suggestions
 * 3. src/mcp/server.ts - Add to AGENT_TOOLS array
 *
 * Use scripts/create-agent.sh to automate this process.
 *
 * Example: To add a 'performance-profiler' agent:
 *
 * Step 1: Add to types.ts AgentType:
 * ```typescript
 * export type AgentType =
 *   | 'code-reviewer'
 *   | ...
 *   | 'performance-profiler'  // ← Add here
 *   | 'general-agent';
 * ```
 *
 * Step 2: Add to PromptEnhancer.ts AGENT_PERSONAS:
 * ```typescript
 * const AGENT_PERSONAS: Record<AgentType, string> = {
 *   ...
 *   'performance-profiler': `You are an expert Performance Profiler.
 *
 * Your expertise includes:
 * - Performance bottleneck identification
 * - Memory leak detection
 * - CPU profiling and optimization
 * - Network latency analysis
 * - Database query optimization
 *
 * When profiling performance, you:
 * 1. Identify bottlenecks systematically
 * 2. Measure before and after optimization
 * 3. Consider trade-offs (performance vs maintainability)
 * 4. Provide specific, actionable recommendations
 * 5. Verify improvements with benchmarks`,
 *   ...
 * };
 * ```
 *
 * Step 3: Add to PromptEnhancer.ts AGENT_TOOLS:
 * ```typescript
 * const AGENT_TOOLS: Record<AgentType, string[]> = {
 *   ...
 *   'performance-profiler': ['profiler', 'benchmark', 'memory_analyzer', 'cpu_tracer'],
 *   ...
 * };
 * ```
 *
 * Step 4: Add to PromptEnhancer.ts MODEL_SUGGESTIONS:
 * ```typescript
 * const MODEL_SUGGESTIONS: Record<AgentType, ModelSuggestion> = {
 *   ...
 *   'performance-profiler': {
 *     simple: 'claude-3-5-haiku-20241022',
 *     medium: 'claude-sonnet-4-5-20250929',
 *     complex: 'claude-opus-4-5-20251101',
 *   },
 *   ...
 * };
 * ```
 *
 * Step 5: Add to core/AgentRegistry.ts:
 * ```typescript
 * private registerAllAgents(): void {
 *   const allAgents: AgentMetadata[] = [
 *     // ... existing agents ...
 *     {
 *       name: 'performance-profiler',
 *       description: 'Performance profiling specialist, bottleneck identification, optimization expert',
 *       category: 'operations',
 *     },
 *
 *     // General Agent (insert new agents ABOVE this comment)
 *     {
 *       name: 'general-agent',
 *       description: 'Versatile AI assistant for general tasks and fallback operations',
 *       category: 'general',
 *     },
 *   ];
 *
 *   // Register all agents
 *   allAgents.forEach(agent => this.registerAgent(agent));
 * }
 * ```
 *
 * That's it! The agent is now available via MCP server.
 *
 * AUTOMATION:
 * Use `scripts/create-agent.sh <agent-name> "<description>"` to automate this process.
 *
 * Example:
 * ```bash
 * ./scripts/create-agent.sh performance-profiler "Performance profiling specialist"
 * ```
 */

// This file is documentation only - no code needed for Prompt Enhancement Mode agents.
// The PromptEnhancer handles all agent logic automatically.

export {};
