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

import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

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

// Step 5.6: Inject A2A token from .env into .mcp.json
console.log('\n5.6️⃣ Configuring A2A token in .mcp.json...');
try {
  // Read .env file
  const envPath = join(projectRoot, '.env');
  let a2aToken = null;

  if (existsSync(envPath)) {
    const envContent = readFileSync(envPath, 'utf-8');
    const tokenMatch = envContent.match(/^MEMESH_A2A_TOKEN=(.+)$/m);

    if (tokenMatch && tokenMatch[1]) {
      a2aToken = tokenMatch[1].trim();
    }
  }

  if (a2aToken) {
    // Read .mcp.json
    const mcpJsonContent = readFileSync(targetMcpJson, 'utf-8');
    const mcpConfig = JSON.parse(mcpJsonContent);

    // Inject token into env section
    if (mcpConfig.memesh) {
      if (!mcpConfig.memesh.env) {
        mcpConfig.memesh.env = {};
      }

      mcpConfig.memesh.env.MEMESH_A2A_TOKEN = a2aToken;

      // Write back to .mcp.json
      writeFileSync(targetMcpJson, JSON.stringify(mcpConfig, null, 2), 'utf-8');
      console.log('   ✅ A2A token configured in .mcp.json');
      console.log(`   🔑 Token: ${a2aToken.substring(0, 8)}...${a2aToken.substring(a2aToken.length - 8)}`);
    } else {
      console.log('   ⚠️  Could not find memesh configuration in .mcp.json');
    }
  } else {
    console.log('   ⚠️  MEMESH_A2A_TOKEN not found in .env file');
    console.log('   💡 Run: bash scripts/generate-a2a-token.sh');
  }
} catch (error) {
  console.log('   ⚠️  Could not inject A2A token:', error.message);
  console.log('   You may need to manually add MEMESH_A2A_TOKEN to .mcp.json');
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
const mcpServerName = 'memesh';
const mcpSettingsPath = join(homedir(), '.claude', 'mcp_settings.json');
let mcpSettingsConfigured = false;

// Read A2A token
let a2aToken = null;
const envPath = join(projectRoot, '.env');
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, 'utf-8');
  const tokenMatch = envContent.match(/^MEMESH_A2A_TOKEN=(.+)$/m);
  if (tokenMatch && tokenMatch[1]) {
    a2aToken = tokenMatch[1].trim();
  }
}

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
      console.log('   ⚠️  Could not parse existing config, creating new one');
      mcpConfig = { mcpServers: {} };
    }
  }

  // Configure memesh entry with absolute path (for local dev)
  const serverConfig = {
    command: 'node',
    args: [mcpServerPath],
    env: {
      NODE_ENV: 'production'
    }
  };

  // Add A2A token if available
  if (a2aToken) {
    serverConfig.env.MEMESH_A2A_TOKEN = a2aToken;
  }

  mcpConfig.mcpServers.memesh = serverConfig;

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
  if (a2aToken) {
    console.log(`   🔑 A2A token: ${a2aToken.substring(0, 8)}...${a2aToken.substring(a2aToken.length - 8)}`);
  }
} catch (error) {
  console.log(`   ⚠️  Could not configure MCP settings: ${error.message}`);
  console.log('   You may need to manually configure ~/.claude/mcp_settings.json');
}

// Final success message
console.log('\n' + '═'.repeat(60));
console.log('✅ Plugin directory prepared successfully!');
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

console.log('\n🔧 MCP Configuration:');
if (mcpSettingsConfigured) {
  console.log(`   ✅ Auto-configured at: ${mcpSettingsPath}`);
  console.log('   ✅ MeMesh is ready to use!');
} else {
  console.log('   ⚠️  Manual configuration required');
  console.log(`   Add memesh entry to: ${mcpSettingsPath}`);
}

console.log('\n🚀 Next Steps:');
console.log('   1. Restart Claude Code completely (quit and reopen)');
console.log('   2. Test: Ask "List available MeMesh tools"');

console.log('\n🧪 Alternative: Test Plugin Locally:');
console.log(`   claude --plugin-dir "${pluginRootDir}"`);

console.log('\n📝 For Production: Push to GitHub and install via marketplace');
console.log('');
