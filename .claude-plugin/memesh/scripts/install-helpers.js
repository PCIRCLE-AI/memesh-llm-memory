#!/usr/bin/env node

/**
 * MeMesh Installation Helpers
 *
 * Provides utility functions for:
 * - Creating/updating ~/.claude/mcp_settings.json
 * - Managing MCP server configuration
 * - Verifying installation
 *
 * IMPORTANT: The primary config file is ~/.claude/mcp_settings.json
 * This is what Claude Code's session-start hook checks for.
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

// Primary MCP settings file - this is what Claude Code checks
const MCP_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'mcp_settings.json');

// Legacy paths for backward compatibility checking
const LEGACY_CONFIG_PATHS = [
  path.join(os.homedir(), '.claude', 'config.json'),
  path.join(os.homedir(), '.claude.json'),
  path.join(os.homedir(), '.config', 'claude', 'claude_desktop_config.json'),
];

/**
 * Resolve the config path to use
 * Priority: env var > preferred path > MCP_SETTINGS_PATH
 */
function resolveConfigPath(preferredPath) {
  if (preferredPath) {
    return preferredPath;
  }

  // Check for environment variable (with backward compatibility)
  const envPath = process.env.MEMESH_MCP_CONFIG_PATH || process.env.CCB_MCP_CONFIG_PATH;
  if (envPath) {
    return envPath;
  }

  // Always use MCP_SETTINGS_PATH (~/.claude/mcp_settings.json) for Claude Code
  // This is what the session-start hook checks for
  return MCP_SETTINGS_PATH;
}

/**
 * Create MCP server configuration object
 */
function createServerConfig(serverPath, a2aToken = null) {
  const config = {
    command: 'node',
    args: [serverPath],
    env: {
      NODE_ENV: 'production'
    }
  };

  // Add A2A token if provided
  if (a2aToken) {
    config.env.MEMESH_A2A_TOKEN = a2aToken;
  }

  return config;
}

/**
 * Add MeMesh to MCP settings file (~/.claude/mcp_settings.json)
 *
 * @param {string} serverPath - Path to server-bootstrap.js
 * @param {string} preferredConfigPath - Optional custom config path
 * @param {string} a2aToken - Optional A2A token
 * @returns {boolean} - Success status
 */
function addToMcpConfig(serverPath, preferredConfigPath, a2aToken = null) {
  const configPath = resolveConfigPath(preferredConfigPath);

  let config = { mcpServers: {} };

  // Read existing config if it exists
  if (fs.existsSync(configPath)) {
    try {
      const existingContent = fs.readFileSync(configPath, 'utf8').trim();
      if (existingContent) {
        config = JSON.parse(existingContent);
      }
    } catch (e) {
      console.error(`⚠️  Could not parse existing config at ${configPath}: ${e.message}`);
      console.error('   Creating fresh configuration...');
      config = { mcpServers: {} };
    }
  }

  // Ensure mcpServers exists
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // Create server configuration
  const serverConfig = createServerConfig(serverPath, a2aToken);

  // Handle legacy server names
  const hasLegacyEntry = config.mcpServers['claude-code-buddy'];
  const hasMemeshEntry = config.mcpServers['memesh'];

  if (hasLegacyEntry && !hasMemeshEntry) {
    // Migrate from legacy name to new name
    delete config.mcpServers['claude-code-buddy'];
    config.mcpServers['memesh'] = serverConfig;
    console.log('   ✅ Migrated MCP server: claude-code-buddy → memesh');
  } else {
    // New installation or update existing memesh entry
    config.mcpServers['memesh'] = serverConfig;
    if (hasMemeshEntry) {
      console.log('   ✅ Updated existing MCP server: memesh');
    } else {
      console.log('   ✅ Configured MCP server: memesh');
    }
  }

  // Ensure directory exists
  try {
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
      console.log(`   ✅ Created directory: ${configDir}`);
    }

    // Write config file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');
    console.log(`   ✅ MCP settings saved to: ${configPath}`);

    return true;
  } catch (error) {
    console.error(`   ❌ Could not write MCP config: ${error.message}`);
    console.error('      Check file permissions and try again.');
    return false;
  }
}

/**
 * Configure MeMesh in ~/.claude/mcp_settings.json
 * This is the main function to be called from other scripts
 *
 * @param {Object} options
 * @param {string} options.serverPath - Path to server-bootstrap.js
 * @param {string} options.a2aToken - A2A authentication token
 * @param {boolean} options.silent - Suppress console output
 * @returns {Object} - { success: boolean, configPath: string, error?: string }
 */
