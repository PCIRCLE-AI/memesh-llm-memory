#!/usr/bin/env node
/**
 * Post-install script for MeMesh
 *
 * 1. Generates A2A token automatically
 * 2. Creates .env file with token
 * 3. Configures ~/.claude.json (Claude Code's global config, auto-registers MCP server)
 * 4. Displays installation guide
 */

import { randomBytes } from 'crypto';
import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
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
// Step 2: Configure ~/.claude.json (Claude Code's global config)
// ============================================================================
let mcpConfigured = false;
let mcpConfigPath = '';

try {
  mcpConfigPath = join(homedir(), '.claude.json');

  // Determine the server path based on installation context
  // For npm global install, use npx; for local dev, use absolute path
  const isGlobalInstall = projectRoot.includes('node_modules');
  let serverPath;

  if (isGlobalInstall) {
    // For global npm install, we'll configure to use npx
    serverPath = null; // Will use npx in config
  } else {
    // For local development, use absolute path to server
    serverPath = join(projectRoot, 'dist', 'mcp', 'server-bootstrap.js');
  }

  // Read existing config or create new one
  // IMPORTANT: ~/.claude.json contains many other Claude Code settings,
  // so we must preserve the entire file and only update mcpServers
  let mcpConfig = { mcpServers: {} };
  if (existsSync(mcpConfigPath)) {
    try {
      const existingContent = readFileSync(mcpConfigPath, 'utf-8').trim();
      if (existingContent) {
        mcpConfig = JSON.parse(existingContent);
        if (!mcpConfig.mcpServers) {
          mcpConfig.mcpServers = {};
        }
      }
    } catch (e) {
      // If parsing fails, start fresh but don't overwrite completely
      mcpConfig = { mcpServers: {} };
    }
  }

  // Configure memesh entry
  const dataDir = join(homedir(), '.memesh');
  if (isGlobalInstall) {
    // For npm global install, use npx to run the package
    mcpConfig.mcpServers.memesh = {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@pcircle/memesh'],
      env: {
        NODE_ENV: 'production',
        MEMESH_DATA_DIR: dataDir,
        MEMESH_A2A_TOKEN: a2aToken
      }
    };
  } else {
    // For local development, use node with absolute path
    mcpConfig.mcpServers.memesh = {
      type: 'stdio',
      command: 'node',
      args: [serverPath],
      env: {
        NODE_ENV: 'production',
        MEMESH_DATA_DIR: dataDir,
        MEMESH_A2A_TOKEN: a2aToken
      }
    };
  }

  // Remove legacy entry if exists
  if (mcpConfig.mcpServers['claude-code-buddy']) {
    delete mcpConfig.mcpServers['claude-code-buddy'];
  }

  // Write config
  writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2) + '\n', 'utf-8');
  mcpConfigured = true;
} catch (error) {
  // Non-fatal: user can configure manually
  console.warn(chalk.yellow(`⚠️  Could not auto-configure MCP settings: ${error.message}`));
  console.warn(chalk.yellow('   You can configure manually (see instructions below)'));
}

// ============================================================================
// Step 3: Display Installation Message
// ============================================================================
const tokenDisplay = `${a2aToken.substring(0, 8)}...${a2aToken.substring(a2aToken.length - 8)}`;
const tokenStatusIcon = tokenSource === 'generated' ? '🔑' : '✓';
const tokenStatusText = tokenSource === 'generated'
  ? chalk.green('Generated new A2A token')
  : chalk.cyan('Using existing A2A token');
const mcpStatusIcon = mcpConfigured ? '✅' : '⚠️';
const mcpStatusText = mcpConfigured
  ? chalk.green(`Auto-configured at ${mcpConfigPath}`)
  : chalk.yellow('Manual configuration required (see below)');

// Build the message based on configuration status
const configSection = mcpConfigured
  ? `${chalk.bold('MCP Configuration:')}
  ${mcpStatusIcon} ${mcpStatusText}
  ${chalk.dim('MeMesh is ready to use! Just restart Claude Code.')}

${chalk.bold('Quick Start (2 Steps):')}

  ${chalk.yellow('1.')} ${chalk.bold('Restart Claude Code')}
     Completely quit and reopen to load the MCP server

  ${chalk.yellow('2.')} ${chalk.bold('Test Connection')}
     Ask: ${chalk.italic('"List available MeMesh tools"')}`
  : `${chalk.bold('MCP Configuration:')}
  ${mcpStatusIcon} ${mcpStatusText}

${chalk.bold('Quick Start (3 Steps):')}

  ${chalk.yellow('1.')} ${chalk.bold('Configure MCP Client')}
     Add to ~/.claude.json under "mcpServers" key (see below)

  ${chalk.yellow('2.')} ${chalk.bold('Restart Claude Code')}
     Completely quit and reopen to load the MCP server

  ${chalk.yellow('3.')} ${chalk.bold('Test Connection')}
     Ask: ${chalk.italic('"List available MeMesh tools"')}

${chalk.bold('Manual Configuration:')}

${chalk.dim('Add to ~/.claude.json under "mcpServers":')}

  ${chalk.cyan('"memesh"')}: {
    ${chalk.cyan('"type"')}: ${chalk.green('"stdio"')},
    ${chalk.cyan('"command"')}: ${chalk.green('"npx"')},
    ${chalk.cyan('"args"')}: [${chalk.green('"-y"')}, ${chalk.green('"@pcircle/memesh"')}],
    ${chalk.cyan('"env"')}: {
      ${chalk.cyan('"NODE_ENV"')}: ${chalk.green('"production"')},
      ${chalk.cyan('"MEMESH_DATA_DIR"')}: ${chalk.green('"~/.memesh"')},
      ${chalk.cyan('"MEMESH_A2A_TOKEN"')}: ${chalk.green(`"${a2aToken}"`)}
    }
  }`;

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

${configSection}

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
