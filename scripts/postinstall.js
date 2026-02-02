#!/usr/bin/env node
/**
 * Post-install message for Claude Code Buddy
 *
 * Displays configuration instructions after npm install completes.
 * This prevents users from accidentally running the MCP server directly.
 */

console.log(`
╔════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║   ✅ Claude Code Buddy Installed Successfully!                        ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝

📝 Next Steps - Configure Your MCP Client:

┌─ For Claude Code Users ────────────────────────────────────────────────┐
│                                                                         │
│  1. Edit your MCP configuration file:                                  │
│     • macOS/Linux: ~/.claude/mcp_settings.json                         │
│     • Windows: %APPDATA%\\Claude\\mcp_settings.json                     │
│                                                                         │
│  2. Add this configuration:                                            │
│                                                                         │
│     {                                                                   │
│       "mcpServers": {                                                   │
│         "@pcircle/claude-code-buddy-mcp": {                            │
│           "command": "npx",                                             │
│           "args": ["-y", "@pcircle/claude-code-buddy-mcp"]             │
│         }                                                               │
│       }                                                                 │
│     }                                                                   │
│                                                                         │
│  3. Restart Claude Code                                                │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

┌─ For Cursor Users ──────────────────────────────────────────────────────┐
│                                                                         │
│  Click this link to auto-install:                                      │
│                                                                         │
│  cursor://anysphere.cursor-deeplink/mcp/install?name=@pcircle/claude-code-buddy-mcp&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBwY2lyY2xlL2NsYXVkZS1jb2RlLWJ1ZGR5LW1jcCJdfQ==
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

⚠️  IMPORTANT: Don't run "npx @pcircle/claude-code-buddy-mcp" manually!
   This is an MCP server that should be started by your IDE.

📖 Full Documentation: https://github.com/PCIRCLE-AI/claude-code-buddy
💬 Need Help? https://github.com/PCIRCLE-AI/claude-code-buddy/discussions

`);
