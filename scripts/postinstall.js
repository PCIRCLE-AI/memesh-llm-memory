#!/usr/bin/env node
/**
 * Post-install message for MeMesh
 *
 * Displays configuration instructions after npm install completes.
 * This prevents users from accidentally running the MCP server directly.
 */

console.log(`
✅ MeMesh installed successfully!

📖 Setup guide: https://github.com/PCIRCLE-AI/claude-code-buddy#installation
`);
