#!/usr/bin/env node

/**
 * Prepare Plugin Directory for Claude Code Installation
 *
 * This script prepares the .claude-plugin directory structure so the plugin
 * can be installed and used immediately after cloning the repository.
 *
 * Steps:
 * 1. Copy compiled dist/ to .claude-plugin/claude-code-buddy/dist/
 * 2. Copy package.json to .claude-plugin/claude-code-buddy/
 * 3. Install production dependencies in .claude-plugin/claude-code-buddy/
 */

import { copyFileSync, cpSync, existsSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const pluginDir = join(projectRoot, '.claude-plugin', 'claude-code-buddy');

console.log('🔧 Preparing plugin directory for Claude Code installation...\n');

// Step 1: Ensure plugin directory exists
console.log('1️⃣ Creating plugin directory structure...');
if (!existsSync(pluginDir)) {
  mkdirSync(pluginDir, { recursive: true });
  console.log('   ✅ Created: .claude-plugin/claude-code-buddy/');
} else {
  console.log('   ✅ Directory exists: .claude-plugin/claude-code-buddy/');
}

// Step 2: Copy compiled dist/ to plugin directory
console.log('\n2️⃣ Copying compiled dist/ to plugin directory...');
const sourceDist = join(projectRoot, 'dist');
const targetDist = join(pluginDir, 'dist');

if (!existsSync(sourceDist)) {
  console.error('   ❌ Error: dist/ directory not found. Please run "npm run build" first.');
  process.exit(1);
}

try {
  cpSync(sourceDist, targetDist, { recursive: true });
  console.log('   ✅ Copied dist/ → .claude-plugin/claude-code-buddy/dist/');
} catch (error) {
  console.error('   ❌ Error copying dist/:', error.message);
  process.exit(1);
}

// Step 3: Copy package.json to plugin directory
console.log('\n3️⃣ Copying package.json to plugin directory...');
const sourcePackageJson = join(projectRoot, 'package.json');
const targetPackageJson = join(pluginDir, 'package.json');

try {
  copyFileSync(sourcePackageJson, targetPackageJson);
  console.log('   ✅ Copied package.json → .claude-plugin/claude-code-buddy/');
} catch (error) {
  console.error('   ❌ Error copying package.json:', error.message);
  process.exit(1);
}

// Step 4: Copy plugin.json to plugin directory
console.log('\n4️⃣ Copying plugin.json to plugin directory...');
const pluginJsonCandidates = [
  join(projectRoot, 'plugin.json'),
  join(projectRoot, '.claude-plugin', 'plugin.json'),
];
const sourcePluginJson = pluginJsonCandidates.find((candidate) => existsSync(candidate));
const targetPluginJson = join(pluginDir, 'plugin.json');

if (!sourcePluginJson) {
  console.error('   ❌ Error: plugin.json not found. Please create it at project root.');
  process.exit(1);
}

try {
  copyFileSync(sourcePluginJson, targetPluginJson);
  console.log('   ✅ Copied plugin.json → .claude-plugin/claude-code-buddy/');
} catch (error) {
  console.error('   ❌ Error copying plugin.json:', error.message);
  process.exit(1);
}

// Step 5: Install production dependencies
console.log('\n5️⃣ Installing production dependencies in plugin directory...');
console.log('   (This may take a minute...)');

try {
  execSync('npm install --production --loglevel=error', {
    cwd: pluginDir,
    stdio: 'inherit'
  });
  console.log('   ✅ Dependencies installed successfully');
} catch (error) {
  console.error('   ❌ Error installing dependencies:', error.message);
  process.exit(1);
}

// Step 6: Verify the plugin structure
console.log('\n6️⃣ Verifying plugin structure...');

const requiredFiles = [
  join(pluginDir, 'dist', 'mcp', 'server.js'),
  join(pluginDir, 'package.json'),
  join(pluginDir, 'node_modules'),
  join(pluginDir, 'plugin.json')
];

let allFilesExist = true;
for (const file of requiredFiles) {
  if (existsSync(file)) {
    console.log(`   ✅ ${file.replace(pluginDir + '/', '')}`);
  } else {
    console.error(`   ❌ Missing: ${file.replace(pluginDir + '/', '')}`);
    allFilesExist = false;
  }
}

if (!allFilesExist) {
  console.error('\n❌ Plugin preparation incomplete. Please check errors above.');
  process.exit(1);
}

// Step 7: Auto-register MCP server for local development
console.log('\n7️⃣ Registering MCP server in Claude Code...');

const mcpServerPath = join(pluginDir, 'dist', 'mcp', 'server.js');
const mcpServerName = 'claude-code-buddy';

try {
  // Check if MCP server is already registered
  let mcpList;
  try {
    mcpList = execSync('claude mcp list', { encoding: 'utf-8' });
  } catch (error) {
    console.log('   ⚠️  Could not check existing MCP servers');
    mcpList = '';
  }

  if (mcpList.includes(mcpServerName)) {
    console.log(`   ⚠️  MCP server '${mcpServerName}' already registered, removing...`);
    try {
      execSync(`claude mcp remove ${mcpServerName}`, { stdio: 'ignore' });
      console.log(`   ✅ Removed existing MCP server`);
    } catch (error) {
      console.log('   ⚠️  Could not remove existing server, continuing...');
    }
  }

  // Register the MCP server with environment variable
  console.log(`   📝 Registering MCP server: ${mcpServerName}`);
  execSync(
    `claude mcp add ${mcpServerName} --scope user -e NODE_ENV=production -- node "${mcpServerPath}"`,
    { stdio: 'inherit' }
  );
  console.log(`   ✅ MCP server registered successfully`);
} catch (error) {
  console.log('\n⚠️  MCP server registration failed:');
  console.log('   This might be expected if claude CLI is not available.');
  console.log('   You can manually register the MCP server later with:');
  console.log(`   claude mcp add --scope user -e NODE_ENV=production ${mcpServerName} -- node "${mcpServerPath}"`);
}

// Final success message
console.log('\n✅ Plugin directory prepared successfully!');
console.log('\n📦 The plugin is now ready to be installed in Claude Code.');
console.log('\nTo install:');
console.log('  1. Add this directory as a local plugin marketplace');
console.log('  2. Or use: claude plugin add pcircle-ai/claude-code-buddy@local');
console.log('  3. Or copy .claude-plugin/ to ~/.claude/plugins/cache/');
console.log('\n🔧 MCP Server:');
console.log(`  - Server name: ${mcpServerName}`);
console.log(`  - Status: Check with 'claude mcp list'`);
