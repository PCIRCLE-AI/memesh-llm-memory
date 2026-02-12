#!/usr/bin/env node

/**
 * MeMesh Plugin Health Check
 *
 * Fast, non-invasive validation of plugin installation.
 * Checks all 4 critical paths and reports issues without modifying anything.
 *
 * Exit codes:
 *   0 - All healthy
 *   1 - Repairable issues found
 *   2 - Fatal error (requires manual intervention)
 */

import { existsSync, readFileSync, lstatSync, realpathSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Parse CLI flags
const silent = process.argv.includes('--silent');
const verbose = process.argv.includes('--verbose');
const json = process.argv.includes('--json');

/**
 * Health check result structure
 */
const result = {
  healthy: true,
  issues: [],
  timestamp: new Date().toISOString(),
  checks: {
    dist: false,
    marketplace: false,
    symlink: false,
    settings: false,
    mcp: false
  }
};

/**
 * Add an issue to the result
 */
function addIssue(path, severity, message, repairable = true) {
  result.issues.push({ path, severity, message, repairable });
  result.healthy = false;
  if (!silent && !json) {
    const icon = severity === 'error' ? '❌' : '⚠️';
    console.error(`   ${icon} ${path}: ${message}`);
  }
}

/**
 * Log success message
 */
function logSuccess(message) {
  if (!silent && !json && verbose) {
    console.log(`   ✅ ${message}`);
  }
}

// ============================================================================
// Check 1: Dist directory exists (required for all other checks)
// ============================================================================

if (!silent && !json) console.log('🔍 Checking MeMesh plugin installation...\n');

const distPath = join(projectRoot, '.claude-plugin', 'memesh', 'dist', 'mcp', 'server-bootstrap.js');

if (!existsSync(distPath)) {
  addIssue('dist', 'error', 'Plugin not built (.claude-plugin/memesh/dist/ missing)', false);
  result.checks.dist = false;

  if (!silent && !json) {
    console.error('\n❌ Plugin not built. Run: npm run build\n');
  }

  if (json) {
    console.log(JSON.stringify(result, null, 2));
  }

  process.exit(2); // Fatal error
} else {
  result.checks.dist = true;
  logSuccess('Plugin dist/ exists');
}

// ============================================================================
// Check 2: Marketplace registration
// ============================================================================

const knownMarketplacesPath = join(homedir(), '.claude', 'plugins', 'known_marketplaces.json');
const claudePluginRoot = join(projectRoot, '.claude-plugin');

try {
  if (!existsSync(knownMarketplacesPath)) {
    addIssue('marketplace', 'error', 'known_marketplaces.json not found');
  } else {
    const content = readFileSync(knownMarketplacesPath, 'utf-8');
    const marketplaces = JSON.parse(content);

    if (!marketplaces['pcircle-ai']) {
      addIssue('marketplace', 'error', 'pcircle-ai marketplace not registered');
    } else {
      const entry = marketplaces['pcircle-ai'];
      const expectedPath = claudePluginRoot;

      if (entry.source?.path !== expectedPath) {
        addIssue('marketplace', 'warning', `Marketplace path incorrect (expected: ${expectedPath}, got: ${entry.source?.path})`);
      } else {
        result.checks.marketplace = true;
        logSuccess('Marketplace registered correctly');
      }
    }
  }
} catch (error) {
  addIssue('marketplace', 'error', `Failed to parse known_marketplaces.json: ${error.message}`);
}

// ============================================================================
// Check 3: Symlink validity
// ============================================================================

const symlinkPath = join(homedir(), '.claude', 'plugins', 'marketplaces', 'pcircle-ai');

try {
  if (!existsSync(symlinkPath)) {
    addIssue('symlink', 'error', 'Marketplace symlink not found');
  } else {
    const stats = lstatSync(symlinkPath);

    if (!stats.isSymbolicLink()) {
      addIssue('symlink', 'error', 'Marketplace path is not a symlink');
    } else {
      const target = realpathSync(symlinkPath);
      const expectedTarget = realpathSync(claudePluginRoot);

      if (target !== expectedTarget) {
        addIssue('symlink', 'warning', `Symlink points to wrong location (expected: ${expectedTarget}, got: ${target})`);
      } else if (!existsSync(target)) {
        addIssue('symlink', 'error', 'Symlink target does not exist');
      } else {
        result.checks.symlink = true;
        logSuccess('Symlink valid');
      }
    }
  }
} catch (error) {
  addIssue('symlink', 'error', `Failed to check symlink: ${error.message}`);
}

// ============================================================================
// Check 4: Plugin enabled in settings
// ============================================================================

const settingsPath = join(homedir(), '.claude', 'settings.json');

try {
  if (!existsSync(settingsPath)) {
    addIssue('settings', 'error', 'settings.json not found');
  } else {
    const content = readFileSync(settingsPath, 'utf-8');
    const settings = JSON.parse(content);

    if (!settings.enabledPlugins) {
      addIssue('settings', 'error', 'enabledPlugins object missing');
    } else if (!settings.enabledPlugins['memesh@pcircle-ai']) {
      addIssue('settings', 'error', 'memesh@pcircle-ai not enabled');
    } else if (settings.enabledPlugins['memesh@pcircle-ai'] !== true) {
      addIssue('settings', 'warning', 'memesh@pcircle-ai is disabled');
    } else {
      result.checks.settings = true;
      logSuccess('Plugin enabled in settings');
    }
  }
} catch (error) {
  addIssue('settings', 'error', `Failed to parse settings.json: ${error.message}`);
}

// ============================================================================
// Check 5: MCP server configuration
// ============================================================================

const mcpSettingsPath = join(homedir(), '.claude', 'mcp_settings.json');
const expectedMcpPath = distPath;

try {
  if (!existsSync(mcpSettingsPath)) {
    addIssue('mcp', 'error', 'mcp_settings.json not found');
  } else {
    const content = readFileSync(mcpSettingsPath, 'utf-8');
    const mcpSettings = JSON.parse(content);

    if (!mcpSettings.mcpServers) {
      addIssue('mcp', 'error', 'mcpServers object missing');
    } else if (!mcpSettings.mcpServers.memesh) {
      addIssue('mcp', 'error', 'memesh server not configured');
    } else {
      const memeshConfig = mcpSettings.mcpServers.memesh;

      // Check command
      if (memeshConfig.command !== 'node') {
        addIssue('mcp', 'warning', 'MCP server command should be "node"');
      }

      // Check args
      if (!Array.isArray(memeshConfig.args) || memeshConfig.args.length === 0) {
        addIssue('mcp', 'error', 'MCP server args missing');
      } else if (memeshConfig.args[0] !== expectedMcpPath) {
        addIssue('mcp', 'warning', `MCP server path incorrect (expected: ${expectedMcpPath}, got: ${memeshConfig.args[0]})`);
      } else {
        result.checks.mcp = true;
        logSuccess('MCP server configured correctly');
      }
    }
  }
} catch (error) {
  addIssue('mcp', 'error', `Failed to parse mcp_settings.json: ${error.message}`);
}

// ============================================================================
// Summary
// ============================================================================

if (json) {
  console.log(JSON.stringify(result, null, 2));
} else if (!silent) {
  console.log('\n' + '═'.repeat(60));

  if (result.healthy) {
    console.log('✅ All checks passed - plugin installation healthy');
    console.log('═'.repeat(60));
  } else {
    const errorCount = result.issues.filter(i => i.severity === 'error').length;
    const warningCount = result.issues.filter(i => i.severity === 'warning').length;
    const repairableCount = result.issues.filter(i => i.repairable).length;

    console.log(`❌ Found ${result.issues.length} issue(s): ${errorCount} error(s), ${warningCount} warning(s)`);
    console.log('═'.repeat(60));

    if (repairableCount > 0) {
      console.log(`\n🔧 ${repairableCount} issue(s) are auto-repairable. Run: npm run health:repair\n`);
    } else {
      console.log('\n⚠️  Issues require manual intervention. Run: npm run build\n');
    }
  }
}

// Exit with appropriate code
const hasUnrepairableIssues = result.issues.some(i => !i.repairable);
process.exit(result.healthy ? 0 : (hasUnrepairableIssues ? 2 : 1));
