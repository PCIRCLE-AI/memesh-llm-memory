#!/usr/bin/env node
/**
 * Post-install script for MeMesh
 *
 * 1. Generates A2A token automatically
 * 2. Creates .env file with token
 * 3. Displays installation guide with token
 */

import { randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import boxen from 'boxen';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = process.cwd(); // npm install 時的目錄
const envFile = join(projectRoot, '.env');

// ============================================================================
// Step 1: Generate or Read A2A Token
// ============================================================================
let a2aToken = null;
let tokenSource = 'generated';

// Check if .env exists and has token
if (existsSync(envFile)) {
  const envContent = readFileSync(envFile, 'utf-8');
  const tokenMatch = envContent.match(/^MEMESH_A2A_TOKEN=(.+)$/m);

  if (tokenMatch && tokenMatch[1]) {
    a2aToken = tokenMatch[1].trim();
    tokenSource = 'existing';
  }
}

// Generate new token if not found
if (!a2aToken) {
  a2aToken = randomBytes(32).toString('hex');

  try {
    if (existsSync(envFile)) {
      // Append to existing .env
      appendFileSync(envFile, `\nMEMESH_A2A_TOKEN=${a2aToken}\n`, 'utf-8');
    } else {
      // Create new .env
      writeFileSync(envFile, `MEMESH_A2A_TOKEN=${a2aToken}\n`, 'utf-8');
    }
  } catch (error) {
    // If we can't write .env, continue anyway (user can set token manually)
    console.warn(chalk.yellow(`⚠️  Could not write .env file: ${error.message}`));
  }
}

// ============================================================================
// Step 2: Display Installation Message
// ============================================================================
const tokenDisplay = `${a2aToken.substring(0, 8)}...${a2aToken.substring(a2aToken.length - 8)}`;
const tokenStatusIcon = tokenSource === 'generated' ? '🔑' : '✓';
const tokenStatusText = tokenSource === 'generated'
  ? chalk.green('Generated new A2A token')
  : chalk.cyan('Using existing A2A token');

const message = `
${chalk.bold.green('✅ MeMesh Installed Successfully!')}

${chalk.bold('What You Got:')}
  ${chalk.cyan('•')} 18 MCP tools (persistent memory, task routing, secrets management, A2A protocol)
  ${chalk.cyan('•')} A2A Protocol for agent-to-agent collaboration
  ${chalk.cyan('•')} Auto-memory with smart knowledge graph
  ${chalk.cyan('•')} Self-reminder system with heartbeat monitoring

${chalk.bold('A2A Token:')}
  ${tokenStatusIcon} ${tokenStatusText}
  ${chalk.dim('Token:')} ${chalk.yellow(tokenDisplay)}
  ${chalk.dim('Full token saved to:')} ${chalk.cyan('.env')}

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
      ${chalk.cyan('"args"')}: [${chalk.green('"-y"')}, ${chalk.green('"@pcircle/memesh"')}],
      ${chalk.cyan('"env"')}: {
        ${chalk.cyan('"MEMESH_A2A_TOKEN"')}: ${chalk.green(`"${a2aToken}"`)},
        ${chalk.cyan('"DISABLE_MCP_WATCHDOG"')}: ${chalk.green('"1"')}
      }
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
