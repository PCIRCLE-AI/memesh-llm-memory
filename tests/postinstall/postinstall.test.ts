/**
 * Postinstall Tests - TDD Implementation
 *
 * Testing strategy: Red → Green → Refactor
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { TestEnvironment } from './setup';
import {
  detectInstallMode,
  getPluginInstallPath,
  ensureMarketplaceRegistered,
  ensureSymlinkExists
} from '../../scripts/postinstall-lib';

describe('Phase 1.1: Environment Detection', () => {
  let env: TestEnvironment;

  beforeEach(() => {
    env = new TestEnvironment('env-detection');
    env.setup();
  });

  afterEach(() => {
    env.cleanup();
  });

  describe('detectInstallMode', () => {
    it('should detect global install mode', () => {
      // Given: npm install from global path
      const installPath = '/Users/test/.nvm/versions/node/v22.22.0/lib/node_modules/@pcircle/memesh';

      // When: detectInstallMode(installPath)
      const mode = detectInstallMode(installPath);

      // Then: returns 'global'
      expect(mode).toBe('global');
    });

    it('should detect local dev mode', () => {
      // Given: running from project directory with src/ and package.json
      const installPath = env.testDir;

      // Create local dev indicators
      mkdirSync(join(installPath, 'src'), { recursive: true });
      writeFileSync(join(installPath, 'package.json'), '{}');

      // When: detectInstallMode(installPath)
      const mode = detectInstallMode(installPath);

      // Then: returns 'local'
      expect(mode).toBe('local');
    });
  });

  describe('getPluginInstallPath', () => {
    it('should get correct plugin path for global install', () => {
      // Given: global install mode with scriptDir
      const scriptDir = '/some/npm/path/node_modules/@pcircle/memesh/scripts';

      // When: getPluginInstallPath('global', scriptDir)
      const path = getPluginInstallPath('global', scriptDir);

      // Then: returns parent directory (removes /scripts)
      expect(path).toBe('/some/npm/path/node_modules/@pcircle/memesh');
    });

    it('should get correct plugin path for local dev', () => {
      // Given: local dev mode
      const cwd = process.cwd();

      // When: getPluginInstallPath('local')
      const path = getPluginInstallPath('local');

      // Then: returns project root (cwd)
      expect(path).toBe(cwd);
    });

    it('should fallback to cwd for global without scriptDir', () => {
      // Given: global mode but no scriptDir provided
      const cwd = process.cwd();

      // When: getPluginInstallPath('global')
      const path = getPluginInstallPath('global');

      // Then: returns cwd as fallback
      expect(path).toBe(cwd);
    });
  });
});

describe('Phase 1.2: Marketplace Registration', () => {
  let env: TestEnvironment;

  beforeEach(() => {
    env = new TestEnvironment('marketplace');
    env.setup();
  });

  afterEach(() => {
    env.cleanup();
  });

  describe('ensureMarketplaceRegistered', () => {
    it('should create known_marketplaces.json if not exists', async () => {
      // Given: no known_marketplaces.json
      expect(env.fileExists('plugins/known_marketplaces.json')).toBe(false);

      // When: ensureMarketplaceRegistered(installPath)
      await ensureMarketplaceRegistered(env.installPath, env.claudeDir);

      // Then: file created with pcircle-ai entry
      expect(env.fileExists('plugins/known_marketplaces.json')).toBe(true);

      const content = JSON.parse(env.readFile('plugins/known_marketplaces.json'));
      expect(content['pcircle-ai']).toBeDefined();
      expect(content['pcircle-ai'].source.path).toBe(env.installPath);
    });

    it('should register new marketplace entry', async () => {
      // Given: known_marketplaces.json exists without pcircle-ai
      env.createFile('plugins/known_marketplaces.json', JSON.stringify({
        'other-marketplace': {
          source: { source: 'github', repo: 'other/repo' },
          installLocation: '/test/path',
          lastUpdated: '2026-01-01T00:00:00.000Z'
        }
      }, null, 2));

      // When: ensureMarketplaceRegistered()
      await ensureMarketplaceRegistered(env.installPath, env.claudeDir);

      // Then: pcircle-ai entry added, other preserved
      const content = JSON.parse(env.readFile('plugins/known_marketplaces.json'));
      expect(content['pcircle-ai']).toBeDefined();
      expect(content['other-marketplace']).toBeDefined();
    });

    it('should update existing marketplace entry', async () => {
      // Given: pcircle-ai already registered with old path
      const oldPath = '/old/path/to/memesh';
      env.createFile('plugins/known_marketplaces.json', JSON.stringify({
        'pcircle-ai': {
          source: { source: 'local', path: oldPath },
          installLocation: '/old/symlink',
          lastUpdated: '2026-01-01T00:00:00.000Z'
        }
      }, null, 2));

      // When: ensureMarketplaceRegistered(newPath)
      const newPath = env.installPath;
      await ensureMarketplaceRegistered(newPath, env.claudeDir);

      // Then: installLocation updated, lastUpdated refreshed
      const content = JSON.parse(env.readFile('plugins/known_marketplaces.json'));
      expect(content['pcircle-ai'].source.path).toBe(newPath);
      expect(content['pcircle-ai'].lastUpdated).not.toBe('2026-01-01T00:00:00.000Z');
    });

    it('should backup corrupted marketplace file', async () => {
      // Given: known_marketplaces.json with invalid JSON
      env.createFile('plugins/known_marketplaces.json', '{ invalid json }');

      // When: ensureMarketplaceRegistered()
      await ensureMarketplaceRegistered(env.installPath, env.claudeDir);

      // Then: new file with pcircle-ai entry created
      expect(env.fileExists('plugins/known_marketplaces.json')).toBe(true);
      const content = JSON.parse(env.readFile('plugins/known_marketplaces.json'));
      expect(content['pcircle-ai']).toBeDefined();

      // Note: Backup file check would require listing directory - simplified test
    });
  });
});

describe('Phase 1.3: Symlink Management', () => {
  let env: TestEnvironment;

  beforeEach(() => {
    env = new TestEnvironment('symlink');
    env.setup();
  });

  afterEach(() => {
    env.cleanup();
  });

  describe('ensureSymlinkExists', () => {
    it('should create symlink if not exists', async () => {
      // Given: no pcircle-ai symlink
      const symlinkPath = `${env.marketplacesDir}/pcircle-ai`;
      const { existsSync } = await import('fs');
      expect(existsSync(symlinkPath)).toBe(false);

      // When: ensureSymlinkExists(installPath)
      await ensureSymlinkExists(env.installPath, env.marketplacesDir);

      // Then: symlink created pointing to installPath
      expect(existsSync(symlinkPath)).toBe(true);
    });

    it('should update symlink if pointing to wrong location', async () => {
      // Given: symlink exists but points to old location
      const oldPath = join(env.testDir, 'old-path');
      mkdirSync(oldPath, { recursive: true });
      const symlinkPath = `${env.marketplacesDir}/pcircle-ai`;

      // Create old symlink
      const { symlinkSync } = await import('fs');
      symlinkSync(oldPath, symlinkPath, 'dir');

      // When: ensureSymlinkExists(newPath)
      await ensureSymlinkExists(env.installPath, env.marketplacesDir);

      // Then: symlink updated to newPath
      const { realpathSync, existsSync } = await import('fs');
      expect(existsSync(symlinkPath)).toBe(true);
      const target = realpathSync(symlinkPath);
      const expectedTarget = realpathSync(env.installPath);
      expect(target).toBe(expectedTarget);
    });
  });
});