export function configureMcpSettings(options = {}) {
  const {
    serverPath,
    a2aToken = null,
    silent = false
  } = options;

  const configPath = MCP_SETTINGS_PATH;

  if (!silent) {
    console.log('\n📝 Configuring MCP settings...');
  }

  // Validate server path
  if (!serverPath) {
    const error = 'Server path is required';
    if (!silent) console.error(`   ❌ ${error}`);
    return { success: false, configPath, error };
  }

  // Create config
  let config = { mcpServers: {} };

  // Read existing config
  if (fs.existsSync(configPath)) {
    try {
      const content = fs.readFileSync(configPath, 'utf8').trim();
      if (content) {
        config = JSON.parse(content);
        if (!config.mcpServers) config.mcpServers = {};
      }
    } catch (e) {
      if (!silent) {
        console.warn(`   ⚠️  Could not parse existing config, creating new one`);
      }
      config = { mcpServers: {} };
    }
  }

  // Build server configuration
  const serverConfig = {
    command: 'node',
    args: [serverPath],
    env: {
      NODE_ENV: 'production'
    }
  };

  if (a2aToken) {
    serverConfig.env.MEMESH_A2A_TOKEN = a2aToken;
  }

  // Update or add memesh entry
  config.mcpServers.memesh = serverConfig;

  // Remove legacy entry if exists
  if (config.mcpServers['claude-code-buddy']) {
    delete config.mcpServers['claude-code-buddy'];
    if (!silent) console.log('   ✅ Removed legacy "claude-code-buddy" entry');
  }

  // Write config
  try {
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf8');

    if (!silent) {
      console.log(`   ✅ MCP settings configured at: ${configPath}`);
      console.log(`   ✅ Server path: ${serverPath}`);
      if (a2aToken) {
        const tokenPreview = `${a2aToken.substring(0, 8)}...${a2aToken.substring(a2aToken.length - 8)}`;
        console.log(`   🔑 A2A token: ${tokenPreview}`);
      }
    }

    return { success: true, configPath };
  } catch (error) {
    const errorMsg = `Failed to write config: ${error.message}`;
    if (!silent) console.error(`   ❌ ${errorMsg}`);
    return { success: false, configPath, error: errorMsg };
  }
}

/**
 * Check if MeMesh is configured in mcp_settings.json
 * @returns {Object} - { configured: boolean, serverPath?: string }
 */
export function checkMcpConfiguration() {
  const configPath = MCP_SETTINGS_PATH;

  if (!fs.existsSync(configPath)) {
    return { configured: false };
  }

  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const memeshConfig = config.mcpServers?.memesh || config.mcpServers?.['claude-code-buddy'];

    if (memeshConfig) {
      return {
        configured: true,
        serverPath: memeshConfig.args?.[0],
        hasToken: !!memeshConfig.env?.MEMESH_A2A_TOKEN
      };
    }

    return { configured: false };
  } catch (e) {
    return { configured: false, error: e.message };
  }
}

/**
 * Verify installation files exist
 * @param {string} basePath - Base path to check from
 * @returns {Object} - { valid: boolean, missing: string[] }
 */
export function verifyInstallation(basePath = process.cwd()) {
  const requiredFiles = [
    'dist/mcp/server-bootstrap.js',
    'dist/index.js',
    'package.json'
  ];

  const missing = requiredFiles.filter(file =>
    !fs.existsSync(path.join(basePath, file))
  );

  if (missing.length > 0) {
    return { valid: false, missing };
  }

  return { valid: true, missing: [] };
}

/**
 * Read A2A token from .env file
 * @param {string} envPath - Path to .env file
 * @returns {string|null} - Token or null if not found
 */
export function readA2AToken(envPath) {
  if (!fs.existsSync(envPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/^MEMESH_A2A_TOKEN=(.+)$/m);
    return match ? match[1].trim() : null;
  } catch (e) {
    return null;
  }
}

/**
 * Get the MCP settings file path
 * @returns {string}
 */
export function getMcpSettingsPath() {
  return MCP_SETTINGS_PATH;
}

// ============================================================================
// Command Line Interface
// ============================================================================
const command = process.argv[2];
const arg = process.argv[3];
const arg2 = process.argv[4];

switch (command) {
  case 'add-to-mcp':
  case 'configure': {
    // Usage: node install-helpers.js configure <server-path> [a2a-token]
    if (!arg) {
      console.error('❌ Server path required');
      console.error('Usage: node install-helpers.js configure <server-path> [a2a-token]');
      process.exit(1);
    }
    const result = configureMcpSettings({
      serverPath: arg,
      a2aToken: arg2 || null
    });
    process.exit(result.success ? 0 : 1);
    break;
  }

  case 'verify': {
    // Usage: node install-helpers.js verify [base-path]
    const basePath = arg || process.cwd();
    const result = verifyInstallation(basePath);
    if (result.valid) {
      console.log('✅ All required files present');
      process.exit(0);
    } else {
      console.error('❌ Missing required files:', result.missing.join(', '));
      process.exit(1);
    }
    break;
  }

  case 'check': {
    // Usage: node install-helpers.js check
    const status = checkMcpConfiguration();
    if (status.configured) {
      console.log('✅ MeMesh is configured in MCP settings');
      console.log(`   Server path: ${status.serverPath || 'unknown'}`);
      console.log(`   Has A2A token: ${status.hasToken ? 'yes' : 'no'}`);
      process.exit(0);
    } else {
      console.log('❌ MeMesh is NOT configured in MCP settings');
      console.log(`   Expected config: ${MCP_SETTINGS_PATH}`);
      process.exit(1);
    }
    break;
  }

  case 'help':
  default:
    console.log('MeMesh Installation Helpers');
    console.log('');
    console.log('Usage: node install-helpers.js <command> [args]');
    console.log('');
    console.log('Commands:');
    console.log('  configure <path> [token]  - Configure MeMesh in ~/.claude/mcp_settings.json');
    console.log('  verify [base-path]        - Verify installation files exist');
    console.log('  check                     - Check if MeMesh is configured');
    console.log('  help                      - Show this help');
    console.log('');
    console.log('Examples:');
    console.log('  node install-helpers.js configure /path/to/server-bootstrap.js');
    console.log('  node install-helpers.js configure /path/to/server.js "my-a2a-token"');
    console.log('  node install-helpers.js check');
    break;
}
