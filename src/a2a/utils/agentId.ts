/**
 * @fileoverview Platform-aware agent ID generation for stable agent identification
 *
 * Generates deterministic Agent IDs in format: `hostname-username-platform`
 *
 * **Purpose:**
 * - Ensures same machine + user + platform always generates same Agent ID
 * - Eliminates orphan database files from timestamp-based IDs
 * - Enables stable agent identification across sessions
 *
 * **Benefits:**
 * - No more database file proliferation
 * - Predictable agent identity for debugging
 * - Platform-aware routing for multi-platform support
 *
 * **Format:** `hostname-username-platform`
 * - Example: `macbook-pro-john-claude-code`
 * - Sanitized: lowercase, alphanumeric + hyphens only
 *
 * @see platformDetection.ts for platform detection logic
 */

import { detectPlatform } from './platformDetection.js';
import * as os from 'os';

/**
 * Sanitizes a string to be safe for use in an agent ID.
 *
 * Converts to lowercase and replaces all non-alphanumeric characters with hyphens.
 *
 * @param value - The string to sanitize
 * @returns Sanitized string containing only lowercase alphanumeric characters and hyphens
 *
 * @example
 * ```typescript
 * sanitize('MacBook.Pro_123') // 'macbook-pro-123'
 * sanitize('Test Machine') // 'test-machine'
 * ```
 */
function sanitize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

/**
 * Generates a platform-aware agent ID.
 *
 * Creates a deterministic ID based on hostname, username, and platform.
 * Same machine + user + platform will always produce the same ID.
 *
 * **ID Format:** `hostname-username-platform`
 * - hostname: From `os.hostname()`, sanitized
 * - username: From `os.userInfo().username`, sanitized
 * - platform: From `detectPlatform()` (claude-code, chatgpt, etc.)
 *
 * **Sanitization Rules:**
 * - Convert to lowercase
 * - Replace non-alphanumeric characters with hyphens
 * - Result matches pattern: `/^[a-z0-9-]+$/`
 *
 * @returns {string} Agent ID in format `hostname-username-platform`
 *
 * @example
 * ```typescript
 * // On Claude Code with MacBook Pro for user 'john'
 * generateAgentId(); // 'macbook-pro-john-claude-code'
 *
 * // On ChatGPT with same machine
 * generateAgentId(); // 'macbook-pro-john-chatgpt'
 * ```
 */
export function generateAgentId(): string {
  const hostname = sanitize(os.hostname());
  const username = sanitize(os.userInfo().username);
  const platform = detectPlatform();

  return `${hostname}-${username}-${platform}`;
}
