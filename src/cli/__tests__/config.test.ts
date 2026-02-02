/**
 * Tests for Configuration Management Module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { ConfigManager } from '../config.js';

describe('ConfigManager', () => {
  describe('getConfigPath', () => {
    it('should return macOS path on darwin platform', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'darwin',
        writable: true,
      });

      const configPath = ConfigManager.getConfigPath();
      expect(configPath).toContain('Library/Application Support/Claude');

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        writable: true,
      });
    });

    it('should return Windows path on win32 platform', () => {
      const originalPlatform = process.platform;
      Object.defineProperty(process, 'platform', {
        value: 'win32',
        writable: true,
      });

      const configPath = ConfigManager.getConfigPath();
      expect(configPath).toContain('Claude');

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
        writable: true,
      });
    });
  });

  describe('getConfigPathDescription', () => {
    it('should return readable path description', () => {
      const description = ConfigManager.getConfigPathDescription();
      expect(description).toContain('Claude');
      expect(description).toContain('claude_desktop_config.json');
    });
  });

  describe('validateConfig', () => {
    const testConfigPath = path.join(os.tmpdir(), 'test-claude-config.json');

    beforeEach(async () => {
      // Clean up any existing test config
      if (await fs.pathExists(testConfigPath)) {
        await fs.remove(testConfigPath);
      }
    });

    afterEach(async () => {
      // Clean up test config
      if (await fs.pathExists(testConfigPath)) {
        await fs.remove(testConfigPath);
      }
    });

    it('should detect missing config file', async () => {
      // Mock getConfigPath to return test path
      vi.spyOn(ConfigManager, 'getConfigPath').mockReturnValue(testConfigPath);

      const result = await ConfigManager.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Configuration file does not exist');
    });

    it('should detect invalid JSON', async () => {
      // Write invalid JSON
      await fs.writeFile(testConfigPath, '{ invalid json }');
      vi.spyOn(ConfigManager, 'getConfigPath').mockReturnValue(testConfigPath);

      const result = await ConfigManager.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Invalid JSON syntax');
    });

    it('should detect missing memesh server', async () => {
      // Write config without memesh
      await fs.writeJSON(testConfigPath, {
        mcpServers: {
          other: {
            command: 'node',
            args: ['test'],
          },
        },
      });
      vi.spyOn(ConfigManager, 'getConfigPath').mockReturnValue(testConfigPath);

      const result = await ConfigManager.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('MeMesh MCP server not configured');
    });

    it('should validate correct memesh config', async () => {
      // Write valid config
      await fs.writeJSON(testConfigPath, {
        mcpServers: {
          memesh: {
            command: 'node',
            args: ['/path/to/memesh'],
          },
        },
      });
      vi.spyOn(ConfigManager, 'getConfigPath').mockReturnValue(testConfigPath);

      const result = await ConfigManager.validateConfig();

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should warn about missing command field', async () => {
      // Write config with missing command
      await fs.writeJSON(testConfigPath, {
        mcpServers: {
          memesh: {
            args: ['/path/to/memesh'],
          },
        },
      });
      vi.spyOn(ConfigManager, 'getConfigPath').mockReturnValue(testConfigPath);

      const result = await ConfigManager.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('MeMesh server: missing "command" field');
    });

    it('should warn about invalid args field', async () => {
      // Write config with invalid args
      await fs.writeJSON(testConfigPath, {
        mcpServers: {
          memesh: {
            command: 'node',
            args: 'not-an-array',
          },
        },
      });
      vi.spyOn(ConfigManager, 'getConfigPath').mockReturnValue(testConfigPath);

      const result = await ConfigManager.validateConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'MeMesh server: missing or invalid "args" field'
      );
    });
  });

  describe('generateDefaultConfig', () => {
    it('should generate valid default config', () => {
      const config = ConfigManager.generateDefaultConfig();

      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers.memesh).toBeDefined();
      expect(config.mcpServers.memesh.command).toBe('node');
      expect(config.mcpServers.memesh.args).toBeInstanceOf(Array);
      expect(config.mcpServers.memesh.args.length).toBeGreaterThan(0);
    });
  });

  describe('highlightJSON', () => {
    it('should return formatted JSON string', () => {
      const obj = {
        test: 'value',
        number: 123,
        boolean: true,
        null: null,
      };

      const highlighted = ConfigManager.highlightJSON(obj);

      expect(highlighted).toContain('test');
      expect(highlighted).toContain('value');
      expect(highlighted).toContain('123');
      expect(highlighted).toContain('true');
      expect(highlighted).toContain('null');
    });

    it('should handle nested objects', () => {
      const obj = {
        mcpServers: {
          memesh: {
            command: 'node',
            args: ['test'],
          },
        },
      };

      const highlighted = ConfigManager.highlightJSON(obj);

      expect(highlighted).toContain('mcpServers');
      expect(highlighted).toContain('memesh');
      expect(highlighted).toContain('command');
      expect(highlighted).toContain('node');
    });
  });

  describe('readConfig', () => {
    const testConfigPath = path.join(os.tmpdir(), 'test-read-config.json');

    beforeEach(async () => {
      if (await fs.pathExists(testConfigPath)) {
        await fs.remove(testConfigPath);
      }
    });

    afterEach(async () => {
      if (await fs.pathExists(testConfigPath)) {
        await fs.remove(testConfigPath);
      }
    });

    it('should return null for non-existent config', async () => {
      vi.spyOn(ConfigManager, 'getConfigPath').mockReturnValue(testConfigPath);

      const config = await ConfigManager.readConfig();

      expect(config).toBeNull();
    });

    it('should read and parse valid config', async () => {
      const testConfig = {
        mcpServers: {
          memesh: {
            command: 'node',
            args: ['test'],
          },
        },
      };

      await fs.writeJSON(testConfigPath, testConfig);
      vi.spyOn(ConfigManager, 'getConfigPath').mockReturnValue(testConfigPath);

      const config = await ConfigManager.readConfig();

      expect(config).toEqual(testConfig);
    });

    it('should return null for invalid JSON', async () => {
      await fs.writeFile(testConfigPath, '{ invalid }');
      vi.spyOn(ConfigManager, 'getConfigPath').mockReturnValue(testConfigPath);

      const config = await ConfigManager.readConfig();

      expect(config).toBeNull();
    });
  });

  describe('writeConfig', () => {
    const testConfigPath = path.join(os.tmpdir(), 'test-write-config.json');

    beforeEach(async () => {
      if (await fs.pathExists(testConfigPath)) {
        await fs.remove(testConfigPath);
      }
    });

    afterEach(async () => {
      if (await fs.pathExists(testConfigPath)) {
        await fs.remove(testConfigPath);
      }
    });

    it('should write config successfully', async () => {
      const testConfig = {
        mcpServers: {
          memesh: {
            command: 'node',
            args: ['test'],
          },
        },
      };

      vi.spyOn(ConfigManager, 'getConfigPath').mockReturnValue(testConfigPath);

      const success = await ConfigManager.writeConfig(testConfig);

      expect(success).toBe(true);
      expect(await fs.pathExists(testConfigPath)).toBe(true);

      const written = await fs.readJSON(testConfigPath);
      expect(written).toEqual(testConfig);
    });

    it('should create directory if needed', async () => {
      const nestedPath = path.join(
        os.tmpdir(),
        'nested/dir/test-config.json'
      );

      vi.spyOn(ConfigManager, 'getConfigPath').mockReturnValue(nestedPath);

      const testConfig = { mcpServers: {} };
      const success = await ConfigManager.writeConfig(testConfig);

      expect(success).toBe(true);
      expect(await fs.pathExists(nestedPath)).toBe(true);

      // Cleanup
      await fs.remove(path.join(os.tmpdir(), 'nested'));
    });
  });

  describe('backupConfig', () => {
    const testConfigPath = path.join(os.tmpdir(), 'test-backup-config.json');

    beforeEach(async () => {
      if (await fs.pathExists(testConfigPath)) {
        await fs.remove(testConfigPath);
      }
    });

    afterEach(async () => {
      // Cleanup all backup files
      const dir = path.dirname(testConfigPath);
      const files = await fs.readdir(dir);
      for (const file of files) {
        if (file.includes('test-backup-config')) {
          await fs.remove(path.join(dir, file));
        }
      }
    });

    it('should return null for non-existent config', async () => {
      vi.spyOn(ConfigManager, 'getConfigPath').mockReturnValue(testConfigPath);

      const backupPath = await ConfigManager.backupConfig();

      expect(backupPath).toBeNull();
    });

    it('should create backup with timestamp', async () => {
      await fs.writeJSON(testConfigPath, { test: 'data' });
      vi.spyOn(ConfigManager, 'getConfigPath').mockReturnValue(testConfigPath);

      const backupPath = await ConfigManager.backupConfig();

      expect(backupPath).not.toBeNull();
      expect(backupPath).toContain('backup-');
      expect(await fs.pathExists(backupPath!)).toBe(true);

      const backupContent = await fs.readJSON(backupPath!);
      expect(backupContent).toEqual({ test: 'data' });
    });
  });
});
