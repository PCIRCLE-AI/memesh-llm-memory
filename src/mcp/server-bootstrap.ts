#!/usr/bin/env node
/**
 * MCP Server Bootstrap & CLI Entry Point
 *
 * This file serves two purposes:
 * 1. MCP Server: When called without arguments (by MCP client)
 * 2. CLI Commands: When called with arguments (memesh setup, etc.)
 *
 * MCP Server Mode (Daemon Architecture):
 * - First instance becomes the daemon (singleton)
 * - Subsequent instances connect as proxy clients
 * - Daemon manages shared state (knowledge graph, memory, etc.)
 *
 * CLI Mode:
 * - Detects command-line arguments
 * - Delegates to CLI handler for interactive commands
 *
 * CRITICAL: This file must have ZERO static imports except for types.
 */

// Type-only imports (no runtime cost, compliant with "zero static imports" rule)
import type { DaemonBootstrap } from './daemon/DaemonBootstrap.js';

// Module-level flag for MCP client connection tracking
let mcpClientConnected = false;

// ============================================================================
// Stdin Buffer for Initialization Race Condition Fix
// ============================================================================
// Problem: Claude Code sends 'initialize' immediately after spawning the server.
// During daemon/proxy bootstrap (lock checks, socket setup, etc.), stdin data
// arrives BEFORE the MCP transport is connected, causing "Method not found" errors.
//
// Solution: Pause stdin immediately, buffer data during bootstrap, then replay
// once the transport is connected.
// ============================================================================

/** Buffer to store stdin data during initialization */
const stdinBuffer: Buffer[] = [];

/** Flag to track if stdin buffering is active */
let stdinBufferingActive = false;

/**
 * Start buffering stdin data.
 * Call this IMMEDIATELY when MCP server mode starts, before any async operations.
 */
function startStdinBuffering(): void {
  if (stdinBufferingActive) return;
  stdinBufferingActive = true;

  // Pause stdin to prevent data loss
  process.stdin.pause();

  // Buffer any data that arrives
  const bufferHandler = (chunk: Buffer) => {
    stdinBuffer.push(chunk);
  };
  process.stdin.on('data', bufferHandler);

  // Store handler reference for cleanup
  (startStdinBuffering as any)._handler = bufferHandler;
}

/**
 * Stop buffering and replay buffered data.
 * Call this AFTER the MCP transport is connected.
 */
function stopStdinBufferingAndReplay(): void {
  if (!stdinBufferingActive) return;
  stdinBufferingActive = false;

  // Remove our buffer handler
  const handler = (startStdinBuffering as any)._handler;
  if (handler) {
    process.stdin.removeListener('data', handler);
  }

  // Replay buffered data by unshifting back to the stream
  // The MCP transport will receive this data when it starts reading
  if (stdinBuffer.length > 0) {
    const combined = Buffer.concat(stdinBuffer);
    stdinBuffer.length = 0; // Clear buffer

    // Unshift the data back to stdin so the transport receives it
    process.stdin.unshift(combined);
  }

  // Resume stdin for normal operation
  process.stdin.resume();
}

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
    process.stderr.write(`CLI error: ${error}\n`);
    process.exit(1);
  });
} else {
  // MCP Server mode - determine daemon vs proxy
  bootstrapWithDaemon();
}

// ============================================================================
// Module-Level Shared Functions
// ============================================================================

/**
 * MCP Installation Helper
 *
 * Detects if the server was started manually (e.g., by user running `npx` directly)
 * and shows friendly installation instructions instead of hanging indefinitely.
 *
 * Configuration:
 * - DISABLE_MCP_WATCHDOG=1: Completely disable the watchdog
 * - MCP_WATCHDOG_TIMEOUT_MS=<number>: Set custom timeout (default: 15000ms)
 */
function startMCPClientWatchdog(): void {
  // Allow disabling watchdog for testing
  if (process.env.DISABLE_MCP_WATCHDOG === '1') {
    return;
  }

  // Configurable timeout (default 15 seconds - enough for Claude Code to connect)
  const DEFAULT_WATCHDOG_TIMEOUT_MS = 15000;
  const watchdogTimeoutMs = parseInt(process.env.MCP_WATCHDOG_TIMEOUT_MS || '', 10) || DEFAULT_WATCHDOG_TIMEOUT_MS;

  // Listen for any data on stdin (MCP protocol communication)
  const stdinHandler = () => {
    mcpClientConnected = true;
    // Don't remove the listener - let the MCP server handle stdin
  };

  // Set once listener to detect first MCP message
  process.stdin.once('data', stdinHandler);

  // Check after timeout if any MCP client connected
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

      process.stderr.write(
        boxen(message, {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'yellow',
        }) + '\n'
      );
      process.exit(0);
    }
  }, watchdogTimeoutMs);
}

// ============================================================================
// Daemon Architecture Bootstrap
// ============================================================================

