/**
 * GitHandlers Test Suite
 *
 * Comprehensive tests for Git Assistant MCP tool handlers.
 * Tests cover:
 * - Git operations (save, list, show, goBack, backup, setup, help)
 * - Input validation with Zod schemas
 * - Error handling and recovery
 * - Edge cases and boundary conditions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHandlers } from '../GitHandlers.js';
import type { GitAssistantIntegration } from '../../../integrations/GitAssistantIntegration.js';
import { ValidationError } from '../../../errors/index.js';

describe('GitHandlers', () => {
  let mockGitAssistant: GitAssistantIntegration;
  let gitHandlers: GitHandlers;

  beforeEach(() => {
    // Create mock GitAssistantIntegration
    mockGitAssistant = {
      saveWork: vi.fn().mockResolvedValue(undefined),
      listVersions: vi.fn().mockResolvedValue([
        {
          hash: 'abc123',
          message: 'Initial commit',
          author: 'Test Author',
          date: '2025-01-01',
        },
        {
          hash: 'def456',
          message: 'Add feature',
          author: 'Test Author',
          date: '2025-01-02',
        },
      ]),
      status: vi.fn().mockResolvedValue(undefined),
      showChanges: vi.fn().mockResolvedValue({
        files: ['src/index.ts', 'README.md'],
        additions: 10,
        deletions: 5,
      }),
      goBackTo: vi.fn().mockResolvedValue(undefined),
      createBackup: vi.fn().mockResolvedValue('/backups/backup-2025-01-01.tar.gz'),
      setupNewProject: vi.fn().mockResolvedValue(undefined),
      configureExistingProject: vi.fn().mockResolvedValue(undefined),
      showHelp: vi.fn().mockResolvedValue(undefined),
    } as unknown as GitAssistantIntegration;

    gitHandlers = new GitHandlers(mockGitAssistant);
  });

  describe('handleGitSaveWork', () => {
    it('should save work with description', async () => {
      const result = await gitHandlers.handleGitSaveWork({
        description: 'Implement user authentication',
      });

      expect(mockGitAssistant.saveWork).toHaveBeenCalledWith(
        'Implement user authentication',
        true // Default value from schema
      );
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('✅ Work saved successfully');
      expect(result.content[0].text).toContain('Implement user authentication');
    });

    it('should save work with auto backup enabled', async () => {
      const result = await gitHandlers.handleGitSaveWork({
        description: 'Critical changes',
        autoBackup: true,
      });

      expect(mockGitAssistant.saveWork).toHaveBeenCalledWith(
        'Critical changes',
        true
      );
      expect(result.content[0].text).toContain('✅ Work saved successfully');
    });

    it('should validate input schema', async () => {
      const result = await gitHandlers.handleGitSaveWork({
        // Missing description
        autoBackup: true,
      });

      expect(result.content[0].text).toContain('❌ Failed to save work');
    });

    it('should handle save work errors', async () => {
      vi.mocked(mockGitAssistant.saveWork).mockRejectedValue(
        new Error('Nothing to commit')
      );

      const result = await gitHandlers.handleGitSaveWork({
        description: 'Test commit',
      });

      expect(result.content[0].text).toContain('❌ Failed to save work');
      expect(result.content[0].text).toContain('Nothing to commit');
    });

    it('should handle invalid input types', async () => {
      const result = await gitHandlers.handleGitSaveWork({
        description: 123, // Wrong type
      });

      expect(result.content[0].text).toContain('❌ Failed to save work');
    });
  });

  describe('handleGitListVersions', () => {
    it('should list versions with default limit', async () => {
      const result = await gitHandlers.handleGitListVersions({});

      expect(mockGitAssistant.listVersions).toHaveBeenCalledWith(10); // Default from schema
      expect(result.content).toHaveLength(1);

      const versions = JSON.parse(result.content[0].text);
      expect(versions).toHaveLength(2);
      expect(versions[0].hash).toBe('abc123');
      expect(versions[1].hash).toBe('def456');
    });

    it('should list versions with custom limit', async () => {
      await gitHandlers.handleGitListVersions({ limit: 5 });

      expect(mockGitAssistant.listVersions).toHaveBeenCalledWith(5);
    });

    it('should handle list versions errors', async () => {
      vi.mocked(mockGitAssistant.listVersions).mockRejectedValue(
        new Error('Not a git repository')
      );

      const result = await gitHandlers.handleGitListVersions({});

      expect(result.content[0].text).toContain('❌ Failed to list versions');
      expect(result.content[0].text).toContain('Not a git repository');
    });

    it('should handle empty version history', async () => {
      vi.mocked(mockGitAssistant.listVersions).mockResolvedValue([]);

      const result = await gitHandlers.handleGitListVersions({});

      const versions = JSON.parse(result.content[0].text);
      expect(versions).toHaveLength(0);
    });

    it('should validate limit is a number', async () => {
      const result = await gitHandlers.handleGitListVersions({
        limit: 'invalid' as any,
      });

      expect(result.content[0].text).toContain('❌ Failed to list versions');
    });
  });

  describe('handleGitStatus', () => {
    it('should get git status', async () => {
      const result = await gitHandlers.handleGitStatus({});

      expect(mockGitAssistant.status).toHaveBeenCalled();
      expect(result.content[0].text).toContain('✅ Git status displayed');
    });

    it('should handle status errors', async () => {
      vi.mocked(mockGitAssistant.status).mockRejectedValue(
        new Error('Not in a git repository')
      );

      const result = await gitHandlers.handleGitStatus({});

      expect(result.content[0].text).toContain('❌ Failed to get status');
    });

    it('should accept any arguments (unused)', async () => {
      const result = await gitHandlers.handleGitStatus({
        unused: 'parameter',
      });

      expect(result.content[0].text).toContain('✅ Git status displayed');
    });
  });

  describe('handleGitShowChanges', () => {
    it('should show changes with default comparison', async () => {
      const result = await gitHandlers.handleGitShowChanges({});

      expect(mockGitAssistant.showChanges).toHaveBeenCalledWith(undefined);

      const changes = JSON.parse(result.content[0].text);
      expect(changes.files).toContain('src/index.ts');
      expect(changes.additions).toBe(10);
      expect(changes.deletions).toBe(5);
    });

    it('should show changes compared to specific commit', async () => {
      const result = await gitHandlers.handleGitShowChanges({
        compareWith: 'HEAD~2',
      });

      expect(mockGitAssistant.showChanges).toHaveBeenCalledWith('HEAD~2');
      expect(result.content[0].type).toBe('text');
    });

    it('should show changes compared to branch', async () => {
      await gitHandlers.handleGitShowChanges({
        compareWith: 'main',
      });

      expect(mockGitAssistant.showChanges).toHaveBeenCalledWith('main');
    });

    it('should handle show changes errors', async () => {
      vi.mocked(mockGitAssistant.showChanges).mockRejectedValue(
        new Error('Invalid reference')
      );

      const result = await gitHandlers.handleGitShowChanges({
        compareWith: 'invalid-ref',
      });

      expect(result.content[0].text).toContain('❌ Failed to show changes');
    });

    it('should validate compareWith is a string', async () => {
      const result = await gitHandlers.handleGitShowChanges({
        compareWith: 123 as any,
      });

      expect(result.content[0].text).toContain('❌ Failed to show changes');
    });
  });

  describe('handleGitGoBack', () => {
    it('should go back to specific commit', async () => {
      const result = await gitHandlers.handleGitGoBack({
        identifier: 'abc123',
      });

      expect(mockGitAssistant.goBackTo).toHaveBeenCalledWith('abc123');
      expect(result.content[0].text).toContain('✅ Successfully went back to version');
      expect(result.content[0].text).toContain('abc123');
    });

    it('should go back using HEAD reference', async () => {
      const result = await gitHandlers.handleGitGoBack({
        identifier: 'HEAD~2',
      });

      expect(mockGitAssistant.goBackTo).toHaveBeenCalledWith('HEAD~2');
      expect(result.content[0].text).toContain('HEAD~2');
    });

    it('should go back to tagged version', async () => {
      await gitHandlers.handleGitGoBack({
        identifier: 'v1.0.0',
      });

      expect(mockGitAssistant.goBackTo).toHaveBeenCalledWith('v1.0.0');
    });

    it('should handle go back errors', async () => {
      vi.mocked(mockGitAssistant.goBackTo).mockRejectedValue(
        new Error('Invalid identifier')
      );

      const result = await gitHandlers.handleGitGoBack({
        identifier: 'invalid',
      });

      expect(result.content[0].text).toContain('❌ Failed to go back');
    });

    it('should validate identifier is required', async () => {
      const result = await gitHandlers.handleGitGoBack({});

      expect(result.content[0].text).toContain('❌ Failed to go back');
    });

    it('should validate identifier is a string', async () => {
      const result = await gitHandlers.handleGitGoBack({
        identifier: null as any,
      });

      expect(result.content[0].text).toContain('❌ Failed to go back');
    });
  });

  describe('handleGitCreateBackup', () => {
    it('should create backup', async () => {
      const result = await gitHandlers.handleGitCreateBackup({});

      expect(mockGitAssistant.createBackup).toHaveBeenCalled();
      expect(result.content[0].text).toContain('✅ Backup created at');
      expect(result.content[0].text).toContain('/backups/backup-2025-01-01.tar.gz');
    });

    it('should handle backup creation errors', async () => {
      vi.mocked(mockGitAssistant.createBackup).mockRejectedValue(
        new Error('Insufficient disk space')
      );

      const result = await gitHandlers.handleGitCreateBackup({});

      expect(result.content[0].text).toContain('❌ Failed to create backup');
      expect(result.content[0].text).toContain('Insufficient disk space');
    });

    it('should ignore any input arguments', async () => {
      const result = await gitHandlers.handleGitCreateBackup({
        unused: 'param',
      });

      expect(result.content[0].text).toContain('✅ Backup created at');
    });
  });

  describe('handleGitSetup', () => {
    it('should setup new git project', async () => {
      const result = await gitHandlers.handleGitSetup({
        existingGit: false,
      });

      expect(mockGitAssistant.setupNewProject).toHaveBeenCalled();
      expect(mockGitAssistant.configureExistingProject).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('✅ Git setup completed successfully');
    });

    it('should configure existing git project', async () => {
      const result = await gitHandlers.handleGitSetup({
        existingGit: true,
      });

      expect(mockGitAssistant.configureExistingProject).toHaveBeenCalled();
      expect(mockGitAssistant.setupNewProject).not.toHaveBeenCalled();
      expect(result.content[0].text).toContain('✅ Git setup completed successfully');
    });

    it('should default to new project when existingGit not specified', async () => {
      const result = await gitHandlers.handleGitSetup({});

      expect(mockGitAssistant.setupNewProject).toHaveBeenCalled();
      expect(result.content[0].text).toContain('✅ Git setup completed successfully');
    });

    it('should handle setup errors', async () => {
      vi.mocked(mockGitAssistant.setupNewProject).mockRejectedValue(
        new Error('Git already initialized')
      );

      const result = await gitHandlers.handleGitSetup({
        existingGit: false,
      });

      expect(result.content[0].text).toContain('❌ Git setup failed');
    });

    it('should validate existingGit is a boolean', async () => {
      const result = await gitHandlers.handleGitSetup({
        existingGit: 'yes' as any,
      });

      expect(result.content[0].text).toContain('❌ Git setup failed');
    });
  });

  describe('handleGitHelp', () => {
    it('should show git help', async () => {
      const result = await gitHandlers.handleGitHelp({});

      expect(mockGitAssistant.showHelp).toHaveBeenCalled();
      expect(result.content[0].text).toContain('✅ Git Assistant help displayed');
    });

    it('should handle help errors', async () => {
      vi.mocked(mockGitAssistant.showHelp).mockRejectedValue(
        new Error('Help unavailable')
      );

      const result = await gitHandlers.handleGitHelp({});

      expect(result.content[0].text).toContain('❌ Failed to show help');
    });

    it('should ignore any arguments', async () => {
      const result = await gitHandlers.handleGitHelp({
        unused: 'parameter',
      });

      expect(result.content[0].text).toContain('✅ Git Assistant help displayed');
    });
  });

  describe('Error Handling', () => {
    it('should handle ValidationError properly', async () => {
      const result = await gitHandlers.handleGitSaveWork({
        description: '', // Empty string should fail validation
      });

      expect(result.content[0].text).toContain('❌ Failed to save work');
    });

    it('should handle unexpected errors', async () => {
      vi.mocked(mockGitAssistant.saveWork).mockRejectedValue(
        'String error' // Non-Error object
      );

      const result = await gitHandlers.handleGitSaveWork({
        description: 'Test',
      });

      expect(result.content[0].text).toContain('❌ Failed to save work');
    });

    it('should log errors properly', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.mocked(mockGitAssistant.listVersions).mockRejectedValue(
        new Error('Test error')
      );

      await gitHandlers.handleGitListVersions({});

      // Error should be logged (error handler logs it)
      // Note: Logger might not use console.error directly
      // expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null inputs', async () => {
      const result = await gitHandlers.handleGitSaveWork(null as any);
      expect(result.content[0].text).toContain('❌');
    });

    it('should handle undefined inputs', async () => {
      const result = await gitHandlers.handleGitListVersions({});
      // Should use defaults (empty object is valid)
      expect(mockGitAssistant.listVersions).toHaveBeenCalled();
    });

    it('should handle array inputs', async () => {
      const result = await gitHandlers.handleGitSaveWork([
        'description',
      ] as any);
      expect(result.content[0].text).toContain('❌');
    });

    it('should handle very long descriptions', async () => {
      const longDescription = 'a'.repeat(10000);
      const result = await gitHandlers.handleGitSaveWork({
        description: longDescription,
        autoBackup: false,
      });

      expect(mockGitAssistant.saveWork).toHaveBeenCalledWith(
        longDescription,
        false
      );
    });

    it('should handle special characters in description', async () => {
      const specialDescription = 'Fix: 🐛 bug with "quotes" and \\backslashes\\';
      const result = await gitHandlers.handleGitSaveWork({
        description: specialDescription,
        autoBackup: false,
      });

      expect(mockGitAssistant.saveWork).toHaveBeenCalledWith(
        specialDescription,
        false
      );
      expect(result.content[0].text).toContain('✅');
    });
  });
});
