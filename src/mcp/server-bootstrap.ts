#!/usr/bin/env node
/**
 * MCP Server Bootstrap
 *
 * This file MUST be the entry point for the MCP server (not server.ts directly).
 *
 * Problem: ES6 imports are hoisted, so setting environment variables in server.ts
 * happens AFTER modules are loaded and logger is initialized.
 *
 * Solution: This bootstrap file:
 * 1. Sets MCP_SERVER_MODE environment variable FIRST
 * 2. Uses dynamic import() to load server.ts (NOT static import)
 * 3. Dynamic import executes AFTER this code, so env var is set in time
 *
 * CRITICAL: This file must have ZERO static imports except for types.
 */

// ============================================================================
// 🚨 STEP 1: Set MCP_SERVER_MODE before ANY imports
// ============================================================================
process.env.MCP_SERVER_MODE = 'true';

// Global reference to A2A server for shutdown
let a2aServer: any = null;

// Track if MCP client has connected
let mcpClientConnected = false;

// ============================================================================
// 🚨 STEP 2: Use dynamic import (NOT static import!)
// ============================================================================
async function bootstrap() {
  try {
    // Start initialization watchdog to detect incorrect usage
    startMCPClientWatchdog();

    // Dynamic import ensures environment variable is set BEFORE module loading
    const { ClaudeCodeBuddyMCPServer } = await import('./server.js');

    // Start MCP server
    const mcpServer = new ClaudeCodeBuddyMCPServer();
    await mcpServer.start();

    // Start A2A server
    a2aServer = await startA2AServer();

    // server.connect() keeps the process alive - no need for infinite promise
  } catch (error) {
    // Use console.error for stdio safety (writes to stderr, not stdout)
    console.error('Fatal error in MCP server bootstrap:', error);
    process.exit(1);
  }
}

/**
 * MCP Client Watchdog
 *
 * Detects if the server was started incorrectly (e.g., by user running `npx` manually).
 *
 * MCP clients communicate via stdin/stdout. When a client connects, it immediately sends
 * JSON-RPC requests. If stdin remains silent for 3 seconds after startup, this indicates
 * the server was likely started manually (not by an MCP client), which is incorrect usage.
 *
 * This prevents user confusion when they accidentally run `npx @pcircle/claude-code-buddy-mcp`
 * directly, expecting it to be an installation command rather than a long-running server.
 *
 * Can be disabled by setting DISABLE_MCP_WATCHDOG=1 environment variable (for testing).
 */
function startMCPClientWatchdog(): void {
  // Allow disabling watchdog for testing
  if (process.env.DISABLE_MCP_WATCHDOG === '1') {
    return;
  }

  // Listen for any data on stdin (MCP protocol communication)
  const stdinHandler = () => {
    mcpClientConnected = true;
    // Don't remove the listener - let the MCP server handle stdin
  };

  // Set once listener to detect first MCP message
  process.stdin.once('data', stdinHandler);

  // Check after 3 seconds if any MCP client connected
  setTimeout(() => {
    if (!mcpClientConnected) {
      // No MCP client connected - likely started incorrectly by user
      console.error(`
╔════════════════════════════════════════════════════════════════════════╗
║                                                                        ║
║   ❌ ERROR: MCP Server Started Incorrectly                            ║
║                                                                        ║
╚════════════════════════════════════════════════════════════════════════╝

This is an MCP server that should be started by Claude Code or Cursor,
not run directly from the command line.

🔧 To install Claude Code Buddy:

   1. Add this to your MCP configuration file:

      • macOS/Linux: ~/.claude/mcp_settings.json
      • Windows: %APPDATA%\\Claude\\mcp_settings.json

   2. Add the following configuration:

      {
        "mcpServers": {
          "@pcircle/claude-code-buddy-mcp": {
            "command": "npx",
            "args": ["-y", "@pcircle/claude-code-buddy-mcp"]
          }
        }
      }

   3. Restart Claude Code

📖 Full installation guide:
   https://github.com/PCIRCLE-AI/claude-code-buddy#installation

💡 For Cursor users:
   Click this link to auto-install:
   cursor://anysphere.cursor-deeplink/mcp/install?name=@pcircle/claude-code-buddy-mcp&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkBwY2lyY2xlL2NsYXVkZS1jb2RlLWJ1ZGR5LW1jcCJdfQ==

`);
      process.exit(1);
    }
  }, 3000); // 3 second timeout
}

/**
 * Start A2A Protocol server for agent-to-agent communication
 */
async function startA2AServer(): Promise<any> {
  try {
    // Dynamic imports to avoid loading before env var is set
    const { A2AServer } = await import('../a2a/server/A2AServer.js');
    const crypto = await import('crypto');

    // Generate agent ID from env or create unique ID
    const agentId = process.env.A2A_AGENT_ID || `ccb-mcp-${crypto.randomBytes(4).toString('hex')}`;

    // Create agent card
    const agentCard = {
      id: agentId,
      name: 'Claude Code Buddy (MCP)',
      description: 'AI development assistant via MCP protocol',
      version: '2.5.3',
      capabilities: {
        skills: [
          {
            name: 'buddy-do',
            description: 'Execute tasks with Claude Code Buddy',
          },
          {
            name: 'buddy-remember',
            description: 'Store and retrieve knowledge',
          },
        ],
        supportedFormats: ['text/plain', 'application/json'],
        maxMessageSize: 10 * 1024 * 1024, // 10MB
        streaming: false,
        pushNotifications: false,
      },
      endpoints: {
        baseUrl: 'http://localhost:3000', // Will be updated with actual port
      },
    };

    // Create and start A2A server
    const server = new A2AServer({
      agentId,
      agentCard,
      portRange: { min: 3000, max: 3999 },
      heartbeatInterval: 60000, // 1 minute
    });

    const port = await server.start();
    // Note: No console output in MCP stdio mode to avoid polluting the protocol channel
    // A2A server started silently on port ${port} with agent ID ${agentId}

    return server;
  } catch (error) {
    // Note: Errors are swallowed in MCP stdio mode to avoid polluting the protocol channel
    // A2A server failed to start but MCP continues without it
    // Don't fail MCP startup if A2A server fails
    return null;
  }
}

/**
 * Graceful shutdown handler with timeout protection
 * Note: No console output in MCP stdio mode to avoid polluting the protocol channel
 */
async function shutdown(signal: string): Promise<void> {
  // Shutdown initiated by signal (no console output in stdio mode)

  // Set shutdown timeout to prevent hung processes
  const shutdownTimeout = setTimeout(() => {
    // Timeout reached, forcing exit (no console output in stdio mode)
    process.exit(1);
  }, 5000);

  try {
    if (a2aServer) {
      await a2aServer.stop();
      // A2A Server stopped (no console output in stdio mode)
    }

    clearTimeout(shutdownTimeout);
    process.exit(0);
  } catch (error) {
    // Error during shutdown (no console output in stdio mode)
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

// Setup signal handlers for graceful shutdown (using once to prevent multiple invocations)
process.once('SIGTERM', () => shutdown('SIGTERM'));
process.once('SIGINT', () => shutdown('SIGINT'));

// Start bootstrap
bootstrap();