/**
 * Bootstrap with daemon architecture
 *
 * Flow:
 * 1. Check if daemon is disabled → standalone mode
 * 2. Check if healthy daemon exists → proxy mode
 * 3. Otherwise → become the daemon
 */
async function bootstrapWithDaemon() {
  // CRITICAL: Set MCP_SERVER_MODE BEFORE importing logger to disable console output
  // This prevents stdout pollution that breaks JSON-RPC communication
  process.env.MCP_SERVER_MODE = 'true';

  // CRITICAL: Start buffering stdin IMMEDIATELY to prevent data loss during async bootstrap
  // Claude Code sends 'initialize' right after spawning - we must capture it before any async ops
  startStdinBuffering();

  try {
    const { DaemonBootstrap, isDaemonDisabled } = await import('./daemon/DaemonBootstrap.js');
    const { logger } = await import('../utils/logger.js');

    // Read version from package.json
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const packageJson = require('../../package.json');
    const version = packageJson.version;

    // Check if daemon mode is disabled
    if (isDaemonDisabled()) {
      logger.info('[Bootstrap] Daemon mode disabled, running standalone');
      startMCPServer();
      return;
    }

    // Determine mode
    const bootstrapper = new DaemonBootstrap({ version });
    const result = await bootstrapper.determineMode();

    logger.info('[Bootstrap] Mode determined', {
      mode: result.mode,
      reason: result.reason,
      existingDaemon: result.existingDaemon,
    });

    switch (result.mode) {
      case 'daemon':
        // Become the daemon
        await startAsDaemon(bootstrapper, version);
        break;

      case 'proxy':
        // Connect to existing daemon as proxy
        await startAsProxy(bootstrapper);
        break;

      case 'standalone':
      default:
        // Fall back to standalone mode
        startMCPServer();
        break;
    }
  } catch (error) {
    // If daemon bootstrap fails, fall back to standalone mode
    process.stderr.write(`[Bootstrap] Daemon bootstrap failed, falling back to standalone: ${error}\n`);
    startMCPServer();
  }
}

/**
 * Setup graceful shutdown signal handlers.
 * Extracts common signal handling logic used by both daemon and proxy modes.
 *
 * @param shutdownFn - Async function to execute on shutdown signal
 */
function setupSignalHandlers(shutdownFn: (signal: string) => Promise<void>): void {
  process.once('SIGTERM', () => shutdownFn('SIGTERM'));
  process.once('SIGINT', () => shutdownFn('SIGINT'));
}

/**
 * Start as the daemon (first instance)
 */
