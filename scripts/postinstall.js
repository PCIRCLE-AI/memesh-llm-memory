#!/usr/bin/env node
/**
 * Post-install message for Claude Code Buddy
 *
 * Displays configuration instructions after npm install completes.
 * This prevents users from accidentally running the MCP server directly.
 */

console.log(`
✅ Claude Code Buddy installed successfully!

📖 Setup guide: https://github.com/PCIRCLE-AI/claude-code-buddy#installation
`);
