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

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// Plugin directory structure (following superpowers pattern)
const pluginRootDir = join(projectRoot, '.claude-plugin', 'memesh');
const pluginMetadataDir = join(pluginRootDir, '.claude-plugin');

console.log('🔧 Preparing plugin directory for Claude Code installation...\n');

// Step 1: Create plugin directory structure
console.log('1️⃣ Creating plugin directory structure...');
if (!existsSync(pluginMetadataDir)) {
  mkdirSync(pluginMetadataDir, { recursive: true });
  console.log(`   ✅ Created: ${pluginRootDir.replace(projectRoot, '.')}`);
  console.log(`   ✅ Created: ${pluginMetadataDir.replace(projectRoot, '.')}`);
} else {
  console.log(`   ✅ Directory exists: ${pluginRootDir.replace(projectRoot, '.')}`);
}

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

// Step 5.5: Inject A2A token from .env into plugin.json
console.log('\n5.5️⃣ Configuring A2A token in plugin.json...');
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
    // Read plugin.json
    const pluginJsonContent = readFileSync(targetPluginJson, 'utf-8');
    const pluginConfig = JSON.parse(pluginJsonContent);

    // Inject token into env section
    if (pluginConfig.mcpServers && pluginConfig.mcpServers.memesh) {
      if (!pluginConfig.mcpServers.memesh.env) {
        pluginConfig.mcpServers.memesh.env = {};
      }

      pluginConfig.mcpServers.memesh.env.MEMESH_A2A_TOKEN = a2aToken;

      // Write back to plugin.json
      writeFileSync(targetPluginJson, JSON.stringify(pluginConfig, null, 2), 'utf-8');
      console.log('   ✅ A2A token configured in plugin.json');
      console.log(`   🔑 Token: ${a2aToken.substring(0, 8)}...${a2aToken.substring(a2aToken.length - 8)}`);
    } else {
      console.log('   ⚠️  Could not find mcpServers.memesh in plugin.json');
    }
  } else {
    console.log('   ⚠️  MEMESH_A2A_TOKEN not found in .env file');
    console.log('   💡 Run: bash scripts/generate-a2a-token.sh');
  }
} catch (error) {
  console.log('   ⚠️  Could not inject A2A token:', error.message);
  console.log('   You may need to manually add MEMESH_A2A_TOKEN to plugin.json');
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

// Step 8: Auto-register MCP server for local development
console.log('\n8️⃣ Registering MCP server in Claude Code...');

const mcpServerPath = join(pluginRootDir, 'dist', 'mcp', 'server-bootstrap.js');
const mcpServerName = 'memesh-mcp';

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

  // Register the MCP server with environment variables
  console.log(`   📝 Registering MCP server: ${mcpServerName}`);
  execSync(
    `claude mcp add ${mcpServerName} --scope user -e NODE_ENV=production -e MEMESH_DATA_DIR=/Users/ktseng/.memesh -e LOG_LEVEL=info -- node "${mcpServerPath}"`,
    { stdio: 'inherit' }
  );
  console.log(`   ✅ MCP server registered successfully`);
} catch (error) {
  console.log('\n⚠️  MCP server registration failed:');
  console.log('   This might be expected if claude CLI is not available.');
  console.log('   You can manually register the MCP server later with:');
  console.log(`   claude mcp add ${mcpServerName} --scope user -e NODE_ENV=production -e MEMESH_DATA_DIR=/Users/ktseng/.memesh -e LOG_LEVEL=info -- node "${mcpServerPath}"`);
}

// Final success message
console.log('\n✅ Plugin directory prepared successfully!');
console.log('\n📦 Plugin structure (following superpowers pattern):');
console.log('   .claude-plugin/memesh/');
console.log('   ├── .claude-plugin/');
console.log('   │   └── plugin.json       ← Plugin metadata');
console.log('   ├── dist/                 ← Build output');
console.log('   ├── node_modules/         ← Dependencies');
console.log('   ├── package.json');
console.log('   └── scripts/');
console.log('\n🔧 MCP Server:');
console.log(`  - Server name: ${mcpServerName}`);
console.log(`  - Status: Check with 'claude mcp list'`);
console.log('\n📝 Next: Restart Claude Code to activate the plugin');
