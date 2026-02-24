#!/usr/bin/env node

/**
 * PreToolUse Hook - Pre-commit Code Review Enforcement
 *
 * Triggered before each tool execution in Claude Code.
 *
 * Features:
 * - Pre-commit code review enforcement: injects reminder to run
 *   comprehensive-code-review before git commit if review hasn't
 *   been done in the current session
 * - Fast exit for non-commit tools (minimal overhead)
 * - Runs silently for non-relevant operations
 */

import {
  STATE_DIR,
  readJSONFile,
  readStdin,
  logError,
} from './hook-utils.js';
import path from 'path';

// ============================================================================
// Constants
// ============================================================================

const CURRENT_SESSION_FILE = path.join(STATE_DIR, 'current-session.json');

// ============================================================================
// Git Commit Detection
// ============================================================================

/**
 * Check if this Bash command is a git commit
 * @param {Object} toolInput - Tool input arguments
 * @returns {boolean}
 */
function isGitCommit(toolInput) {
  const cmd = toolInput?.command || '';
  return /git\s+commit\s/.test(cmd) && !cmd.includes('--amend');
}

// ============================================================================
// Code Review Status
// ============================================================================

/**
 * Check if code review was performed in this session.
 * The flag is set by post-tool-use.js (Skill/Task detection)
 * or subagent-stop.js (code-reviewer subagent completion).
 * @returns {boolean}
 */
function wasCodeReviewDone() {
  const session = readJSONFile(CURRENT_SESSION_FILE, {});
  return session.codeReviewDone === true;
}

// ============================================================================
// Hook Response
// ============================================================================

/**
 * Output hook response as JSON to stdout.
 * Claude Code reads this to apply hook decisions.
 * @param {Object} response - Hook response object
 */
function respond(response) {
  process.stdout.write(JSON.stringify(response));
}

// ============================================================================
// Main
// ============================================================================

async function preToolUse() {
  try {
    const input = await readStdin(3000);
    if (!input || input.trim() === '') {
      process.exit(0);
    }

    const data = JSON.parse(input);
    const toolName = data.tool_name || data.toolName || '';
    const toolInput = data.tool_input || data.arguments || {};

    // Fast exit: only process Bash commands that are git commits
    if (toolName !== 'Bash' || !isGitCommit(toolInput)) {
      process.exit(0);
    }

    // If code review was already done this session, allow commit
    if (wasCodeReviewDone()) {
      process.exit(0);
    }

    // No code review detected — inject reminder context for Claude
    respond({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        additionalContext: [
          '<user-prompt-submit-hook>',
          'PRE-COMMIT REVIEW REMINDER:',
          'No comprehensive code review was detected in this session.',
          'Before committing significant changes, run: @comprehensive-code-review',
          '',
          'The review checks for:',
          '- Ripple Map: unsynchronized cross-file changes',
          '- Reality Check: phantom imports, ghost methods, schema drift',
          '- Cross-boundary Sync: type parity, client parity, route-SDK match',
          '- Security, concurrency, error handling, and 7 other dimensions',
          '',
          'Skip only for trivial changes (typo fixes, formatting, comments).',
          '</user-prompt-submit-hook>',
        ].join('\n'),
      },
    });

    process.exit(0);
  } catch (error) {
    logError('PreToolUse', error);
    process.exit(0); // Never block on hook errors
  }
}

preToolUse();
