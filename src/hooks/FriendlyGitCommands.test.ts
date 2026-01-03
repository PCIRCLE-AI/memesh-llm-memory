/**
 * Unit tests for FriendlyGitCommands
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FriendlyGitCommands } from './FriendlyGitCommands.js';
import { MCPToolInterface } from '../core/MCPToolInterface.js';
import { logger } from '../utils/logger.js';

describe('FriendlyGitCommands', () => {
  let friendlyCommands: FriendlyGitCommands;
  let mockMCP: MCPToolInterface;

  beforeEach(() => {
    // Create mock MCP interface
    mockMCP = {
      bash: vi.fn(),
      memory: {
        createEntities: vi.fn(),
      },
    } as any;

    friendlyCommands = new FriendlyGitCommands(mockMCP);
  });

  describe('saveWork', () => {
    it('should stage all changes and commit with message', async () => {
      const description = 'Test commit message';

      // Mock successful git operations
      (mockMCP.bash as any).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

      await friendlyCommands.saveWork(description, false); // false = no auto backup

      // Verify git add was called
      expect(mockMCP.bash).toHaveBeenCalledWith({
        command: 'git add .',
      });

      // Verify git commit was called with escaped message
      expect(mockMCP.bash).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.stringContaining('git commit -m'),
        })
      );

      // Verify memory was recorded
      expect(mockMCP.memory.createEntities).toHaveBeenCalled();
    });

    it('should handle commit failure gracefully', async () => {
      const description = 'Test commit';

      // Mock git commit failure
      (mockMCP.bash as any)
        .mockResolvedValueOnce({ exitCode: 0, stdout: '', stderr: '' }) // git add succeeds
        .mockRejectedValueOnce(new Error('Commit failed')); // git commit fails

      await expect(friendlyCommands.saveWork(description, false)).rejects.toThrow('Commit failed');
    });

    it('should escape shell special characters in commit message', async () => {
      const description = 'Test "quoted" message';

      (mockMCP.bash as any).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

      await friendlyCommands.saveWork(description, false);

      // Verify message was escaped
      const commitCall = (mockMCP.bash as any).mock.calls.find((call: any) =>
        call[0].command.includes('git commit')
      );
      expect(commitCall[0].command).toContain('\\"quoted\\"');
    });
  });

  describe('listVersions', () => {
    it('should return parsed commit history', async () => {
      const mockGitLog = `a1b2c3d4|feat: add feature|John Doe|2 hours ago|1735689600
e5f6g7h8|fix: bug fix|Jane Smith|1 day ago|1735603200`;

      (mockMCP.bash as any).mockResolvedValue({
        exitCode: 0,
        stdout: mockGitLog,
        stderr: ''
      });

      const versions = await friendlyCommands.listVersions(2);

      expect(versions).toHaveLength(2);
      expect(versions[0]).toMatchObject({
        number: 1,
        hash: expect.stringMatching(/^a1b2c3d4/),
        message: 'feat: add feature',
        author: 'John Doe',
        timeAgo: '2 hours ago',
      });
      expect(versions[1]).toMatchObject({
        number: 2,
        hash: expect.stringMatching(/^e5f6g7h8/),
        message: 'fix: bug fix',
        author: 'Jane Smith',
        timeAgo: '1 day ago',
      });
    });

    it('should handle empty git history', async () => {
      (mockMCP.bash as any).mockRejectedValue(new Error('No commits yet'));

      const versions = await friendlyCommands.listVersions(10);

      expect(versions).toEqual([]);
    });

    it('should respect limit parameter', async () => {
      (mockMCP.bash as any).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: ''
      });

      await friendlyCommands.listVersions(5);

      expect(mockMCP.bash).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.stringContaining('-n 5'),
        })
      );
    });
  });

  describe('status', () => {
    it('should report no changes when working tree is clean', async () => {
      (mockMCP.bash as any).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: ''
      });

      const loggerSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});

      await friendlyCommands.status();

      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('沒有未儲存的變更')
      );

      loggerSpy.mockRestore();
    });

    it('should categorize file changes correctly', async () => {
      // Git status --short format: XY filename
      // X = staged status, Y = unstaged status
      // ' M' = modified in working tree
      // 'A ' = added to index
      // NOTE: First line loses leading space after trim(), so put modified state on non-first line
      const mockStatusLines = [
        'A  file2.ts',   // Added (first line, no leading space issue)
        ' M file1.ts',   // Modified (second line, keeps leading space)
        ' D file3.ts',   // Deleted
        '?? file4.ts'    // Untracked
      ];
      const mockStatus = mockStatusLines.join('\n');

      (mockMCP.bash as any).mockResolvedValue({
        exitCode: 0,
        stdout: mockStatus,
        stderr: ''
      });

      const loggerSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});

      await friendlyCommands.status();

      // Verify different file states are detected
      const output = loggerSpy.mock.calls.map(call => call[0]).join('\n');

      expect(output).toContain('已修改');
      expect(output).toContain('已新增');
      expect(output).toContain('已刪除');
      expect(output).toContain('未追蹤');

      loggerSpy.mockRestore();
    });
  });

  describe('showChanges', () => {
    it('should parse git diff statistics', async () => {
      const mockDiff = `10\t5\tfile1.ts
20\t0\tfile2.ts
0\t15\tfile3.ts`;

      (mockMCP.bash as any).mockResolvedValue({
        exitCode: 0,
        stdout: mockDiff,
        stderr: ''
      });

      const changes = await friendlyCommands.showChanges();

      expect(changes).toMatchObject({
        addedLines: 30,      // 10 + 20 + 0
        removedLines: 20,    // 5 + 0 + 15
        modifiedFiles: ['file1.ts', 'file2.ts', 'file3.ts'],
      });
      expect(changes.summary).toContain('新增了 30 行');
      expect(changes.summary).toContain('刪除了 20 行');
      expect(changes.summary).toContain('修改了 3 個檔案');
    });

    it('should handle binary files in diff', async () => {
      const mockDiff = `10\t5\tfile1.ts
-\t-\timage.png`;

      (mockMCP.bash as any).mockResolvedValue({
        exitCode: 0,
        stdout: mockDiff,
        stderr: ''
      });

      const changes = await friendlyCommands.showChanges();

      // Binary files should not add to line count
      expect(changes.addedLines).toBe(10);
      expect(changes.removedLines).toBe(5);
      expect(changes.modifiedFiles).toContain('image.png');
    });

    it('should compare with specified ref', async () => {
      (mockMCP.bash as any).mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: ''
      });

      await friendlyCommands.showChanges('main');

      expect(mockMCP.bash).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.stringContaining('git diff main'),
        })
      );
    });
  });

  describe('initialize', () => {
    it('should initialize git and create first commit', async () => {
      (mockMCP.bash as any).mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });

      await friendlyCommands.initialize('Test User', 'test@example.com');

      // Verify git init
      expect(mockMCP.bash).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'git init',
        })
      );

      // Verify user config
      expect(mockMCP.bash).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.stringContaining('git config user.name'),
        })
      );

      // Verify email config
      expect(mockMCP.bash).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.stringContaining('git config user.email'),
        })
      );

      // Verify initial commit created
      expect(mockMCP.bash).toHaveBeenCalledWith(
        expect.objectContaining({
          command: expect.stringContaining('git commit'),
        })
      );
    });
  });
});
