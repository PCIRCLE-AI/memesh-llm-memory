#!/usr/bin/env node
let mcpClientConnected = false;
const stdinBuffer = [];
let stdinBufferingActive = false;
function startStdinBuffering() {
    if (stdinBufferingActive)
        return;
    stdinBufferingActive = true;
    if (!process.stdin.readable) {
        stdinBufferingActive = false;
        return;
    }
    try {
        process.stdin.pause();
    }
    catch (err) {
        stdinBufferingActive = false;
        return;
    }
    const bufferHandler = (chunk) => {
        stdinBuffer.push(chunk);
    };
    const errorHandler = (err) => {
        process.stderr.write(`[Bootstrap] stdin error during buffering: ${err.message}\n`);
        stopStdinBufferingAndReplay();
    };
    process.stdin.on('data', bufferHandler);
    process.stdin.once('error', errorHandler);
    startStdinBuffering._handler = bufferHandler;
    startStdinBuffering._errorHandler = errorHandler;
}
function stopStdinBufferingAndReplay() {
    if (!stdinBufferingActive)
        return;
    stdinBufferingActive = false;
    const handler = startStdinBuffering._handler;
    if (handler) {
        process.stdin.removeListener('data', handler);
    }
    const errorHandler = startStdinBuffering._errorHandler;
    if (errorHandler) {
        process.stdin.removeListener('error', errorHandler);
    }
    if (stdinBuffer.length > 0) {
        const combined = Buffer.concat(stdinBuffer);
        stdinBuffer.length = 0;
        process.stdin.unshift(combined);
    }
    try {
        process.stdin.resume();
    }
    catch {
    }
}
const args = process.argv.slice(2);
const hasCliArgs = args.length > 0;
if (hasCliArgs) {
    (async () => {
        const { runCLI } = await import('../cli/index.js');
        await runCLI();
    })().catch((error) => {
        process.stderr.write(`CLI error: ${error}\n`);
        process.exit(1);
    });
}
else {
    bootstrapWithDaemon();
}
function startMCPClientWatchdog() {
    if (process.env.DISABLE_MCP_WATCHDOG === '1') {
        return;
    }
    const DEFAULT_WATCHDOG_TIMEOUT_MS = 15000;
    const watchdogTimeoutMs = parseInt(process.env.MCP_WATCHDOG_TIMEOUT_MS || '', 10) || DEFAULT_WATCHDOG_TIMEOUT_MS;
    let watchdogTimer = null;
    const stdinHandler = () => {
        mcpClientConnected = true;
        if (watchdogTimer !== null) {
            clearTimeout(watchdogTimer);
            watchdogTimer = null;
        }
    };
    process.stdin.once('data', stdinHandler);
    watchdogTimer = setTimeout(async () => {
        if (!mcpClientConnected) {
            const chalk = await import('chalk');
            const { default: boxen } = await import('boxen');
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
            process.stderr.write(boxen(message, {
                padding: 1,
                margin: 1,
                borderStyle: 'round',
                borderColor: 'yellow',
            }) + '\n');
            process.exit(0);
        }
        watchdogTimer = null;
    }, watchdogTimeoutMs);
    if (watchdogTimer && typeof watchdogTimer.unref === 'function') {
        watchdogTimer.unref();
    }
}
async function bootstrapWithDaemon() {
    process.env.MCP_SERVER_MODE = 'true';
    startStdinBuffering();
    try {
        const { DaemonBootstrap, isDaemonDisabled } = await import('./daemon/DaemonBootstrap.js');
        const { logger } = await import('../utils/logger.js');
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const packageJson = require('../../package.json');
        const version = packageJson.version;
        if (isDaemonDisabled()) {
            logger.info('[Bootstrap] Daemon mode disabled, running standalone');
            startMCPServer();
            return;
        }
        const bootstrapper = new DaemonBootstrap({ version });
        const result = await bootstrapper.determineMode();
        logger.info('[Bootstrap] Mode determined', {
            mode: result.mode,
            reason: result.reason,
            existingDaemon: result.existingDaemon,
        });
        switch (result.mode) {
            case 'daemon':
                await startAsDaemon(bootstrapper, version);
                break;
            case 'proxy':
                await startAsProxy(bootstrapper);
                break;
            case 'standalone':
            default:
                startMCPServer();
                break;
        }
    }
    catch (error) {
        process.stderr.write(`[Bootstrap] Daemon bootstrap failed, falling back to standalone: ${error}\n`);
        startMCPServer();
    }
}
function setupSignalHandlers(shutdownFn) {
    process.once('SIGTERM', () => shutdownFn('SIGTERM'));
    process.once('SIGINT', () => shutdownFn('SIGINT'));
}
async function startAsDaemon(bootstrapper, version) {
    process.env.MCP_SERVER_MODE = 'true';
    const { logger } = await import('../utils/logger.js');
    const { DaemonSocketServer } = await import('./daemon/DaemonSocketServer.js');
    const { DaemonLockManager } = await import('./daemon/DaemonLockManager.js');
    const lockAcquired = await bootstrapper.acquireDaemonLock();
    if (!lockAcquired) {
        logger.warn('[Bootstrap] Failed to acquire daemon lock, falling back to standalone');
        startMCPServer();
        return;
    }
    logger.info('[Bootstrap] Starting as daemon', { version, pid: process.pid });
    process.env.MCP_SERVER_MODE = 'true';
    const { ClaudeCodeBuddyMCPServer } = await import('./server.js');
    const mcpServer = await ClaudeCodeBuddyMCPServer.create();
    const transport = bootstrapper.getTransport();
    const socketServer = new DaemonSocketServer({
        transport,
        version,
    });
    socketServer.on('client_connect', (client) => {
        logger.info('[Daemon] Client connected', { clientId: client.clientId, version: client.version });
    });
    socketServer.on('client_disconnect', (clientId) => {
        logger.info('[Daemon] Client disconnected', { clientId });
    });
    socketServer.setMcpHandler(async (request) => {
        return mcpServer.handleRequest(request);
    });
    await socketServer.start();
    logger.info('[Daemon] Socket server started', { path: transport.getPath() });
    stopStdinBufferingAndReplay();
    await mcpServer.start();
    const cleanupDaemon = async (reason) => {
        logger.info('[Daemon] Cleanup started', { reason });
        try {
            await socketServer.stop();
        }
        catch (error) {
            logger.warn('[Daemon] Error stopping socket server', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        try {
            await DaemonLockManager.releaseLock();
        }
        catch (error) {
            logger.warn('[Daemon] Error releasing lock', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        try {
            transport.cleanup();
            logger.info('[Daemon] Socket file cleaned up');
        }
        catch (error) {
            logger.warn('[Daemon] Error cleaning up socket file', {
                error: error instanceof Error ? error.message : String(error),
            });
        }
        logger.info('[Daemon] Cleanup complete');
    };
    setupSignalHandlers(async (signal) => {
        logger.info('[Daemon] Shutdown requested', { signal });
        await cleanupDaemon(`signal:${signal}`);
        process.exit(0);
    });
    process.once('uncaughtException', async (error) => {
        logger.error('[Daemon] Uncaught exception', {
            error: error.message,
            stack: error.stack,
        });
        await cleanupDaemon('uncaughtException');
        process.exit(1);
    });
    process.once('unhandledRejection', async (reason) => {
        logger.error('[Daemon] Unhandled rejection', {
            reason: reason instanceof Error ? reason.message : String(reason),
            stack: reason instanceof Error ? reason.stack : undefined,
        });
        await cleanupDaemon('unhandledRejection');
        process.exit(1);
    });
    startMCPClientWatchdog();
}
async function startAsProxy(bootstrapper) {
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
    proxyClient.on('connected', () => {
        logger.info('[Proxy] Connected to daemon');
    });
    proxyClient.on('disconnected', (reason) => {
        logger.warn('[Proxy] Disconnected from daemon', { reason });
    });
    proxyClient.on('error', (error) => {
        logger.error('[Proxy] Error', { error: error.message });
    });
    proxyClient.on('shutdown', (reason) => {
        logger.info('[Proxy] Daemon requested shutdown', { reason });
        process.exit(0);
    });
    stopStdinBufferingAndReplay();
    await proxyClient.start();
    logger.info('[Proxy] Proxy started, forwarding stdio to daemon');
    setupSignalHandlers(async (signal) => {
        logger.info('[Proxy] Shutdown requested', { signal });
        await proxyClient.stop();
        process.exit(0);
    });
}
function startMCPServer() {
    process.env.MCP_SERVER_MODE = 'true';
    async function bootstrap() {
        try {
            startMCPClientWatchdog();
            const { ClaudeCodeBuddyMCPServer } = await import('./server.js');
            const mcpServer = await ClaudeCodeBuddyMCPServer.create();
            stopStdinBufferingAndReplay();
            await mcpServer.start();
        }
        catch (error) {
            process.stderr.write(`Fatal error in MCP server bootstrap: ${error}\n`);
            process.exit(1);
        }
    }
    async function shutdown(signal) {
        const SHUTDOWN_TIMEOUT_MS = 5000;
        const shutdownTimeout = setTimeout(() => {
            process.exit(1);
        }, SHUTDOWN_TIMEOUT_MS);
        try {
            clearTimeout(shutdownTimeout);
            process.exit(0);
        }
        catch {
            clearTimeout(shutdownTimeout);
            process.exit(1);
        }
    }
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    process.once('SIGINT', () => shutdown('SIGINT'));
    bootstrap();
}
export {};
//# sourceMappingURL=server-bootstrap.js.map