#!/usr/bin/env node
/**
 * Post-install script for MeMesh
 *
 * 1. Configures ~/.claude/mcp_settings.json (auto-registers MCP server)
 * 2. Displays installation guide
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import chalk from 'chalk';
import boxen from 'boxen';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = process.cwd(); // npm install 時的目錄

// ============================================================================
// Step 1: Configure ~/.claude/mcp_settings.json
// ============================================================================
let mcpConfigured = false;
let mcpConfigPath = '';

try {
  const claudeDir = join(homedir(), '.claude');
  mcpConfigPath = join(claudeDir, 'mcp_settings.json');

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

  // Create ~/.claude directory (recursive: true handles existing directory safely, avoids TOCTOU race condition)
  mkdirSync(claudeDir, { recursive: true });

  // Read existing config or create new one
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
  if (isGlobalInstall) {
    // For npm global install, use npx to run the package
    mcpConfig.mcpServers.memesh = {
      command: 'npx',
      args: ['-y', '@pcircle/memesh'],
      env: {
        NODE_ENV: 'production'
      }
    };
  } else {
    // For local development, use node with absolute path
    mcpConfig.mcpServers.memesh = {
      command: 'node',
      args: [serverPath],
      env: {
        NODE_ENV: 'production'
      }
    };
  }

  // Remove legacy entry if exists
  if (mcpConfig.mcpServers['claude-code-buddy']) {
    delete mcpConfig.mcpServers['claude-code-buddy'];
  }

  // Write config (directory already ensured above with mkdirSync recursive)
  writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2) + '\n', 'utf-8');
  mcpConfigured = true;
} catch (error) {
  // Non-fatal: user can configure manually
  console.warn(chalk.yellow(`⚠️  Could not auto-configure MCP settings: ${error.message}`));
  console.warn(chalk.yellow('   You can configure manually (see instructions below)'));
}

// ============================================================================
// Step 2: Display Installation Message
// ============================================================================
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
     Add to ~/.claude/mcp_settings.json (see below)

  ${chalk.yellow('2.')} ${chalk.bold('Restart Claude Code')}
     Completely quit and reopen to load the MCP server

  ${chalk.yellow('3.')} ${chalk.bold('Test Connection')}
     Ask: ${chalk.italic('"List available MeMesh tools"')}

${chalk.bold('Manual Configuration:')}

${chalk.dim('Add to ~/.claude/mcp_settings.json:')}

  {
    ${chalk.cyan('"mcpServers"')}: {
      ${chalk.cyan('"memesh"')}: {
        ${chalk.cyan('"command"')}: ${chalk.green('"npx"')},
        ${chalk.cyan('"args"')}: [${chalk.green('"-y"')}, ${chalk.green('"@pcircle/memesh"')}]
      }
    }
  }`;

const message = `
${chalk.bold.green('✅ MeMesh Installed Successfully!')}

${chalk.bold('What You Got:')}
  ${chalk.cyan('•')} 8 MCP tools (persistent memory, semantic search, task routing, cloud sync)
  ${chalk.cyan('•')} Vector semantic search with ONNX embeddings (runs 100% locally)
  ${chalk.cyan('•')} Auto-memory with smart knowledge graph
  ${chalk.cyan('•')} Local-first architecture (all data stored locally)

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
