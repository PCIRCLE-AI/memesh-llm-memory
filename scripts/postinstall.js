#!/usr/bin/env node
/**
 * Post-install message for MeMesh
 *
 * Displays comprehensive installation guide after npm install completes.
 * Shows what was installed, quick start steps, and configuration examples.
 */

import chalk from 'chalk';
import boxen from 'boxen';

const message = `
${chalk.bold.green('✅ MeMesh Installed Successfully!')}

${chalk.bold('What You Got:')}
  ${chalk.cyan('•')} 18 MCP tools (persistent memory, task routing, secrets management, A2A protocol)
  ${chalk.cyan('•')} A2A Protocol for agent-to-agent collaboration
  ${chalk.cyan('•')} Auto-memory with smart knowledge graph
  ${chalk.cyan('•')} Self-reminder system with heartbeat monitoring

${chalk.bold('Quick Start (3 Steps):')}

  ${chalk.yellow('1.')} ${chalk.bold('Configure MCP Client')}
     Add to your Claude Code or Cursor settings

  ${chalk.yellow('2.')} ${chalk.bold('Restart IDE')}
     Reload window to enable MCP integration

  ${chalk.yellow('3.')} ${chalk.bold('Test Connection')}
     Ask: ${chalk.italic('"List available CCB tools"')}

${chalk.bold('Configuration Example:')}

${chalk.dim('Add to your MCP settings.json:')}

  ${chalk.cyan('"mcpServers"')}: {
    ${chalk.cyan('"memesh"')}: {
      ${chalk.cyan('"command"')}: ${chalk.green('"npx"')},
      ${chalk.cyan('"args"')}: [${chalk.green('"-y"')}, ${chalk.green('"@pcircle/memesh"')}]
    }
  }

${chalk.bold('Documentation:')}
  ${chalk.cyan('•')} Setup Guide: ${chalk.underline('https://github.com/PCIRCLE-AI/claude-code-buddy#installation')}
  ${chalk.cyan('•')} User Guide: ${chalk.underline('https://github.com/PCIRCLE-AI/claude-code-buddy/blob/main/docs/USER_GUIDE.md')}
  ${chalk.cyan('•')} Commands: ${chalk.underline('https://github.com/PCIRCLE-AI/claude-code-buddy/blob/main/docs/COMMANDS.md')}

${chalk.dim('Need help? Open an issue: https://github.com/PCIRCLE-AI/claude-code-buddy/issues')}
`;

console.log(
  boxen(message, {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan',
  })
);
