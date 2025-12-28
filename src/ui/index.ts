/**
 * Smart-Agents Terminal UI System
 *
 * MCP Server Response Formatting for Beautiful Terminal Output
 *
 * @example
 * ```ts
 * import { ResponseFormatter } from './ui';
 *
 * const formatter = new ResponseFormatter();
 * const output = formatter.format({
 *   agentType: 'code-reviewer',
 *   taskDescription: 'Review authentication code',
 *   status: 'success',
 *   results: { issues: 0, suggestions: 2 },
 * });
 * console.log(output);
 * ```
 */

// Response Formatter (NEW - MCP Server integration)
export { ResponseFormatter } from './ResponseFormatter.js';
export type { AgentResponse, EnhancedPrompt } from './ResponseFormatter.js';

// Theme System
export { theme } from './theme.js';
export type { Theme } from './theme.js';

// Metrics & Attribution (may be useful for tracking)
export { AttributionManager } from './AttributionManager.js';
export { MetricsStore } from './MetricsStore.js';

// Type Definitions
export * from './types.js';
