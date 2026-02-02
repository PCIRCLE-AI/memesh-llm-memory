#!/usr/bin/env node

import fs from 'fs';
import os from 'os';
import path from 'path';

const DEFAULT_CONFIG_PATH = path.join(os.homedir(), '.claude', 'config.json');
const FALLBACK_CONFIG_PATHS = [
  DEFAULT_CONFIG_PATH,
  path.join(os.homedir(), '.claude.json'),
  path.join(os.homedir(), '.config', 'claude', 'claude_desktop_config.json'),
  path.join(os.homedir(), '.claude', 'mcp_settings.json'),
];

function resolveConfigPath(preferredPath) {
  if (preferredPath) {
    return preferredPath;
  }

  // Check for environment variable (with backward compatibility)
  const envPath = process.env.MEMESH_MCP_CONFIG_PATH || process.env.CCB_MCP_CONFIG_PATH;
  if (envPath) {
    return envPath;
  }

  // Always use DEFAULT_CONFIG_PATH (~/.claude/config.json) for Claude Code CLI
  // Don't fallback to other files like ~/.claude.json (which is the main CLI config, not MCP config)
  return DEFAULT_CONFIG_PATH;
}

/**
 * Add MeMesh to MCP config (defaults to ~/.claude.json).
 */
function addToMcpConfig(ccbPath, preferredConfigPath) {
  const configPath = resolveConfigPath(preferredConfigPath);

  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch (e) {
      console.error(`Error: Could not parse MCP config at ${configPath}.`);
      console.error('Please fix the JSON file and re-run the installer.');
      process.exit(1);
    }
  }

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // Add or update MeMesh entry with required 'type' field
  config.mcpServers['claude-code-buddy'] = {
    type: 'stdio',  // Required field for Claude Code MCP servers
    command: 'node',
    args: [ccbPath],
    env: {
      NODE_ENV: 'production'
    }
  };

  try {
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error(`Error: Could not write MCP config at ${configPath}.`);
    console.error('Check file permissions and try again.');
    process.exit(1);
  }

  console.log(`✓ Added MeMesh to MCP configuration at ${configPath}`);
}

/**
 * Verify installation
 */
function verifyInstallation() {
  const requiredFiles = [
    'dist/mcp/server-bootstrap.js',
    'dist/index.js',
    'package.json',
    '.env'
  ];

  const missing = requiredFiles.filter(file => !fs.existsSync(file));

  if (missing.length > 0) {
    console.error('✗ Missing required files:', missing.join(', '));
    process.exit(1);
  }

  console.log('✓ All required files present');
}

// Command line interface
const command = process.argv[2];
const arg = process.argv[3];
const configArg = process.argv[4];

switch (command) {
  case 'add-to-mcp':
    addToMcpConfig(arg, configArg);
    break;
  case 'verify':
    verifyInstallation();
    break;
  default:
    console.log('Usage: node install-helpers.js <command> [args]');
    console.log('Commands:');
    console.log('  add-to-mcp <path> [config]  - Add MeMesh to MCP config');
    console.log('  verify             - Verify installation');
}
