/**
 * MCP (Model Context Protocol) Module
 *
 * Unified exports for all MCP-related definitions, schemas, and types.
 *
 * @example
 * ```typescript
 * import {
 *   getAllToolDefinitions,
 *   MCPToolDefinition,
 *   OutputSchemas,
 *   BuddyDoOutput,
 * } from './mcp/index.js';
 * ```
 */

// Tool Definitions
export { getAllToolDefinitions, CommonSchemas } from './ToolDefinitions.js';
export type { MCPToolDefinition } from './ToolDefinitions.js';

// Output Schemas and Types
export { OutputSchemas } from './schemas/OutputSchemas.js';
export type {
  BuddyDoOutput,
  BuddyRememberOutput,
  BuddyHelpOutput,
  SessionHealthOutput,
  WorkflowGuidanceOutput,
  SmartPlanOutput,
  HookToolUseOutput,
} from './schemas/OutputSchemas.js';
