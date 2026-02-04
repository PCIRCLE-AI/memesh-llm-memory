/**
 * Tests for Configuration Management Module
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
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
    let testTempDir: string;
    let testConfigPath: string;

    beforeEach(async () => {
      // Create unique temporary directory for test isolation
      testTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccb-config-test-'));
      testConfigPath = path.join(testTempDir, `config-${crypto.randomUUID()}.json`);
    });

    afterEach(async () => {
      // Clean up entire temporary directory
      if (testTempDir && await fs.pathExists(testTempDir)) {
        await fs.remove(testTempDir);
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
    let testTempDir: string;
    let testConfigPath: string;

    beforeEach(async () => {
      // Create unique temporary directory for test isolation
      testTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccb-read-config-test-'));
      testConfigPath = path.join(testTempDir, `config-${crypto.randomUUID()}.json`);
    });

    afterEach(async () => {
      // Clean up entire temporary directory
      if (testTempDir && await fs.pathExists(testTempDir)) {
        await fs.remove(testTempDir);
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
    let testTempDir: string;
    let testConfigPath: string;

    beforeEach(async () => {
      // Create unique temporary directory for test isolation
      testTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccb-write-config-test-'));
      testConfigPath = path.join(testTempDir, `config-${crypto.randomUUID()}.json`);
    });

    afterEach(async () => {
      // Clean up entire temporary directory
      if (testTempDir && await fs.pathExists(testTempDir)) {
        await fs.remove(testTempDir);
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
      // Use the already-created unique temp directory for nested path test
      const nestedPath = path.join(
        testTempDir,
        'nested',
        'dir',
        `config-${crypto.randomUUID()}.json`
      );

      vi.spyOn(ConfigManager, 'getConfigPath').mockReturnValue(nestedPath);

      const testConfig = { mcpServers: {} };
      const success = await ConfigManager.writeConfig(testConfig);

      expect(success).toBe(true);
      expect(await fs.pathExists(nestedPath)).toBe(true);
      // Cleanup handled by afterEach removing testTempDir
    });
  });

  describe('backupConfig', () => {
    let testTempDir: string;
    let testConfigPath: string;

    beforeEach(async () => {
      // Create unique temporary directory for test isolation
      testTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ccb-backup-config-test-'));
      testConfigPath = path.join(testTempDir, `config-${crypto.randomUUID()}.json`);
    });

    afterEach(async () => {
      // Clean up entire temporary directory (includes all backup files)
      if (testTempDir && await fs.pathExists(testTempDir)) {
        await fs.remove(testTempDir);
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
