#!/usr/bin/env node

/**
 * Prepare Plugin Directory for Claude Code Installation
 *
 * Following superpowers plugin structure:
 * .claude-plugin/memesh/
 * ├── .claude-plugin/
 * │   └── plugin.json       ← Plugin metadata
 * ├── dist/                 ← Build output
 * ├── node_modules/         ← Dependencies
 * ├── package.json
 * └── scripts/
 */

import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, symlinkSync, unlinkSync, statSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname, normalize, relative, isAbsolute } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Validate that a resolved path stays within an expected parent directory.
 * Prevents path traversal attacks via ../ components.
 */
function validatePathWithinParent(targetPath, expectedParent) {
  const normalizedTarget = normalize(targetPath);
  const normalizedParent = normalize(expectedParent);
  const rel = relative(normalizedParent, normalizedTarget);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    console.error(`   ❌ Path traversal detected: ${targetPath} escapes ${expectedParent}`);
    process.exit(1);
  }
  return normalizedTarget;
}

// Plugin directory structure (following superpowers pattern)
const pluginRootDir = join(projectRoot, '.claude-plugin', 'memesh');
const pluginMetadataDir = join(pluginRootDir, '.claude-plugin');

console.log('🔧 Preparing plugin directory for Claude Code installation...\n');

// Step 1: Create plugin directory structure
// Use recursive mkdir which handles existing directories safely (avoids TOCTOU race condition)
console.log('1️⃣ Creating plugin directory structure...');
mkdirSync(pluginMetadataDir, { recursive: true });
console.log(`   ✅ Ensured: ${pluginRootDir.replace(projectRoot, '.')}`);
console.log(`   ✅ Ensured: ${pluginMetadataDir.replace(projectRoot, '.')}`);

// Step 2: Copy compiled dist/ to plugin directory
console.log('\n2️⃣ Copying compiled dist/ to plugin directory...');
const sourceDist = join(projectRoot, 'dist');
const targetDist = join(pluginRootDir, 'dist');

if (!existsSync(sourceDist)) {
  console.error('   ❌ Error: dist/ directory not found. Please run "npm run build" first.');
  process.exit(1);
}

try {
  cpSync(sourceDist, targetDist, { recursive: true });
  console.log('   ✅ Copied dist/ → .claude-plugin/memesh/dist/');
} catch (error) {
  console.error('   ❌ Error copying dist/:', error.message);
  process.exit(1);
}

// Step 3: Copy package.json to plugin directory
console.log('\n3️⃣ Copying package.json to plugin directory...');
const sourcePackageJson = join(projectRoot, 'package.json');
const targetPackageJson = join(pluginRootDir, 'package.json');

try {
  copyFileSync(sourcePackageJson, targetPackageJson);
  console.log('   ✅ Copied package.json → .claude-plugin/memesh/');
} catch (error) {
  console.error('   ❌ Error copying package.json:', error.message);
  process.exit(1);
}

// Step 4: Copy scripts directory to plugin directory
console.log('\n4️⃣ Copying scripts directory to plugin directory...');
const sourceScripts = join(projectRoot, 'scripts');
const targetScripts = join(pluginRootDir, 'scripts');

try {
  cpSync(sourceScripts, targetScripts, { recursive: true });
  console.log('   ✅ Copied scripts/ → .claude-plugin/memesh/scripts/');
} catch (error) {
  console.error('   ❌ Error copying scripts/:', error.message);
  process.exit(1);
}

// Step 5: Copy plugin.json to .claude-plugin/ subdirectory (following superpowers pattern)
console.log('\n5️⃣ Copying plugin.json to .claude-plugin/ metadata directory...');
const pluginJsonCandidates = [
  join(projectRoot, 'plugin.json'),
  join(projectRoot, '.claude-plugin', 'plugin.json'),
];
const sourcePluginJson = pluginJsonCandidates.find((candidate) => existsSync(candidate));
const targetPluginJson = join(pluginMetadataDir, 'plugin.json');

if (!sourcePluginJson) {
  console.error('   ❌ Error: plugin.json not found. Please create it at project root.');
  process.exit(1);
}

