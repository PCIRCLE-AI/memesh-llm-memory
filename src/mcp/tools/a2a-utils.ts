/**
 * Shared utilities for A2A MCP tools
 *
 * Common helpers and constants used across a2a-* tools.
 */

import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * UUID v4 regex pattern for validation
 */
export const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Extract short ID (first 8 characters) from a UUID
 *
 * @param uuid - Full UUID string
 * @returns First 8 characters of the UUID, or the full string if shorter
 */
export function formatShortId(uuid: string): string {
  if (!uuid || uuid.length < 8) {
    return uuid || '';
  }
  return uuid.substring(0, 8);
}

/**
 * Create an error CallToolResult with formatted message
 *
 * @param prefix - Error message prefix (e.g., "Error claiming task")
 * @param reason - The error reason/message
 * @returns CallToolResult with error message including error indicator
 */
export function createErrorResult(prefix: string, reason: string): CallToolResult {
  return {
    content: [{ type: 'text', text: `❌ ${prefix}\n\nReason: ${reason}\n` }],
  };
}

/**
 * Extract error message from unknown error
 *
 * @param error - The caught error (unknown type)
 * @returns Error message string
 */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