async function startAsDaemon(bootstrapper: DaemonBootstrap, version: string) {
  // CRITICAL: Set MCP_SERVER_MODE BEFORE importing logger to disable console output
  // This prevents stdout pollution that breaks JSON-RPC communication
  process.env.MCP_SERVER_MODE = 'true';

  const { logger } = await import('../utils/logger.js');
  const { DaemonSocketServer } = await import('./daemon/DaemonSocketServer.js');
  const { DaemonLockManager } = await import('./daemon/DaemonLockManager.js');

  // Acquire the daemon lock
  const lockAcquired = await bootstrapper.acquireDaemonLock();
  if (!lockAcquired) {
    logger.warn('[Bootstrap] Failed to acquire daemon lock, falling back to standalone');
    startMCPServer();
    return;
  }

  logger.info('[Bootstrap] Starting as daemon', { version, pid: process.pid });

  // Set environment variable
  process.env.MCP_SERVER_MODE = 'true';

  // Start the MCP server
  const { ClaudeCodeBuddyMCPServer } = await import('./server.js');
  const mcpServer = await ClaudeCodeBuddyMCPServer.create();

  // Create daemon socket server to accept proxy connections
  const transport = bootstrapper.getTransport();
  const socketServer = new DaemonSocketServer({
    transport,
    version,
  });

  // Handle client connection events (lock file client count is managed by DaemonSocketServer)
  socketServer.on('client_connect', (client) => {
    logger.info('[Daemon] Client connected', { clientId: client.clientId, version: client.version });
  });

  socketServer.on('client_disconnect', (clientId: string) => {
    logger.info('[Daemon] Client disconnected', { clientId });
  });

  // Register MCP handler to route proxy client requests to the MCP server
  // This enables the daemon to process MCP requests from proxy clients
  socketServer.setMcpHandler(async (request: unknown) => {
    return mcpServer.handleRequest(request);
  });

  // Start socket server
  await socketServer.start();
  logger.info('[Daemon] Socket server started', { path: transport.getPath() });

  // CRITICAL: Stop stdin buffering and replay data BEFORE starting MCP server
  // This ensures the 'initialize' message reaches the transport
  stopStdinBufferingAndReplay();

  // Also start the MCP server for direct stdio communication (first client)
  await mcpServer.start();

  // Cleanup function for socket and lock
  const cleanupDaemon = async (reason: string): Promise<void> => {
    logger.info('[Daemon] Cleanup started', { reason });

    try {
      // Stop accepting new connections
      await socketServer.stop();
    } catch (error) {
      logger.warn('[Daemon] Error stopping socket server', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // Release lock
    try {
      await DaemonLockManager.releaseLock();
    } catch (error) {
      logger.warn('[Daemon] Error releasing lock', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    // CRITICAL: Clean up socket file to prevent stale socket issues
    // This must happen AFTER socketServer.stop() closes all connections
    try {
      transport.cleanup();
      logger.info('[Daemon] Socket file cleaned up');
    } catch (error) {
      logger.warn('[Daemon] Error cleaning up socket file', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    logger.info('[Daemon] Cleanup complete');
  };

  // Setup graceful shutdown for signals
  setupSignalHandlers(async (signal: string) => {
    logger.info('[Daemon] Shutdown requested', { signal });
    await cleanupDaemon(`signal:${signal}`);
    process.exit(0);
  });

  // Handle uncaught exceptions - cleanup socket before crashing
  process.once('uncaughtException', async (error: Error) => {
    logger.error('[Daemon] Uncaught exception', {
      error: error.message,
      stack: error.stack,
    });
    await cleanupDaemon('uncaughtException');
    process.exit(1);
  });

  // Handle unhandled promise rejections - cleanup socket before crashing
  process.once('unhandledRejection', async (reason: unknown) => {
    logger.error('[Daemon] Unhandled rejection', {
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    await cleanupDaemon('unhandledRejection');
    process.exit(1);
  });

  // Start watchdog for manual startup detection
  startMCPClientWatchdog();
}

/**
 * Start as proxy client (subsequent instances)
 */
async function startAsProxy(bootstrapper: DaemonBootstrap) {
  // CRITICAL: Set MCP_SERVER_MODE BEFORE importing logger to disable console output
  process.env.MCP_SERVER_MODE = 'true';

  const { logger } = await import('../utils/logger.js');
  const { StdioProxyClient } = await import('./daemon/StdioProxyClient.js');

  const version = bootstrapper.getVersion();
  logger.info('[Bootstrap] Starting as proxy client', { version });

  const transport = bootstrapper.getTransport();
  const proxyClient = new StdioProxyClient({
    transport,
    clientVersion: version,
    maxReconnectAttempts: 5,
    reconnectDelay: 1000,
  });

  // Handle proxy events
  proxyClient.on('connected', () => {
    logger.info('[Proxy] Connected to daemon');
  });

  proxyClient.on('disconnected', (reason: string) => {
    logger.warn('[Proxy] Disconnected from daemon', { reason });
  });

  proxyClient.on('error', (error: Error) => {
    logger.error('[Proxy] Error', { error: error.message });
  });

  proxyClient.on('shutdown', (reason: string) => {
    logger.info('[Proxy] Daemon requested shutdown', { reason });
    process.exit(0);
  });

  // CRITICAL: Stop stdin buffering and replay data BEFORE starting proxy
  // This ensures the 'initialize' message reaches the proxy client
  stopStdinBufferingAndReplay();

  // Start proxying stdin/stdout to daemon
  await proxyClient.start();

  logger.info('[Proxy] Proxy started, forwarding stdio to daemon');

  // Graceful shutdown
  setupSignalHandlers(async (signal: string) => {
    logger.info('[Proxy] Shutdown requested', { signal });
    await proxyClient.stop();
    process.exit(0);
  });
}

// ============================================================================
// Standalone Mode (Legacy / Fallback)
// ============================================================================

/**
 * Start MCP server in standalone mode (no daemon)
 */
function startMCPServer() {
  // Set MCP_SERVER_MODE before ANY imports
  process.env.MCP_SERVER_MODE = 'true';

  async function bootstrap() {
    try {
      // Start initialization watchdog to detect incorrect usage
      startMCPClientWatchdog();

      // Dynamic import ensures environment variable is set BEFORE module loading
      const { ClaudeCodeBuddyMCPServer } = await import('./server.js');

      // Start MCP server (using async factory method)
      const mcpServer = await ClaudeCodeBuddyMCPServer.create();

      // CRITICAL: Stop stdin buffering and replay data BEFORE starting MCP server
      // This ensures the 'initialize' message reaches the transport
      stopStdinBufferingAndReplay();

      await mcpServer.start();

      // server.connect() keeps the process alive - no need for infinite promise
    } catch (error) {
      process.stderr.write(`Fatal error in MCP server bootstrap: ${error}\n`);
      process.exit(1);
    }
  }

  /**
   * Graceful shutdown handler with timeout protection
   * Note: No console output in MCP stdio mode to avoid polluting the protocol channel
   */
  async function shutdown(signal: string): Promise<void> {
    const shutdownTimeout = setTimeout(() => {
      process.exit(1);
    }, 5000);

    try {
      clearTimeout(shutdownTimeout);
      process.exit(0);
    } catch {
      clearTimeout(shutdownTimeout);
      process.exit(1);
    }
  }

  // Setup signal handlers for graceful shutdown
  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));

  // Start bootstrap
  bootstrap();
}
