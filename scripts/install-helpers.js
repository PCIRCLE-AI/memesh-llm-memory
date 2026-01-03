#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Add CCB to MCP config.json
 */
function addToMcpConfig(ccbPath) {
  const configPath = path.join(process.env.HOME, '.claude', 'config.json');

  let config = {};
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // Add or update CCB entry - use 'claude-code-buddy' for consistency
  config.mcpServers['claude-code-buddy'] = {
    command: 'node',
    args: [ccbPath],
    env: {
      NODE_ENV: 'production'
    }
  };

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log('✓ Added CCB to MCP configuration');
}

/**
 * Verify installation
 */
function verifyInstallation() {
  const requiredFiles = [
    'dist/mcp/server.js',
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

switch (command) {
  case 'add-to-mcp':
    addToMcpConfig(arg);
    break;
  case 'verify':
    verifyInstallation();
    break;
  default:
    console.log('Usage: node install-helpers.js <command> [args]');
    console.log('Commands:');
    console.log('  add-to-mcp <path>  - Add CCB to MCP config');
    console.log('  verify             - Verify installation');
}
