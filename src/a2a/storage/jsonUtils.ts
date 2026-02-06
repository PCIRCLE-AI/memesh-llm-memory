/**
 * Shared JSON parsing utilities for A2A storage layer
 *
 * Provides safe JSON parsing with error handling for database columns
 * that store JSON-serialized data.
 */

import { logger } from '../../utils/logger.js';

/**
 * Safely parse JSON string, returning null if invalid
 *
 * Provides defense-in-depth for JSON columns that may contain
 * corrupted or malformed data. Logs errors for debugging but
 * returns null rather than throwing to prevent cascading failures.
 *
 * @param jsonString - JSON string to parse, or null/undefined
 * @param context - Optional context for error logging (e.g., 'TaskQueue', 'AgentRegistry')
 * @returns Parsed value of type T, or null if parsing fails
 */
export function safeJsonParse<T>(
  jsonString: string | null | undefined,
  context = 'Storage'
): T | null {
  if (!jsonString) return null;
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    logger.error(`[${context}] Invalid JSON data`, {
      error: error instanceof Error ? error.message : String(error),
      jsonString: jsonString?.substring(0, 100),
    });
    return null;
  }
}

/**
 * Validate JSON string and return original if valid, undefined if invalid
 *
 * Used when the caller wants to keep the JSON as a string (not parsed)
 * but needs to validate it is well-formed JSON. Useful for metadata
 * fields that are stored and returned as JSON strings.
 *
 * @param jsonString - JSON string to validate, or null/undefined
 * @param context - Optional context for error logging
 * @returns Original string if valid JSON, undefined if null/invalid
 */
export function validateJsonString(
  jsonString: string | null | undefined,
  context = 'Storage'
): string | undefined {
  if (!jsonString) return undefined;
  try {
    JSON.parse(jsonString);
    return jsonString;
  } catch (error) {
    logger.error(`[${context}] Invalid JSON string`, {
      error: error instanceof Error ? error.message : String(error),
      jsonString: jsonString?.substring(0, 100),
    });
    return undefined;
  }
}
