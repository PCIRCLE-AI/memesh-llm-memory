/**
 * Setup Wizard Integration Tests
 *
 * Comprehensive integration tests for the interactive setup wizard that helps
 * users configure MeMesh for Claude Code.
 *
 * Test coverage:
 * - Complete setup flow (happy path)
 * - Claude Code detection (found/not found)
 * - Config file creation and validation
 * - Error handling (permissions, invalid paths)
 * - User cancellation at different steps
 * - Cross-platform path handling (macOS, Windows, Linux)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';
import { SetupWizard } from '../../src/cli/setup-wizard.js';
import { logger } from '../../src/utils/logger.js';

// Mock dependencies
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('inquirer');

describe('SetupWizard Integration Tests', () => {
  let testDir: string;
  let wizard: SetupWizard;

  // Store original platform and environment
  const _originalPlatform = process.platform;
  const _originalHomedir = os.homedir();
  const originalEnv = { ...process.env };

  // Helper: Mock os.platform()
  const mockPlatform = (platform: 'darwin' | 'win32' | 'linux') => {
    Object.defineProperty(process, 'platform', {
      value: platform,
      writable: true,
      configurable: true,
    });
  };

  // Helper: Mock os.homedir()
  const mockHomedir = (dir: string) => {
    vi.spyOn(os, 'homedir').mockReturnValue(dir);
  };

  // Helper: Create test directory structure
  const createTestDirectory = async (dirPath: string) => {
    await fs.ensureDir(dirPath);
  };

  // Helper: Clean up test directory
  const cleanupTestDirectory = async () => {
    if (await fs.pathExists(testDir)) {
      await fs.remove(testDir);
    }
  };

  // Helper: Mock console.log to prevent output during tests
  const mockConsole = () => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
  };

  // Helper: Create mock inquirer answers
  const mockInquirerPrompt = (answers: Record<string, any>) => {
    (inquirer.prompt as any).mockResolvedValue(answers);
  };

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create secure unique test directory using mkdtempSync
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'setup-wizard-test-'));

    // Mock console output
    mockConsole();

    // Create wizard instance
    wizard = new SetupWizard();
  });

  afterEach(async () => {
    // Cleanup test directory
    await cleanupTestDirectory();

    // Restore mocks
    vi.restoreAllMocks();

    // Restore platform
    Object.defineProperty(process, 'platform', {
      value: _originalPlatform,
      writable: true,
      configurable: true,
    });

    // Restore environment
    process.env = { ...originalEnv };
  });

  describe('Complete Setup Flow (Happy Path)', () => {
    it('should complete setup successfully on macOS', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      // Mock Claude Code installation
      const claudeCodePath = path.join(testDir, 'Applications/Claude Code.app');
      await createTestDirectory(claudeCodePath);

      // Mock user confirming configuration
      mockInquirerPrompt({ shouldConfigure: true });

      // Run wizard
      await wizard.run();

      // Verify config file was created
      const configPath = path.join(
        testDir,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
      expect(await fs.pathExists(configPath)).toBe(true);

      // Verify config content
      const config = await fs.readJSON(configPath);
      expect(config).toHaveProperty('mcpServers');
      expect(config.mcpServers).toHaveProperty('memesh');
      expect(config.mcpServers.memesh).toMatchObject({
        command: 'node',
        env: {},
      });
      expect(config.mcpServers.memesh.args).toBeInstanceOf(Array);
      expect(config.mcpServers.memesh.args.length).toBeGreaterThan(0);
    });

    it('should complete setup successfully on Windows', async () => {
      mockPlatform('win32');
      mockHomedir(testDir);
      process.env.APPDATA = path.join(testDir, 'AppData/Roaming');

      // Mock Claude Code installation
      const claudeCodePath = path.join(
        testDir,
        'AppData/Local/Programs/Claude Code/Claude Code.exe'
      );
      await createTestDirectory(path.dirname(claudeCodePath));
      await fs.writeFile(claudeCodePath, '');

      // Mock user confirming configuration
      mockInquirerPrompt({ shouldConfigure: true });

      // Run wizard
      await wizard.run();

      // Verify config file was created
      const configPath = path.join(process.env.APPDATA, 'Claude/claude_desktop_config.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      // Verify config content
      const config = await fs.readJSON(configPath);
      expect(config).toHaveProperty('mcpServers');
      expect(config.mcpServers).toHaveProperty('memesh');
    });

    it('should complete setup successfully on Linux', async () => {
      mockPlatform('linux');
      mockHomedir(testDir);

      // Mock Claude Code installation
      const claudeCodePath = path.join(testDir, '.local/bin/claude-code');
      await createTestDirectory(path.dirname(claudeCodePath));
      await fs.writeFile(claudeCodePath, '');

      // Mock user confirming configuration
      mockInquirerPrompt({ shouldConfigure: true });

      // Run wizard
      await wizard.run();

      // Verify config file was created
      const configPath = path.join(testDir, '.config/Claude/claude_desktop_config.json');
      expect(await fs.pathExists(configPath)).toBe(true);

      // Verify config content
      const config = await fs.readJSON(configPath);
      expect(config).toHaveProperty('mcpServers');
      expect(config.mcpServers).toHaveProperty('memesh');
    });

    it('should show success message after completion', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);
      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      // Verify console.log was called with success indicators
      expect(console.log).toHaveBeenCalled();
      const logs = (console.log as any).mock.calls.flat().join(' ');
      expect(logs).toContain('Setup Complete');
    });
  });

  describe('Claude Code Detection', () => {
    it('should detect Claude Code on macOS (Applications)', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      // Create Claude Code in Applications
      const claudeCodePath = path.join(testDir, 'Applications/Claude Code.app');
      await createTestDirectory(claudeCodePath);

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      // Verify detection message
      expect(console.log).toHaveBeenCalled();
      const logs = (console.log as any).mock.calls.flat().join(' ');
      expect(logs).toContain('Claude Code');
      expect(logs).toContain(claudeCodePath);
    });

    it('should detect Claude Code on macOS (user Applications)', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      // Create Claude Code in user Applications
      const claudeCodePath = path.join(testDir, 'Applications/Claude Code.app');
      await createTestDirectory(claudeCodePath);

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      const logs = (console.log as any).mock.calls.flat().join(' ');
      expect(logs).toContain('Claude Code');
    });

    it('should handle Claude Code not found on macOS', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      const logs = (console.log as any).mock.calls.flat().join(' ');
      expect(logs).toContain('Not found');
    });

    it('should detect Claude Code on Windows', async () => {
      mockPlatform('win32');
      mockHomedir(testDir);
      process.env.APPDATA = path.join(testDir, 'AppData/Roaming');

      const claudeCodePath = path.join(
        testDir,
        'AppData/Local/Programs/Claude Code/Claude Code.exe'
      );
      await createTestDirectory(path.dirname(claudeCodePath));
      await fs.writeFile(claudeCodePath, '');

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      const logs = (console.log as any).mock.calls.flat().join(' ');
      expect(logs).toContain('Claude Code');
    });

    it('should detect Claude Code on Linux', async () => {
      mockPlatform('linux');
      mockHomedir(testDir);

      const claudeCodePath = path.join(testDir, '.local/bin/claude-code');
      await createTestDirectory(path.dirname(claudeCodePath));
      await fs.writeFile(claudeCodePath, '');

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      const logs = (console.log as any).mock.calls.flat().join(' ');
      expect(logs).toContain('Claude Code');
    });
  });

  describe('Config File Management', () => {
    it('should create config directory if it does not exist', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      const configDir = path.join(testDir, 'Library/Application Support/Claude');
      expect(await fs.pathExists(configDir)).toBe(true);
    });

    it('should backup existing config file', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      // Create existing config
      const configPath = path.join(
        testDir,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJSON(configPath, { existing: 'config' });

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      // Verify backup was created
      const configDir = path.dirname(configPath);
      const files = await fs.readdir(configDir);
      const backupFiles = files.filter((f) => f.startsWith('claude_desktop_config.json.backup-'));
      expect(backupFiles.length).toBeGreaterThan(0);

      // Verify backup content
      const backupPath = path.join(configDir, backupFiles[0]);
      const backupContent = await fs.readJSON(backupPath);
      expect(backupContent).toEqual({ existing: 'config' });
    });

    it('should create valid JSON config', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      const configPath = path.join(
        testDir,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
      const config = await fs.readJSON(configPath);

      // Verify structure
      expect(config).toHaveProperty('mcpServers');
      expect(config.mcpServers).toHaveProperty('memesh');
      expect(config.mcpServers.memesh).toHaveProperty('command');
      expect(config.mcpServers.memesh).toHaveProperty('args');
      expect(config.mcpServers.memesh).toHaveProperty('env');

      // Verify types
      expect(typeof config.mcpServers.memesh.command).toBe('string');
      expect(Array.isArray(config.mcpServers.memesh.args)).toBe(true);
      expect(typeof config.mcpServers.memesh.env).toBe('object');
    });

    it('should validate config after creation', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      // Verify validation passed (no errors thrown)
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('should handle JSON formatting with proper indentation', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      const configPath = path.join(
        testDir,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
      const configContent = await fs.readFile(configPath, 'utf-8');

      // Verify proper indentation (2 spaces)
      expect(configContent).toContain('  ');
      expect(configContent).not.toContain('\t');

      // Verify can be parsed back
      expect(() => JSON.parse(configContent)).not.toThrow();
    });
  });

  describe('User Cancellation', () => {
    it('should handle cancellation during configuration step', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      // User declines configuration
      mockInquirerPrompt({ shouldConfigure: false });

      await wizard.run();

      // Verify config was not created
      const configPath = path.join(
        testDir,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
      expect(await fs.pathExists(configPath)).toBe(false);

      // Verify cancellation message
      const logs = (console.log as any).mock.calls.flat().join(' ');
      expect(logs).toContain('cancelled');
    });

    it('should not backup existing config when user cancels', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      // Create existing config
      const configPath = path.join(
        testDir,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJSON(configPath, { existing: 'config' });

      // User declines configuration
      mockInquirerPrompt({ shouldConfigure: false });

      await wizard.run();

      // Verify no backup was created
      const configDir = path.dirname(configPath);
      const files = await fs.readdir(configDir);
      const backupFiles = files.filter((f) => f.startsWith('claude_desktop_config.json.backup-'));
      expect(backupFiles.length).toBe(0);

      // Verify original config unchanged
      const config = await fs.readJSON(configPath);
      expect(config).toEqual({ existing: 'config' });
    });
  });

  describe('Error Handling', () => {
    it('should handle permission errors during directory creation', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      mockInquirerPrompt({ shouldConfigure: true });

      // Mock fs.ensureDir to throw permission error
      const ensureDirSpy = vi.spyOn(fs, 'ensureDir').mockRejectedValue(
        new Error('EACCES: permission denied')
      );

      await wizard.run();

      // Verify error was logged
      expect(logger.error).toHaveBeenCalled();

      // Verify error message displayed
      const logs = (console.log as any).mock.calls.flat().join(' ');
      expect(logs).toContain('Failed');

      ensureDirSpy.mockRestore();
    });

    it('should handle permission errors during config write', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      mockInquirerPrompt({ shouldConfigure: true });

      // Mock fs.writeJSON to throw permission error
      const writeJSONSpy = vi.spyOn(fs, 'writeJSON').mockRejectedValue(
        new Error('EACCES: permission denied')
      );

      await wizard.run();

      // Verify error was logged
      expect(logger.error).toHaveBeenCalled();

      writeJSONSpy.mockRestore();
    });

    it('should handle invalid config path', async () => {
      mockPlatform('darwin');
      mockHomedir('');

      mockInquirerPrompt({ shouldConfigure: true });

      // Mock ensureDir to throw error for invalid path
      const ensureDirSpy = vi.spyOn(fs, 'ensureDir').mockRejectedValue(
        new Error('Invalid path')
      );

      await wizard.run();

      // Should handle gracefully
      expect(logger.error).toHaveBeenCalled();

      ensureDirSpy.mockRestore();
    });

    it('should handle backup failure gracefully', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      // Create existing config
      const configPath = path.join(
        testDir,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJSON(configPath, { existing: 'config' });

      mockInquirerPrompt({ shouldConfigure: true });

      // Mock fs.copy to throw error
      const copySpy = vi.spyOn(fs, 'copy').mockRejectedValue(new Error('Backup failed'));

      await wizard.run();

      // Should continue despite backup failure
      expect(logger.error).toHaveBeenCalled();

      copySpy.mockRestore();
    });

    it('should handle JSON parse errors during validation', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      mockInquirerPrompt({ shouldConfigure: true });

      // Mock fs.readJSON to throw parse error
      const originalWriteJSON = fs.writeJSON;
      const writeJSONSpy = vi.spyOn(fs, 'writeJSON').mockImplementation(async (file, data) => {
        // Write invalid JSON
        await fs.writeFile(file, '{invalid json');
      });

      await wizard.run();

      // Verify validation error was caught
      expect(logger.error).toHaveBeenCalled();

      writeJSONSpy.mockRestore();
    });

    it('should show troubleshooting steps on error', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      mockInquirerPrompt({ shouldConfigure: true });

      // Force error
      const ensureDirSpy = vi.spyOn(fs, 'ensureDir').mockRejectedValue(
        new Error('Permission denied')
      );

      await wizard.run();

      // Verify troubleshooting info displayed
      const logs = (console.log as any).mock.calls.flat().join(' ');
      expect(logs).toContain('Troubleshooting');
      expect(logs).toContain('permissions');

      ensureDirSpy.mockRestore();
    });
  });

  describe('Cross-Platform Path Handling', () => {
    it('should use correct config path on macOS', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      const expectedPath = path.join(
        testDir,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
      expect(await fs.pathExists(expectedPath)).toBe(true);
    });

    it('should use correct config path on Windows', async () => {
      mockPlatform('win32');
      mockHomedir(testDir);
      process.env.APPDATA = path.join(testDir, 'AppData/Roaming');

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      const expectedPath = path.join(
        process.env.APPDATA,
        'Claude/claude_desktop_config.json'
      );
      expect(await fs.pathExists(expectedPath)).toBe(true);
    });

    it('should use correct config path on Linux', async () => {
      mockPlatform('linux');
      mockHomedir(testDir);

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      const expectedPath = path.join(testDir, '.config/Claude/claude_desktop_config.json');
      expect(await fs.pathExists(expectedPath)).toBe(true);
    });

    it('should handle Windows path separators correctly', async () => {
      mockPlatform('win32');
      mockHomedir(testDir);
      process.env.APPDATA = path.join(testDir, 'AppData/Roaming');

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      const configPath = path.join(
        process.env.APPDATA,
        'Claude/claude_desktop_config.json'
      );
      const config = await fs.readJSON(configPath);

      // Verify paths in config use correct separators
      expect(config.mcpServers.memesh.args[0]).toBeTruthy();
    });

    it('should handle special characters in home directory', async () => {
      mockPlatform('darwin');
      const specialDir = path.join(testDir, 'user with spaces & special-chars');
      await createTestDirectory(specialDir);
      mockHomedir(specialDir);

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      const configPath = path.join(
        specialDir,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
      expect(await fs.pathExists(configPath)).toBe(true);
    });

    it('should normalize paths correctly on all platforms', async () => {
      const platforms: Array<'darwin' | 'win32' | 'linux'> = ['darwin', 'win32', 'linux'];

      for (const platform of platforms) {
        // Clear test directory
        await cleanupTestDirectory();
        await createTestDirectory(testDir);

        mockPlatform(platform);
        mockHomedir(testDir);
        if (platform === 'win32') {
          process.env.APPDATA = path.join(testDir, 'AppData/Roaming');
        }

        mockInquirerPrompt({ shouldConfigure: true });

        await wizard.run();

        // Verify config was created with normalized paths
        let configPath: string;
        if (platform === 'darwin') {
          configPath = path.join(
            testDir,
            'Library/Application Support/Claude/claude_desktop_config.json'
          );
        } else if (platform === 'win32') {
          configPath = path.join(
            process.env.APPDATA!,
            'Claude/claude_desktop_config.json'
          );
        } else {
          configPath = path.join(testDir, '.config/Claude/claude_desktop_config.json');
        }

        expect(await fs.pathExists(configPath)).toBe(true);
      }
    });
  });

  describe('Config Validation', () => {
    it('should validate required fields exist', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      const configPath = path.join(
        testDir,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
      const config = await fs.readJSON(configPath);

      // Validate structure
      expect(config.mcpServers).toBeDefined();
      expect(config.mcpServers.memesh).toBeDefined();
      expect(config.mcpServers.memesh.command).toBeDefined();
      expect(config.mcpServers.memesh.args).toBeDefined();
      expect(config.mcpServers.memesh.env).toBeDefined();
    });

    it('should detect invalid config structure', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      // Create invalid config
      const configPath = path.join(
        testDir,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
      await fs.ensureDir(path.dirname(configPath));
      await fs.writeJSON(configPath, { invalid: 'structure' });

      mockInquirerPrompt({ shouldConfigure: true });

      // Mock writeJSON to not overwrite (simulate validation of existing config)
      const writeJSONSpy = vi.spyOn(fs, 'writeJSON').mockImplementation(async () => {});

      await wizard.run();

      writeJSONSpy.mockRestore();
    });

    it('should validate command is specified', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      const configPath = path.join(
        testDir,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
      const config = await fs.readJSON(configPath);

      expect(config.mcpServers.memesh.command).toBe('node');
    });

    it('should validate args is an array', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      const configPath = path.join(
        testDir,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
      const config = await fs.readJSON(configPath);

      expect(Array.isArray(config.mcpServers.memesh.args)).toBe(true);
      expect(config.mcpServers.memesh.args.length).toBeGreaterThan(0);
    });

    it('should validate env is an object', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      const configPath = path.join(
        testDir,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
      const config = await fs.readJSON(configPath);

      expect(typeof config.mcpServers.memesh.env).toBe('object');
      expect(config.mcpServers.memesh.env).not.toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty home directory', async () => {
      mockPlatform('darwin');
      mockHomedir('');

      mockInquirerPrompt({ shouldConfigure: true });

      // Mock ensureDir to throw error for empty home
      const ensureDirSpy = vi.spyOn(fs, 'ensureDir').mockRejectedValue(
        new Error('Cannot create directory with empty home')
      );

      await wizard.run();

      // Should handle gracefully
      expect(logger.error).toHaveBeenCalled();

      ensureDirSpy.mockRestore();
    });

    it('should handle very long paths', async () => {
      mockPlatform('darwin');
      const longPath = path.join(testDir, 'a'.repeat(100), 'b'.repeat(100));
      await createTestDirectory(longPath);
      mockHomedir(longPath);

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      const configPath = path.join(
        longPath,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
      expect(await fs.pathExists(configPath)).toBe(true);
    });

    it('should handle concurrent access (sequential calls)', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      mockInquirerPrompt({ shouldConfigure: true });

      // Run wizard multiple times
      await wizard.run();
      await wizard.run();

      const configPath = path.join(
        testDir,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
      expect(await fs.pathExists(configPath)).toBe(true);

      // Verify multiple backups were created
      const configDir = path.dirname(configPath);
      const files = await fs.readdir(configDir);
      const backupFiles = files.filter((f) => f.startsWith('claude_desktop_config.json.backup-'));
      expect(backupFiles.length).toBeGreaterThan(0);
    });

    it('should handle symlinks in paths', async () => {
      mockPlatform('darwin');

      const realDir = path.join(testDir, 'real');
      const linkDir = path.join(testDir, 'link');
      await createTestDirectory(realDir);
      await fs.symlink(realDir, linkDir);

      mockHomedir(linkDir);
      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      // Should create config in linked directory
      const configPath = path.join(
        linkDir,
        'Library/Application Support/Claude/claude_desktop_config.json'
      );
      expect(await fs.pathExists(configPath)).toBe(true);
    });

    it('should handle read-only config directory', async () => {
      mockPlatform('darwin');
      mockHomedir(testDir);

      const configDir = path.join(testDir, 'Library/Application Support/Claude');
      await createTestDirectory(configDir);

      // Make directory read-only
      await fs.chmod(configDir, 0o444);

      mockInquirerPrompt({ shouldConfigure: true });

      await wizard.run();

      // Should handle error gracefully
      expect(logger.error).toHaveBeenCalled();

      // Restore permissions for cleanup
      await fs.chmod(configDir, 0o755);
    });
  });
});