try {
  copyFileSync(sourcePluginJson, targetPluginJson);
  console.log('   ✅ Copied plugin.json → .claude-plugin/memesh/.claude-plugin/');
} catch (error) {
  console.error('   ❌ Error copying plugin.json:', error.message);
  process.exit(1);
}

// Step 5.5: Copy mcp.json to plugin root directory
console.log('\n5.5️⃣ Copying mcp.json to plugin directory...');
const sourceMcpJson = join(projectRoot, 'mcp.json');
const targetMcpJson = join(pluginRootDir, '.mcp.json');

if (!existsSync(sourceMcpJson)) {
  console.error('   ❌ Error: mcp.json not found. Please create it at project root.');
  process.exit(1);
}

try {
  copyFileSync(sourceMcpJson, targetMcpJson);
  console.log('   ✅ Copied mcp.json → .claude-plugin/memesh/.mcp.json');
} catch (error) {
  console.error('   ❌ Error copying mcp.json:', error.message);
  process.exit(1);
}

// Step 6: Install production dependencies
console.log('\n6️⃣ Installing production dependencies in plugin directory...');
console.log('   (This may take a minute...)');

try {
  execSync('npm install --production --loglevel=error', {
    cwd: pluginRootDir,
    stdio: 'inherit'
  });
  console.log('   ✅ Dependencies installed successfully');
} catch (error) {
  console.error('   ❌ Error installing dependencies:', error.message);
  process.exit(1);
}

// Step 7: Verify the plugin structure
console.log('\n7️⃣ Verifying plugin structure...');

