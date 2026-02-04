#!/usr/bin/env node
let mcpClientConnected = false;
const args = process.argv.slice(2);
const hasCliArgs = args.length > 0;
if (hasCliArgs) {
    (async () => {
        const { runCLI } = await import('../cli/index.js');
        await runCLI();
    })().catch((error) => {
        console.error('CLI error:', error);
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
    const stdinHandler = () => {
        mcpClientConnected = true;
    };
    process.stdin.once('data', stdinHandler);
    setTimeout(async () => {
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
            console.log(boxen(message, {
                padding: 1,
                margin: 1,
                borderStyle: 'round',
                borderColor: 'yellow',
            }));
            process.exit(0);
        }
    }, watchdogTimeoutMs);
}
async function startA2AServer() {
    try {
        const { A2AServer } = await import('../a2a/server/A2AServer.js');
        const os = await import('os');
        const hostname = os.hostname().split('.')[0].toLowerCase();
        const timestamp = Date.now().toString(36);
        const defaultId = `${hostname}-${timestamp}`;
        const agentId = process.env.A2A_AGENT_ID || defaultId;
        const agentCard = {
            id: agentId,
            name: 'MeMesh (MCP)',
            description: 'AI development assistant via MCP protocol',
            version: '2.7.0',
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
                maxMessageSize: 10 * 1024 * 1024,
                streaming: false,
                pushNotifications: false,
            },
            endpoints: {
                baseUrl: 'http://localhost:3000',
            },
        };
        const server = new A2AServer({
            agentId,
            agentCard,
            portRange: { min: 3000, max: 3999 },
            heartbeatInterval: 60000,
        });
        const port = await server.start();
        const { logger } = await import('../utils/logger.js');
        logger.info('[A2A] Server started successfully', {
            port,
            agentId,
            baseUrl: `http://localhost:${port}`,
        });
        return server;
    }
    catch (error) {
        const { logger } = await import('../utils/logger.js');
        logger.error('[A2A] Failed to start A2A server', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
        });
        return null;
    }
}
async function bootstrapWithDaemon() {
    process.env.MCP_SERVER_MODE = 'true';
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
        console.error('[Bootstrap] Daemon bootstrap failed, falling back to standalone:', error);
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
    await socketServer.start();
    logger.info('[Daemon] Socket server started', { path: transport.getPath() });
    await mcpServer.start();
    const a2aServer = await startA2AServer();
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
        if (a2aServer) {
            try {
                await a2aServer.stop();
            }
            catch (error) {
                logger.warn('[Daemon] Error stopping A2A server', {
                    error: error instanceof Error ? error.message : String(error),
                });
            }
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
    let a2aServerRef = null;
    async function bootstrap() {
        try {
            startMCPClientWatchdog();
            const { ClaudeCodeBuddyMCPServer } = await import('./server.js');
            const mcpServer = await ClaudeCodeBuddyMCPServer.create();
            await mcpServer.start();
            a2aServerRef = await startA2AServer();
        }
        catch (error) {
            console.error('Fatal error in MCP server bootstrap:', error);
            process.exit(1);
        }
    }
    async function shutdown(signal) {
        const shutdownTimeout = setTimeout(() => {
            process.exit(1);
        }, 5000);
        try {
            if (a2aServerRef) {
                await a2aServerRef.stop();
            }
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