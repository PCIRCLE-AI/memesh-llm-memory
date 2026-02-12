/**
 * Integration Tests - End-to-End Scenarios
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestEnvironment } from './setup';
import {
  detectInstallMode,
  ensureMarketplaceRegistered,
  ensureSymlinkExists,
  ensurePluginEnabled,
  ensureMCPConfigured,
  detectAndFixLegacyInstall
} from '../../scripts/postinstall-lib';

describe('Integration: Plugin Enablement', () => {
  let env: TestEnvironment;

  beforeEach(() => {
    env = new TestEnvironment('plugin-enable');
    env.setup();
  });

  afterEach(() => {
    env.cleanup();
  });

  it('should create settings.json and enable plugin', async () => {
    // Given: no settings.json
    expect(env.fileExists('settings.json')).toBe(false);

    // When: ensurePluginEnabled()
    await ensurePluginEnabled(env.claudeDir);

    // Then: settings.json created with memesh enabled
    expect(env.fileExists('settings.json')).toBe(true);
    const settings = JSON.parse(env.readFile('settings.json'));
    expect(settings.enabledPlugins['memesh@pcircle-ai']).toBe(true);
  });

  it('should preserve other plugins when enabling', async () => {
    // Given: settings.json with other plugins
    env.createFile('settings.json', JSON.stringify({
      enabledPlugins: {
        'other-plugin@marketplace': true
      },
      otherSettings: 'value'
    }, null, 2));

    // When: ensurePluginEnabled()
    await ensurePluginEnabled(env.claudeDir);

    // Then: memesh enabled, others preserved
    const settings = JSON.parse(env.readFile('settings.json'));
    expect(settings.enabledPlugins['memesh@pcircle-ai']).toBe(true);
    expect(settings.enabledPlugins['other-plugin@marketplace']).toBe(true);
    expect(settings.otherSettings).toBe('value');
  });
});

describe('Integration: MCP Configuration', () => {
  let env: TestEnvironment;

  beforeEach(() => {
    env = new TestEnvironment('mcp-config');
    env.setup();
  });

  afterEach(() => {
    env.cleanup();
  });

  it('should configure MCP for global install', async () => {
    // Given: global install mode
    const mode = 'global';

    // When: ensureMCPConfigured()
    await ensureMCPConfigured(env.installPath, mode, env.claudeDir);

    // Then: MCP configured with npx
    const config = JSON.parse(env.readFile('mcp_settings.json'));
    expect(config.mcpServers.memesh.command).toBe('npx');
    expect(config.mcpServers.memesh.args).toContain('@pcircle/memesh');
  });

  it('should configure MCP for local dev', async () => {
    // Given: local dev mode
    const mode = 'local';

    // When: ensureMCPConfigured()
    await ensureMCPConfigured(env.installPath, mode, env.claudeDir);

    // Then: MCP configured with node + absolute path
    const config = JSON.parse(env.readFile('mcp_settings.json'));
    expect(config.mcpServers.memesh.command).toBe('node');
    expect(config.mcpServers.memesh.args[0]).toContain('server-bootstrap.js');
  });

  it('should remove legacy claude-code-buddy entry', async () => {
    // Given: MCP config with legacy entry
    env.createFile('mcp_settings.json', JSON.stringify({
      mcpServers: {
        'claude-code-buddy': {
          command: 'node',
          args: ['/old/path']
        }
      }
    }, null, 2));

    // When: ensureMCPConfigured()
    await ensureMCPConfigured(env.installPath, 'local', env.claudeDir);

    // Then: legacy removed, memesh added
    const config = JSON.parse(env.readFile('mcp_settings.json'));
    expect(config.mcpServers['claude-code-buddy']).toBeUndefined();
    expect(config.mcpServers.memesh).toBeDefined();
  });
});

describe('Integration: Backward Compatibility', () => {
  let env: TestEnvironment;

  beforeEach(() => {
    env = new TestEnvironment('backward-compat');
    env.setup();
  });

  afterEach(() => {
    env.cleanup();
  });

  it('should detect v2.8.4 legacy installation', async () => {
    // Given: v2.8.4 setup (MCP but no marketplace)
    env.setupLegacyV284();

    // When: detectAndFixLegacyInstall()
    const result = await detectAndFixLegacyInstall(env.installPath, env.claudeDir);

    // Then: fixed
    expect(result).toBe('fixed');

    // Verify marketplace registered
    expect(env.fileExists('plugins/known_marketplaces.json')).toBe(true);
    const marketplaces = JSON.parse(env.readFile('plugins/known_marketplaces.json'));
    expect(marketplaces['pcircle-ai']).toBeDefined();
  });

  it('should not modify correct v2.8.5 installation', async () => {
    // Given: correct v2.8.5 setup
    env.setupCorrectV285();

    // When: detectAndFixLegacyInstall()
    const result = await detectAndFixLegacyInstall(env.installPath, env.claudeDir);

    // Then: returns ok, no changes
    expect(result).toBe('ok');
  });
});

describe('Integration: Complete Installation Flow (E2E)', () => {
  let env: TestEnvironment;

  beforeEach(() => {
    env = new TestEnvironment('e2e');
    env.setup();
  });

  afterEach(() => {
    env.cleanup();
  });

  it('should complete fresh installation successfully', async () => {
    // Given: clean system (no ~/.claude setup)
    const mode = detectInstallMode(env.installPath);
    const installPath = env.installPath;

    // When: run complete installation
    await ensureMarketplaceRegistered(installPath, env.claudeDir);
    await ensureSymlinkExists(installPath, env.marketplacesDir);
    await ensurePluginEnabled(env.claudeDir);
    await ensureMCPConfigured(installPath, mode, env.claudeDir);

    // Then: all components configured correctly
    // 1. Marketplace registered
    const marketplaces = JSON.parse(env.readFile('plugins/known_marketplaces.json'));
    expect(marketplaces['pcircle-ai']).toBeDefined();

    // 2. Symlink created
    const { existsSync } = await import('fs');
    expect(existsSync(`${env.marketplacesDir}/pcircle-ai`)).toBe(true);

    // 3. Plugin enabled
    const settings = JSON.parse(env.readFile('settings.json'));
    expect(settings.enabledPlugins['memesh@pcircle-ai']).toBe(true);

    // 4. MCP configured
    const mcp = JSON.parse(env.readFile('mcp_settings.json'));
    expect(mcp.mcpServers.memesh).toBeDefined();
  });

  it('should upgrade from v2.8.4 successfully', async () => {
    // Given: v2.8.4 installation
    env.setupLegacyV284();

    // When: run upgrade (detectAndFix)
    await detectAndFixLegacyInstall(env.installPath, env.claudeDir);

    // Then: all issues fixed
    const marketplaces = JSON.parse(env.readFile('plugins/known_marketplaces.json'));
    expect(marketplaces['pcircle-ai']).toBeDefined();

    const settings = JSON.parse(env.readFile('settings.json'));
    expect(settings.enabledPlugins['memesh@pcircle-ai']).toBe(true);
  });
});