const requiredFiles = [
  join(pluginRootDir, 'dist', 'mcp', 'server-bootstrap.js'),
  join(pluginRootDir, 'package.json'),
  join(pluginRootDir, 'node_modules'),
  join(pluginMetadataDir, 'plugin.json'),  // In .claude-plugin/ subdirectory
  join(pluginRootDir, '.mcp.json'),         // MCP server configuration
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (existsSync(file)) {
    console.log(`   ✅ ${file.replace(pluginRootDir + '/', '')}`);
  } else {
    console.error(`   ❌ Missing: ${file.replace(pluginRootDir + '/', '')}`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.error('\n❌ Plugin preparation incomplete. Please check errors above.');
  process.exit(1);
}

// Step 8: Configure ~/.claude/mcp_settings.json
console.log('\n8️⃣ Configuring ~/.claude/mcp_settings.json...');

const mcpServerPath = join(pluginRootDir, 'dist', 'mcp', 'server-bootstrap.js');
validatePathWithinParent(mcpServerPath, pluginRootDir);
const mcpServerName = 'memesh';
const mcpSettingsPath = join(homedir(), '.claude', 'mcp_settings.json');
let mcpSettingsConfigured = false;

try {
  // Ensure ~/.claude directory exists (recursive: true handles existing directory safely, avoids TOCTOU race condition)
  const claudeDir = join(homedir(), '.claude');
  mkdirSync(claudeDir, { recursive: true });
  console.log(`   ✅ Ensured: ${claudeDir}`);

  // Read existing config or create new one
  let mcpConfig = { mcpServers: {} };
  if (existsSync(mcpSettingsPath)) {
    try {
      const existingContent = readFileSync(mcpSettingsPath, 'utf-8').trim();
      if (existingContent) {
        mcpConfig = JSON.parse(existingContent);
        if (!mcpConfig.mcpServers) {
          mcpConfig.mcpServers = {};
        }
      }
    } catch (e) {
      if (e.code === 'ENOENT') {
        console.log('   ℹ️  No existing MCP config found, creating new one');
      } else if (e instanceof SyntaxError) {
        const backupPath = `${mcpSettingsPath}.backup-${Date.now()}`;
        try { copyFileSync(mcpSettingsPath, backupPath); } catch {}
        console.log(`   ⚠️  Corrupted MCP config backed up to: ${backupPath}`);
      } else {
        console.error(`   ❌ Unexpected error reading MCP config: ${e.code || e.message}`);
        throw e;
      }
      mcpConfig = { mcpServers: {} };
    }
  }

  // Configure memesh entry with absolute path (for local dev)
  mcpConfig.mcpServers.memesh = {
    command: 'node',
    args: [mcpServerPath],
    env: {
      NODE_ENV: 'production'
    }
  };

  // Remove legacy entry if exists
  if (mcpConfig.mcpServers['claude-code-buddy']) {
    delete mcpConfig.mcpServers['claude-code-buddy'];
    console.log('   ✅ Removed legacy "claude-code-buddy" entry');
  }

  // Write config (directory already ensured above with mkdirSync recursive)
  writeFileSync(mcpSettingsPath, JSON.stringify(mcpConfig, null, 2) + '\n', 'utf-8');
  mcpSettingsConfigured = true;
  console.log(`   ✅ MCP settings configured at: ${mcpSettingsPath}`);
  console.log(`   ✅ Server path: ${mcpServerPath}`);
} catch (error) {
  console.log(`   ⚠️  Could not configure MCP settings: ${error.message}`);
  console.log('   You may need to manually configure ~/.claude/mcp_settings.json');
}

// Step 9: Register marketplace in known_marketplaces.json
console.log('\n9️⃣ Registering marketplace in Claude Code...');

const pluginsDir = join(homedir(), '.claude', 'plugins');
const marketplacesDir = join(pluginsDir, 'marketplaces');
const knownMarketplacesPath = join(pluginsDir, 'known_marketplaces.json');
const marketplaceSymlink = join(marketplacesDir, 'pcircle-ai');
const claudePluginRoot = join(projectRoot, '.claude-plugin');

try {
  // Ensure marketplaces directory exists
  mkdirSync(marketplacesDir, { recursive: true });
  console.log(`   ✅ Ensured: ${marketplacesDir}`);

  // Validate symlink target exists and is a directory
  if (!existsSync(claudePluginRoot)) {
    throw new Error(`Plugin source directory does not exist: ${claudePluginRoot}`);
  }
  const targetStats = statSync(claudePluginRoot);
  if (!targetStats.isDirectory()) {
    throw new Error(`Plugin source must be a directory: ${claudePluginRoot}`);
  }

  // Create symlink to .claude-plugin directory (atomic try-create-first approach)
  try {
    symlinkSync(claudePluginRoot, marketplaceSymlink, 'dir');
    console.log(`   ✅ Created symlink: pcircle-ai → ${claudePluginRoot}`);
  } catch (err) {
    if (err.code === 'EEXIST') {
      // Symlink exists - remove and retry
      try {
        unlinkSync(marketplaceSymlink);
        symlinkSync(claudePluginRoot, marketplaceSymlink, 'dir');
        console.log(`   ✅ Updated existing symlink: pcircle-ai → ${claudePluginRoot}`);
      } catch (retryErr) {
        throw new Error(`Failed to update marketplace symlink: ${retryErr.code || retryErr.message}`);
      }
    } else {
      throw err;
    }
  }

  // Update known_marketplaces.json (read directly, no existsSync to avoid TOCTOU race)
  let knownMarketplaces = {};
  try {
    const content = readFileSync(knownMarketplacesPath, 'utf-8').trim();
    if (content) {
      knownMarketplaces = JSON.parse(content);
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log('   ℹ️  No existing marketplace config, creating new');
    } else if (e instanceof SyntaxError) {
      const backupPath = `${knownMarketplacesPath}.backup-${Date.now()}`;
      try { copyFileSync(knownMarketplacesPath, backupPath); } catch {}
      console.log(`   ⚠️  Corrupted marketplace config backed up to: ${backupPath}`);
    } else {
      console.error(`   ❌ Unexpected error reading marketplace config: ${e.code || e.message}`);
      throw e;
    }
  }

  // Register in known_marketplaces.json (required for Claude Code to discover marketplace)
  // Previous assumption that "symlink alone is sufficient" was incorrect - Claude Code needs both
  knownMarketplaces['pcircle-ai'] = {
    source: {
      source: 'directory',
      path: claudePluginRoot
    },
    installLocation: marketplaceSymlink,
    lastUpdated: new Date().toISOString()
  };

  try {
    writeFileSync(knownMarketplacesPath, JSON.stringify(knownMarketplaces, null, 2) + '\n', 'utf-8');
    console.log(`   ✅ Registered in known_marketplaces.json: pcircle-ai`);
  } catch (writeError) {
    console.error(`   ❌ Failed to write known_marketplaces.json: ${writeError.message}`);
    throw writeError;
  }
} catch (error) {
  if (error.code === 'EACCES') {
    console.error(`   ❌ Permission denied. Try running with elevated privileges.`);
  } else if (error.code === 'ENOENT') {
    console.error(`   ❌ Required directory not found. Ensure project is built first.`);
  } else {
    console.error(`   ❌ Marketplace registration failed (${error.code || 'unknown'}). See error details above.`);
  }
  console.error(`   [Debug] ${error.message}`);
  process.exit(1);
}

// Step 10: Enable plugin in settings.json
console.log('\n🔟 Enabling plugin in Claude Code settings...');

const settingsPath = join(homedir(), '.claude', 'settings.json');

try {
  let settings = { enabledPlugins: {} };

  // Read directly without existsSync to avoid TOCTOU race
  try {
    const content = readFileSync(settingsPath, 'utf-8').trim();
    if (content) {
      settings = JSON.parse(content);
      if (!settings.enabledPlugins) {
        settings.enabledPlugins = {};
      }
    }
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.log('   ℹ️  No existing settings found, creating new');
    } else if (e instanceof SyntaxError) {
      const backupPath = `${settingsPath}.backup-${Date.now()}`;
      try { copyFileSync(settingsPath, backupPath); } catch {}
      console.log(`   ⚠️  Corrupted settings backed up to: ${backupPath}`);
    } else {
      console.error(`   ❌ Unexpected error reading settings: ${e.code || e.message}`);
      throw e;
    }
  }

  // Enable memesh plugin
  settings.enabledPlugins['memesh@pcircle-ai'] = true;

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf-8');
  console.log(`   ✅ Enabled plugin in: ${settingsPath}`);
} catch (error) {
  if (error.code === 'EACCES') {
    console.error(`   ❌ Permission denied writing settings. Try running with elevated privileges.`);
  } else if (error.code === 'ENOENT') {
    console.error(`   ❌ Settings directory not found at: ${join(homedir(), '.claude')}`);
  } else {
    console.error(`   ❌ Plugin enablement failed (${error.code || 'unknown'}). See error details above.`);
  }
  console.error(`   [Debug] ${error.message}`);
  process.exit(1);
}

// Final success message
console.log('\n' + '═'.repeat(60));
console.log('✅ Plugin installation complete!');
console.log('═'.repeat(60));

console.log('\n📦 Plugin structure:');
console.log('   .claude-plugin/memesh/');
console.log('   ├── .claude-plugin/');
console.log('   │   └── plugin.json       ← Plugin metadata');
console.log('   ├── .mcp.json             ← MCP server config');
console.log('   ├── dist/                 ← Build output');
console.log('   ├── node_modules/         ← Dependencies');
console.log('   ├── package.json');
console.log('   └── scripts/');

console.log('\n🎯 Plugin Registration:');
console.log('   ✅ Marketplace: pcircle-ai');
console.log('   ✅ Symlink: ~/.claude/plugins/marketplaces/pcircle-ai');
console.log('   ✅ Enabled: memesh@pcircle-ai');

console.log('\n🔧 MCP Configuration:');
if (mcpSettingsConfigured) {
  console.log(`   ✅ Auto-configured at: ${mcpSettingsPath}`);
} else {
  console.log('   ⚠️  Manual configuration required');
  console.log(`   Add memesh entry to: ${mcpSettingsPath}`);
}

console.log('\n🚀 Next Steps:');
console.log('   1. Restart Claude Code completely (quit and reopen)');
console.log('   2. Verify: Check for memesh tools in available tools list');
console.log('   3. Test: Run "buddy-help" command');

console.log('\n💡 Troubleshooting:');
console.log('   - If tools not showing: Check ~/.claude/plugins/known_marketplaces.json');
console.log('   - If MCP not loading: Check ~/.claude/mcp_settings.json');
console.log('   - If plugin disabled: Check ~/.claude/settings.json enabledPlugins');

console.log('\n📝 Note: This is a local dev installation.');
console.log('   For production, users should install via: npm install -g @pcircle/memesh');
console.log('');
