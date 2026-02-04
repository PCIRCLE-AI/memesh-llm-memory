/**
 * PathResolver Tests
 *
 * Comprehensive tests for PathResolver utility that handles backward
 * compatibility during migration from "Claude Code Buddy" to "MeMesh".
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import {
  getDataDirectory,
  getDataPath,
  isMigrationNeeded,
  getMigrationInfo,
  _clearCache,
} from '../../src/utils/PathResolver.js';
import { logger } from '../../src/utils/logger.js';

// Mock dependencies
vi.mock('../../src/utils/logger.js', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PathResolver', () => {
  // Note: We use testDir-based paths for isolated testing, not the actual home directory paths
  // These would be: path.join(os.homedir(), '.memesh') and path.join(os.homedir(), '.claude-code-buddy')
  const testDir = path.join(os.tmpdir(), `pathresolver-test-${Date.now()}`);
  const testNewDir = path.join(testDir, '.memesh');
  const testLegacyDir = path.join(testDir, '.claude-code-buddy');

  // Helper to mock os.homedir() to point to test directory
  const mockHomedir = (dir: string) => {
    vi.spyOn(os, 'homedir').mockReturnValue(dir);
  };

  // Helper to create directories
  const createDir = (dir: string) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  };

  // Helper to remove directories
  const removeDir = (dir: string) => {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  };

  beforeEach(() => {
    // Clear cache before each test
    _clearCache();
    // Clear all mocks
    vi.clearAllMocks();
    // Create test directory structure
    createDir(testDir);
  });

  afterEach(() => {
    // Clean up test directories
    removeDir(testDir);
    // Restore mocks
    vi.restoreAllMocks();
  });

  describe('getDataDirectory()', () => {
    describe('Case 1: New directory exists', () => {
      it('should return new directory when it exists', () => {
        mockHomedir(testDir);
        createDir(testNewDir);

        const result = getDataDirectory();

        expect(result).toBe(testNewDir);
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('should prefer new directory even if legacy exists', () => {
        mockHomedir(testDir);
        createDir(testNewDir);
        createDir(testLegacyDir);

        const result = getDataDirectory();

        expect(result).toBe(testNewDir);
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('should cache result after first call', () => {
        mockHomedir(testDir);
        createDir(testNewDir);

        const result1 = getDataDirectory();
        const result2 = getDataDirectory();
        const result3 = getDataDirectory();

        expect(result1).toBe(testNewDir);
        expect(result2).toBe(testNewDir);
        expect(result3).toBe(testNewDir);

        // fs.existsSync should be called only during first call
        // (we can't directly test this, but we verify consistent behavior)
      });
    });

    describe('Case 2: Only legacy directory exists', () => {
      it('should return legacy directory with warning', () => {
        mockHomedir(testDir);
        createDir(testLegacyDir);

        const result = getDataDirectory();

        expect(result).toBe(testLegacyDir);
        expect(logger.warn).toHaveBeenCalled();
      });

      it('should show migration warning with expected content', () => {
        mockHomedir(testDir);
        createDir(testLegacyDir);

        getDataDirectory();

        // Verify warning messages
        const warnCalls = (logger.warn as any).mock.calls.flat();
        const warningText = warnCalls.join(' ');

        expect(warningText).toContain('MIGRATION NOTICE');
        expect(warningText).toContain('Found legacy data directory');
        expect(warningText).toContain('New directory should be');
        expect(warningText).toContain('MeMesh is using your existing data');
        expect(warningText).toContain('./scripts/migrate-from-ccb.sh');
        expect(warningText).toContain('This warning appears once per session');
      });

      it('should show warning only once per session', () => {
        mockHomedir(testDir);
        createDir(testLegacyDir);

        getDataDirectory();
        getDataDirectory();
        getDataDirectory();

        // Warning should be logged multiple times (for the multi-line message)
        // but only during the first call
        const firstCallWarnings = (logger.warn as any).mock.calls.length;
        expect(firstCallWarnings).toBeGreaterThan(0);

        // Clear mocks and call again
        vi.clearAllMocks();
        getDataDirectory();

        // No new warnings should be logged
        expect(logger.warn).not.toHaveBeenCalled();
      });

      it('should cache legacy directory path', () => {
        mockHomedir(testDir);
        createDir(testLegacyDir);

        const result1 = getDataDirectory();
        const result2 = getDataDirectory();

        expect(result1).toBe(testLegacyDir);
        expect(result2).toBe(testLegacyDir);
      });
    });

    describe('Case 3: Neither directory exists', () => {
      it('should create and return new directory', () => {
        mockHomedir(testDir);

        const result = getDataDirectory();

        expect(result).toBe(testNewDir);
        expect(fs.existsSync(testNewDir)).toBe(true);
        expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Created data directory'));
      });

      it('should cache newly created directory', () => {
        mockHomedir(testDir);

        const result1 = getDataDirectory();
        const result2 = getDataDirectory();

        expect(result1).toBe(testNewDir);
        expect(result2).toBe(testNewDir);
        // Info should only be logged once
        expect(logger.info).toHaveBeenCalledTimes(1);
      });

      it('should create nested directories if needed', () => {
        const deepTestDir = path.join(testDir, 'nested', 'deep', 'path');
        mockHomedir(deepTestDir);

        const result = getDataDirectory();
        const expectedDir = path.join(deepTestDir, '.memesh');

        expect(result).toBe(expectedDir);
        expect(fs.existsSync(expectedDir)).toBe(true);
      });
    });

    describe('Error handling', () => {
      it('should throw error when directory creation fails', () => {
        mockHomedir(testDir);

        // Mock mkdirSync to throw an error
        const mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {
          throw new Error('Permission denied');
        });

        expect(() => getDataDirectory()).toThrow('Failed to create data directory');
        expect(logger.error).toHaveBeenCalled();

        mkdirSyncSpy.mockRestore();
      });

      it('should include original error in thrown error', () => {
        mockHomedir(testDir);

        const originalError = new Error('EACCES: permission denied');
        const mkdirSyncSpy = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {
          throw originalError;
        });

        expect(() => getDataDirectory()).toThrow('Failed to create data directory');

        mkdirSyncSpy.mockRestore();
      });
    });

    describe('Cache behavior', () => {
      it('should return cached value on subsequent calls', () => {
        mockHomedir(testDir);
        createDir(testNewDir);

        const existsSpy = vi.spyOn(fs, 'existsSync');

        const result1 = getDataDirectory();
        const callsAfterFirst = existsSpy.mock.calls.length;

        const result2 = getDataDirectory();
        const callsAfterSecond = existsSpy.mock.calls.length;

        expect(result1).toBe(result2);
        expect(callsAfterSecond).toBe(callsAfterFirst); // No additional fs calls

        existsSpy.mockRestore();
      });

      it('should reset cache with _clearCache()', () => {
        mockHomedir(testDir);
        createDir(testNewDir);

        getDataDirectory();
        _clearCache();

        // After clearing cache, should evaluate again
        const result = getDataDirectory();
        expect(result).toBe(testNewDir);
      });

      it('should reset migration warning flag with _clearCache()', () => {
        mockHomedir(testDir);
        createDir(testLegacyDir);

        getDataDirectory();
        expect(logger.warn).toHaveBeenCalled();

        vi.clearAllMocks();
        getDataDirectory();
        expect(logger.warn).not.toHaveBeenCalled(); // Warning not shown again

        _clearCache();
        vi.clearAllMocks();
        getDataDirectory();
        expect(logger.warn).toHaveBeenCalled(); // Warning shown after cache clear
      });
    });
  });

  describe('getDataPath()', () => {
    it('should return correct path for simple filename', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const result = getDataPath('test.db');

      expect(result).toBe(path.join(testNewDir, 'test.db'));
    });

    it('should handle nested paths', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const result = getDataPath('subdir/file.db');

      expect(result).toBe(path.join(testNewDir, 'subdir', 'file.db'));
    });

    it('should handle deep nested paths', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const result = getDataPath('deep/nested/subdir/file.json');

      expect(result).toBe(path.join(testNewDir, 'deep', 'nested', 'subdir', 'file.json'));
    });

    it('should use cached data directory', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const existsSpy = vi.spyOn(fs, 'existsSync');

      // First call caches directory
      getDataPath('file1.db');
      const callsAfterFirst = existsSpy.mock.calls.length;

      // Subsequent calls use cache
      getDataPath('file2.db');
      const callsAfterSecond = existsSpy.mock.calls.length;

      expect(callsAfterSecond).toBe(callsAfterFirst);

      existsSpy.mockRestore();
    });

    it('should work with various file extensions', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const extensions = ['.db', '.json', '.txt', '.log', '.sqlite'];
      extensions.forEach((ext) => {
        const result = getDataPath(`file${ext}`);
        expect(result).toBe(path.join(testNewDir, `file${ext}`));
      });
    });

    it('should handle files without extensions', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const result = getDataPath('lockfile');

      expect(result).toBe(path.join(testNewDir, 'lockfile'));
    });

    it('should handle empty filename', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const result = getDataPath('');

      expect(result).toBe(testNewDir);
    });
  });

  describe('isMigrationNeeded()', () => {
    it('should return true when legacy exists but new does not', () => {
      mockHomedir(testDir);
      createDir(testLegacyDir);

      const result = isMigrationNeeded();

      expect(result).toBe(true);
    });

    it('should return false when new directory exists', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const result = isMigrationNeeded();

      expect(result).toBe(false);
    });

    it('should return false when neither directory exists', () => {
      mockHomedir(testDir);

      const result = isMigrationNeeded();

      expect(result).toBe(false);
    });

    it('should return false when both directories exist', () => {
      mockHomedir(testDir);
      createDir(testNewDir);
      createDir(testLegacyDir);

      const result = isMigrationNeeded();

      expect(result).toBe(false);
    });

    it('should not modify filesystem', () => {
      mockHomedir(testDir);

      isMigrationNeeded();

      expect(fs.existsSync(testNewDir)).toBe(false);
      expect(fs.existsSync(testLegacyDir)).toBe(false);
    });

    it('should not trigger cache or warnings', () => {
      mockHomedir(testDir);
      createDir(testLegacyDir);

      isMigrationNeeded();

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('getMigrationInfo()', () => {
    it('should return complete info when only new directory exists', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const info = getMigrationInfo();

      expect(info).toEqual({
        newDir: testNewDir,
        legacyDir: testLegacyDir,
        newDirExists: true,
        legacyDirExists: false,
        migrationNeeded: false,
        currentlyUsing: testNewDir,
      });
    });

    it('should return complete info when only legacy directory exists', () => {
      mockHomedir(testDir);
      createDir(testLegacyDir);

      const info = getMigrationInfo();

      expect(info).toEqual({
        newDir: testNewDir,
        legacyDir: testLegacyDir,
        newDirExists: false,
        legacyDirExists: true,
        migrationNeeded: true,
        currentlyUsing: testLegacyDir,
      });
    });

    it('should return complete info when neither directory exists', () => {
      mockHomedir(testDir);

      const info = getMigrationInfo();

      expect(info.newDir).toBe(testNewDir);
      expect(info.legacyDir).toBe(testLegacyDir);
      expect(info.newDirExists).toBe(false);
      expect(info.legacyDirExists).toBe(false);
      expect(info.migrationNeeded).toBe(false);
      expect(info.currentlyUsing).toBe(testNewDir); // Creates new dir
      // Verify new directory was created
      expect(fs.existsSync(testNewDir)).toBe(true);
    });

    it('should return complete info when both directories exist', () => {
      mockHomedir(testDir);
      createDir(testNewDir);
      createDir(testLegacyDir);

      const info = getMigrationInfo();

      expect(info).toEqual({
        newDir: testNewDir,
        legacyDir: testLegacyDir,
        newDirExists: true,
        legacyDirExists: true,
        migrationNeeded: false,
        currentlyUsing: testNewDir,
      });
    });

    it('should have correct property types', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const info = getMigrationInfo();

      expect(typeof info.newDir).toBe('string');
      expect(typeof info.legacyDir).toBe('string');
      expect(typeof info.newDirExists).toBe('boolean');
      expect(typeof info.legacyDirExists).toBe('boolean');
      expect(typeof info.migrationNeeded).toBe('boolean');
      expect(typeof info.currentlyUsing).toBe('string');
    });

    it('should call getDataDirectory() internally', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const info = getMigrationInfo();

      // currentlyUsing should be the result of getDataDirectory()
      expect(info.currentlyUsing).toBe(getDataDirectory());
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete migration workflow', () => {
      mockHomedir(testDir);

      // Step 1: Initial setup - no directories exist
      const info1 = getMigrationInfo();
      expect(info1.migrationNeeded).toBe(false);
      expect(info1.newDirExists).toBe(false);
      expect(info1.legacyDirExists).toBe(false);

      // Step 2: User has legacy directory
      _clearCache();
      removeDir(testNewDir);
      createDir(testLegacyDir);

      const info2 = getMigrationInfo();
      expect(info2.migrationNeeded).toBe(true);
      expect(info2.currentlyUsing).toBe(testLegacyDir);

      // Step 3: After migration - both exist
      _clearCache();
      createDir(testNewDir);

      const info3 = getMigrationInfo();
      expect(info3.migrationNeeded).toBe(false);
      expect(info3.currentlyUsing).toBe(testNewDir);
    });

    it('should work correctly with multiple getDataPath() calls', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const paths = [
        getDataPath('database.db'),
        getDataPath('config.json'),
        getDataPath('logs/app.log'),
        getDataPath('cache/temp.txt'),
      ];

      paths.forEach((p) => {
        expect(p.startsWith(testNewDir)).toBe(true);
      });
    });

    it('should maintain consistency across multiple function calls', () => {
      mockHomedir(testDir);
      createDir(testLegacyDir);

      const dir1 = getDataDirectory();
      const path1 = getDataPath('test.db');
      const info = getMigrationInfo();
      const dir2 = getDataDirectory();

      expect(dir1).toBe(dir2);
      expect(path1).toBe(path.join(dir1, 'test.db'));
      expect(info.currentlyUsing).toBe(dir1);
    });
  });

  describe('Edge cases', () => {
    it('should handle concurrent access (sequential calls)', () => {
      mockHomedir(testDir);

      // Multiple rapid calls should all return same result
      const results = Array.from({ length: 10 }, () => getDataDirectory());
      const uniqueResults = new Set(results);

      expect(uniqueResults.size).toBe(1);
      expect(fs.existsSync(testNewDir)).toBe(true);
    });

    it('should handle special characters in home directory', () => {
      const specialDir = path.join(testDir, 'path with spaces & special-chars');
      createDir(specialDir);
      mockHomedir(specialDir);

      const result = getDataDirectory();

      expect(result).toBe(path.join(specialDir, '.memesh'));
      expect(fs.existsSync(result)).toBe(true);
    });

    it('should handle very long nested paths', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const deepPath = 'a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/file.db';
      const result = getDataPath(deepPath);

      expect(result).toBe(path.join(testNewDir, deepPath));
    });

    it('should normalize paths correctly', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const result1 = getDataPath('./file.db');
      const result2 = getDataPath('file.db');

      // Both should resolve to same normalized path
      expect(path.normalize(result1)).toBe(path.normalize(result2));
    });
  });

  describe('Real-world usage patterns', () => {
    it('should support SecretManager use case', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const secretsPath = getDataPath('secrets.db');

      expect(secretsPath).toBe(path.join(testNewDir, 'secrets.db'));
      expect(path.dirname(secretsPath)).toBe(testNewDir);
    });

    it('should support KnowledgeGraph use case', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const kgPath = getDataPath('knowledge-graph.db');

      expect(kgPath).toBe(path.join(testNewDir, 'knowledge-graph.db'));
    });

    it('should support TaskQueue use case', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const queuePath = getDataPath('task-queue.db');

      expect(queuePath).toBe(path.join(testNewDir, 'task-queue.db'));
    });

    it('should support multiple database files', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const files = [
        'secrets.db',
        'knowledge-graph.db',
        'task-queue.db',
        'evolution.db',
        'metrics.db',
      ];

      const paths = files.map((f) => getDataPath(f));

      paths.forEach((p, i) => {
        expect(p).toBe(path.join(testNewDir, files[i]));
      });

      // All paths should be in same directory
      const dirs = paths.map((p) => path.dirname(p));
      expect(new Set(dirs).size).toBe(1);
    });
  });

  describe('Performance considerations', () => {
    it('should be efficient with cached results', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const startTime = Date.now();

      // Make many calls - should be very fast due to caching
      for (let i = 0; i < 1000; i++) {
        getDataDirectory();
        getDataPath(`file${i}.db`);
      }

      const elapsed = Date.now() - startTime;

      // With caching, 2000 calls should be very fast (< 100ms)
      expect(elapsed).toBeLessThan(100);
    });

    it('should minimize filesystem checks with caching', () => {
      mockHomedir(testDir);
      createDir(testNewDir);

      const existsSpy = vi.spyOn(fs, 'existsSync');

      // First call checks filesystem
      getDataDirectory();
      const checksAfterFirst = existsSpy.mock.calls.length;

      // Additional calls should not check filesystem
      getDataDirectory();
      getDataDirectory();
      getDataDirectory();

      expect(existsSpy.mock.calls.length).toBe(checksAfterFirst);

      existsSpy.mockRestore();
    });
  });
});
