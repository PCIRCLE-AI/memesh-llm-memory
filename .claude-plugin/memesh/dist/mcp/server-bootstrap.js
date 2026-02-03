#!/usr/bin/env node
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
    startMCPServer();
}
function startMCPServer() {
    process.env.MCP_SERVER_MODE = 'true';
    let a2aServer = null;
    let mcpClientConnected = false;
    async function bootstrap() {
        try {
            startMCPClientWatchdog();
            const { ClaudeCodeBuddyMCPServer } = await import('./server.js');
            const mcpServer = await ClaudeCodeBuddyMCPServer.create();
            await mcpServer.start();
            a2aServer = await startA2AServer();
        }
        catch (error) {
            console.error('Fatal error in MCP server bootstrap:', error);
            process.exit(1);
        }
    }
    function startMCPClientWatchdog() {
        if (process.env.DISABLE_MCP_WATCHDOG === '1') {
            return;
        }
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
        }, 3000);
    }
    async function startA2AServer() {
        try {
            const { A2AServer } = await import('../a2a/server/A2AServer.js');
            const crypto = await import('crypto');
            const agentId = process.env.A2A_AGENT_ID || `ccb-mcp-${crypto.randomBytes(4).toString('hex')}`;
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
            return server;
        }
        catch (error) {
            return null;
        }
    }
    async function shutdown(signal) {
        const shutdownTimeout = setTimeout(() => {
            process.exit(1);
        }, 5000);
        try {
            if (a2aServer) {
                await a2aServer.stop();
            }
            clearTimeout(shutdownTimeout);
            process.exit(0);
        }
        catch (error) {
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