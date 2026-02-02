#!/usr/bin/env node
/**
 * MCP Server Bootstrap & CLI Entry Point
 *
 * This file serves two purposes:
 * 1. MCP Server: When called without arguments (by MCP client)
 * 2. CLI Commands: When called with arguments (memesh setup, etc.)
 *
 * MCP Server Mode:
 * - Must set MCP_SERVER_MODE environment variable FIRST
 * - Uses dynamic import() to load server.ts (NOT static import)
 * - Dynamic import executes AFTER this code, so env var is set in time
 *
 * CLI Mode:
 * - Detects command-line arguments
 * - Delegates to CLI handler for interactive commands
 *
 * CRITICAL: This file must have ZERO static imports except for types.
 */

// ============================================================================
// 🚨 STEP 0: Check if this is a CLI command
// ============================================================================
const args = process.argv.slice(2);
const hasCliArgs = args.length > 0;

if (hasCliArgs) {
  // CLI mode - delegate to CLI handler
  (async () => {
    const { runCLI } = await import('../cli/index.js');
    await runCLI();
  })().catch((error) => {
    console.error('CLI error:', error);
    process.exit(1);
  });
} else {
  // MCP Server mode - continue with normal bootstrap
  startMCPServer();
}

function startMCPServer() {
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
 * MCP Installation Helper
 *
 * Detects if the server was started manually (e.g., by user running `npx` directly)
 * and shows friendly installation instructions instead of hanging indefinitely.
 *
 * MCP clients communicate via stdin/stdout. When a client connects, it immediately sends
 * JSON-RPC requests. If stdin remains silent for 3 seconds after startup, this indicates
 * the server was likely started manually (not by an MCP client).
 *
 * In this case, we show helpful installation instructions with a success message,
 * making it clear that the package is installed and ready to be configured.
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
  setTimeout(async () => {
    if (!mcpClientConnected) {
      // No MCP client connected - show installation status and guidance
      const chalk = await import('chalk');
      const { default: boxen } = await import('boxen');

      // Get package location
      const { fileURLToPath } = await import('url');
      const { dirname, join } = await import('path');
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      const packageRoot = join(__dirname, '../..');

      const message = `
${chalk.default.bold.yellow('⚠️  Manual Startup Detected')}

${chalk.default.bold('Why am I seeing this?')}
  You started the MCP server manually (e.g., ${chalk.default.cyan('npx @pcircle/memesh')}).
  MeMesh is designed to be launched ${chalk.default.bold('automatically by MCP clients')}
  (Claude Code, Cursor, etc.), not run directly by users.

${chalk.default.bold('Installation Status:')}
  ${chalk.default.green('✅')} Package installed successfully
  ${chalk.default.green('✅')} Location: ${chalk.default.dim(packageRoot)}
  ${chalk.default.yellow('⚠️')}  Not connected to any MCP client

${chalk.default.bold('Next Steps:')}

  ${chalk.default.yellow('1.')} ${chalk.default.bold('Configure your MCP client')}
     Add MeMesh to Claude Code or Cursor settings

  ${chalk.default.yellow('2.')} ${chalk.default.bold('Restart your IDE')}
     Reload window to enable MCP integration

  ${chalk.default.yellow('3.')} ${chalk.default.bold('Test the connection')}
     Ask Claude: ${chalk.default.italic('"List available MCP tools"')}

${chalk.default.bold('Configuration Example:')}

  ${chalk.default.dim('Add to your MCP settings.json:')}

  ${chalk.default.cyan('"mcpServers"')}: {
    ${chalk.default.cyan('"memesh"')}: {
      ${chalk.default.cyan('"command"')}: ${chalk.default.green('"npx"')},
      ${chalk.default.cyan('"args"')}: [${chalk.default.green('"-y"')}, ${chalk.default.green('"@pcircle/memesh"')}]
    }
  }

${chalk.default.bold('For Developers:')}
  Testing MCP protocol? Use ${chalk.default.cyan('DISABLE_MCP_WATCHDOG=1')} to disable this message.

${chalk.default.bold('Documentation:')}
  ${chalk.default.underline('https://github.com/PCIRCLE-AI/claude-code-buddy#installation')}
`;

      console.log(
        boxen(message, {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'yellow',
        })
      );
      process.exit(0);
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
      name: 'MeMesh (MCP)',
      description: 'AI development assistant via MCP protocol',
      version: '2.5.3',
      capabilities: {
        skills: [
          {
            name: 'buddy-do',
            description: 'Execute tasks with MeMesh',
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
}
