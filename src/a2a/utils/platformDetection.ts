/**
 * @fileoverview Platform detection utility for multi-platform AI support
 *
 * Detects which AI platform the code is running on by checking environment variables.
 * This enables platform-aware features like agent ID generation and task routing.
 *
 * Detection is done in priority order:
 * 1. Claude Code (CLAUDE_CODE_VERSION)
 * 2. ChatGPT (OPENAI_API_KEY)
 * 3. Gemini (GEMINI_API_KEY)
 * 4. Cursor (CURSOR_VERSION)
 * 5. VS Code (VSCODE_PID)
 * 6. Unknown (fallback)
 */

/**
 * Supported AI platforms
 */
export type Platform =
  | 'claude-code'
  | 'chatgpt'
  | 'gemini'
  | 'cursor'
  | 'vscode'
  | 'unknown';

/**
 * Detects the current AI platform from environment variables.
 *
 * Checks environment variables in priority order to determine which
 * AI platform the code is running on. If multiple platform indicators
 * are present, the highest priority platform is returned.
 *
 * @returns {Platform} The detected platform, or 'unknown' if no platform detected
 *
 * @example
 * ```typescript
 * const platform = detectPlatform();
 * if (platform === 'claude-code') {
 *   console.log('Running on Claude Code');
 * }
 * ```
 */
export function detectPlatform(): Platform {
  // Priority order matters - check from highest to lowest priority
  if (process.env.CLAUDE_CODE_VERSION) {
    return 'claude-code';
  }

  if (process.env.OPENAI_API_KEY) {
    return 'chatgpt';
  }

  if (process.env.GEMINI_API_KEY) {
    return 'gemini';
  }

  if (process.env.CURSOR_VERSION) {
    return 'cursor';
  }

  if (process.env.VSCODE_PID) {
    return 'vscode';
  }

  return 'unknown';
}
