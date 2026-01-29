/**
 * ✅ FIX HIGH-10: Request ID Generation and Tracing
 *
 * Provides request ID generation for distributed tracing across MCP requests.
 * Request IDs help correlate logs, debug issues, and track requests through the system.
 */

import crypto from 'crypto';

/**
 * Generate a unique request ID
 *
 * Format: req-{timestamp}-{random}
 * Example: req-1706580123456-a1b2c3d4
 *
 * @returns Unique request ID string
 */
export function generateRequestId(): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  return `req-${timestamp}-${random}`;
}

/**
 * Validate request ID format
 *
 * @param requestId - Request ID to validate
 * @returns true if valid format, false otherwise
 */
export function isValidRequestId(requestId: string): boolean {
  return /^req-\d{13}-[0-9a-f]{8}$/.test(requestId);
}

/**
 * Extract timestamp from request ID
 *
 * @param requestId - Request ID
 * @returns Timestamp in milliseconds, or null if invalid format
 */
export function extractTimestamp(requestId: string): number | null {
  const match = requestId.match(/^req-(\d{13})-[0-9a-f]{8}$/);
  if (!match) {
    return null;
  }
  return parseInt(match[1], 10);
}
