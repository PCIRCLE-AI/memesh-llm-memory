/**
 * Git Assistant Handler Module
 *
 * Provides user-friendly Git operations through MCP tools. Simplifies common
 * Git workflows with natural language commands and educational feedback.
 *
 * **Supported Operations**:
 * - Save work (commit with auto-generated messages)
 * - List versions (commit history)
 * - Show changes (diff viewing)
 * - Go back (restore previous versions)
 * - Create backups (emergency snapshots)
 * - Setup Git (repository initialization)
 * - Get help (command documentation)
 *
 * **Design Philosophy**:
 * - Hide Git complexity from users
 * - Provide educational feedback
 * - Prevent destructive operations without confirmation
 * - Auto-backup before risky operations
 *
 * @module GitHandlers
 */

import { z } from 'zod';
import { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { GitAssistantIntegration } from '../../integrations/GitAssistantIntegration.js';
import { ValidationError } from '../../errors/index.js';
import { logError, formatErrorWithSuggestion } from '../../utils/errorHandler.js';
import {
  GitSaveWorkInputSchema,
  GitListVersionsInputSchema,
  GitShowChangesInputSchema,
  GitGoBackInputSchema,
  GitSetupInputSchema,
  formatValidationError,
  type ValidatedGitSaveWorkInput,
  type ValidatedGitListVersionsInput,
  type ValidatedGitShowChangesInput,
  type ValidatedGitGoBackInput,
  type ValidatedGitSetupInput,
} from '../validation.js';

/**
 * Git Handler Class
 *
 * Provides MCP tool handlers for Git operations. Each method validates input,
 * delegates to GitAssistantIntegration, and returns formatted responses.
 *
 * **Error Handling**:
 * - Input validation using Zod schemas
 * - Structured error logging with context
 * - User-friendly error messages
 * - Automatic error recovery where possible
 *
 * **Response Format**:
 * All methods return CallToolResult shape:
 * ```typescript
 * {
 *   content: [{ type: 'text', text: '...' }]
 * }
 * ```
 */
export class GitHandlers {
  private gitAssistant: GitAssistantIntegration;

  /**
   * Create a new GitHandlers instance
   *
   * @param gitAssistant - Git integration service
   */
  constructor(gitAssistant: GitAssistantIntegration) {
    this.gitAssistant = gitAssistant;
  }

  /**
   * Handle git-save-work tool
   *
   * Saves current work with a descriptive commit message. Optionally creates
   * a backup before committing for extra safety.
   *
   * **Workflow**:
   * 1. Stage all changes (git add .)
   * 2. Create backup if autoBackup=true
   * 3. Commit with provided description
   * 4. Show success confirmation
   *
   * @param args - Save work arguments
   * @param args.description - Commit message describing the changes
   * @param args.autoBackup - Create backup before committing (default: false)
   * @returns Promise resolving to success confirmation
   *
   * @throws ValidationError if input validation fails
   * @throws OperationError if Git operations fail
   *
   * @example
   * ```typescript
   * await handleGitSaveWork({
   *   description: 'Implement user authentication',
   *   autoBackup: true
   * });
   * // ✅ Work saved successfully with description: "Implement user authentication"
   * ```
   */
  async handleGitSaveWork(
    args: unknown
  ): Promise<CallToolResult> {
    try {
      let validatedInput: ValidatedGitSaveWorkInput;
      try {
        validatedInput = GitSaveWorkInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'GitHandlers',
              method: 'handleGitSaveWork',
              schema: 'GitSaveWorkInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      await this.gitAssistant.saveWork(validatedInput.description, validatedInput.autoBackup);

      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Work saved successfully with description: "${validatedInput.description}"`,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'GitHandlers',
        method: 'handleGitSaveWork',
        operation: 'saving work',
        data: { args },
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: formatErrorWithSuggestion(error, 'save work'),
          },
        ],
      };
    }
  }

  /**
   * Handle git-list-versions tool
   */
  async handleGitListVersions(
    args: unknown
  ): Promise<CallToolResult> {
    try {
      let validatedInput: ValidatedGitListVersionsInput;
      try {
        validatedInput = GitListVersionsInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'GitHandlers',
              method: 'handleGitListVersions',
              schema: 'GitListVersionsInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      const versions = await this.gitAssistant.listVersions(validatedInput.limit);

      // Format versions for human readability
      const formattedVersions = this.formatVersionsList(versions, validatedInput.limit);

      return {
        content: [
          {
            type: 'text' as const,
            text: formattedVersions,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'GitHandlers',
        method: 'handleGitListVersions',
        operation: 'listing versions',
        data: { args },
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: formatErrorWithSuggestion(error, 'list versions'),
          },
        ],
      };
    }
  }

  /**
   * Handle git-status tool
   */
  async handleGitStatus(
    _args: unknown
  ): Promise<CallToolResult> {
    try {
      await this.gitAssistant.status();

      return {
        content: [
          {
            type: 'text' as const,
            text: '✅ Git status displayed',
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'GitHandlers',
        method: 'handleGitStatus',
        operation: 'getting git status',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: formatErrorWithSuggestion(error, 'get status'),
          },
        ],
      };
    }
  }

  /**
   * Handle git-show-changes tool
   */
  async handleGitShowChanges(
    args: unknown
  ): Promise<CallToolResult> {
    try {
      let validatedInput: ValidatedGitShowChangesInput;
      try {
        validatedInput = GitShowChangesInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'GitHandlers',
              method: 'handleGitShowChanges',
              schema: 'GitShowChangesInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      const changes = await this.gitAssistant.showChanges(validatedInput.compareWith);

      // Format changes for human readability
      const formattedChanges = this.formatChangesSummary(changes);

      return {
        content: [
          {
            type: 'text' as const,
            text: formattedChanges,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'GitHandlers',
        method: 'handleGitShowChanges',
        operation: 'showing changes',
        data: { args },
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: formatErrorWithSuggestion(error, 'show changes'),
          },
        ],
      };
    }
  }

  /**
   * Handle git-go-back tool
   *
   * Restores the project to a previous version. Can restore by:
   * - Commit hash (e.g., "abc123")
   * - Relative reference (e.g., "HEAD~2")
   * - Tag name (e.g., "v1.0.0")
   *
   * **Safety**:
   * - Creates automatic backup before restoration
   * - Shows preview of changes before applying
   * - Preserves uncommitted changes in stash
   *
   * @param args - Go back arguments
   * @param args.identifier - Version identifier (commit hash, reference, or tag)
   * @returns Promise resolving to success confirmation
   *
   * @throws ValidationError if identifier is invalid
   * @throws OperationError if Git reset fails
   *
   * @example
   * ```typescript
   * // Go back 2 commits
   * await handleGitGoBack({ identifier: 'HEAD~2' });
   *
   * // Restore specific commit
   * await handleGitGoBack({ identifier: 'abc123' });
   *
   * // Restore tagged version
   * await handleGitGoBack({ identifier: 'v1.0.0' });
   * ```
   */
  async handleGitGoBack(
    args: unknown
  ): Promise<CallToolResult> {
    try {
      let validatedInput: ValidatedGitGoBackInput;
      try {
        validatedInput = GitGoBackInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'GitHandlers',
              method: 'handleGitGoBack',
              schema: 'GitGoBackInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      await this.gitAssistant.goBackTo(validatedInput.identifier);

      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Successfully went back to version: ${validatedInput.identifier}`,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'GitHandlers',
        method: 'handleGitGoBack',
        operation: 'going back to version',
        data: { args },
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: formatErrorWithSuggestion(error, 'go back to version'),
          },
        ],
      };
    }
  }

  /**
   * Handle git-create-backup tool
   */
  async handleGitCreateBackup(
    _args: unknown
  ): Promise<CallToolResult> {
    try {
      const backupPath = await this.gitAssistant.createBackup();

      return {
        content: [
          {
            type: 'text' as const,
            text: `✅ Backup created at: ${backupPath}`,
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'GitHandlers',
        method: 'handleGitCreateBackup',
        operation: 'creating backup',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: formatErrorWithSuggestion(error, 'create backup'),
          },
        ],
      };
    }
  }

  /**
   * Handle git-setup tool
   */
  async handleGitSetup(
    args: unknown
  ): Promise<CallToolResult> {
    try {
      let validatedInput: ValidatedGitSetupInput;
      try {
        validatedInput = GitSetupInputSchema.parse(args);
      } catch (error) {
        if (error instanceof z.ZodError) {
          throw new ValidationError(
            formatValidationError(error),
            {
              component: 'GitHandlers',
              method: 'handleGitSetup',
              schema: 'GitSetupInputSchema',
              providedArgs: args,
            }
          );
        }
        throw error;
      }

      if (validatedInput.existingGit) {
        await this.gitAssistant.configureExistingProject();
      } else {
        await this.gitAssistant.setupNewProject();
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: '✅ Git setup completed successfully',
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'GitHandlers',
        method: 'handleGitSetup',
        operation: 'setting up git',
        data: { args },
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: formatErrorWithSuggestion(error, 'setup git'),
          },
        ],
      };
    }
  }

  /**
   * Handle git-help tool
   */
  async handleGitHelp(
    _args: unknown
  ): Promise<CallToolResult> {
    try {
      await this.gitAssistant.showHelp();

      return {
        content: [
          {
            type: 'text' as const,
            text: '✅ Git Assistant help displayed',
          },
        ],
      };
    } catch (error) {
      logError(error, {
        component: 'GitHandlers',
        method: 'handleGitHelp',
        operation: 'showing help',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: formatErrorWithSuggestion(error, 'show help'),
          },
        ],
      };
    }
  }

  // ==================== Formatting Helper Methods ====================

  /**
   * Format version list for human readability
   *
   * @param versions - Array of version info objects
   * @param limit - Number of versions requested
   * @returns Formatted string
   */
  private formatVersionsList(versions: Array<{
    number: number;
    hash: string;
    message: string;
    author: string;
    date: Date;
    timeAgo: string;
  }>, limit: number): string {
    if (versions.length === 0) {
      return '📚 No versions found.\n\nPossible reasons:\n• Not a git repository (run git-setup first)\n• Repository has no commits yet\n• Current directory is not the project root';
    }

    const lines: string[] = [];
    lines.push(`📚 Recent Versions (${versions.length} of ${limit} requested):`);
    lines.push('');

    for (const v of versions) {
      lines.push(`${v.number}. [${v.hash}] ${v.message}`);
      lines.push(`   👤 ${v.author} | 🕐 ${v.timeAgo}`);
      lines.push('');
    }

    // Only show tip with example if we have versions
    if (versions.length > 0) {
      lines.push('💡 Tip: Use git-go-back with version number (e.g., "2") or hash (e.g., "' + versions[0].hash + '") to restore');
    }

    return lines.join('\n');
  }

  /**
   * Format changes summary for human readability
   *
   * @param changes - Changes summary object
   * @returns Formatted string
   */
  private formatChangesSummary(changes: {
    addedLines: number;
    removedLines: number;
    modifiedFiles: string[];
    summary: string;
  }): string {
    if (changes.modifiedFiles.length === 0 && changes.addedLines === 0 && changes.removedLines === 0) {
      return '📊 No changes detected compared to the previous version.';
    }

    const lines: string[] = [];
    lines.push('📊 Changes Summary:');
    lines.push('');
    lines.push(`✅ Added: ${changes.addedLines} lines`);
    lines.push(`❌ Removed: ${changes.removedLines} lines`);
    lines.push(`📁 Modified: ${changes.modifiedFiles.length} files`);

    if (changes.modifiedFiles.length > 0) {
      lines.push('');
      lines.push('📝 Modified Files:');
      const filesToShow = changes.modifiedFiles.slice(0, 10);
      for (const file of filesToShow) {
        lines.push(`  • ${file}`);
      }
      if (changes.modifiedFiles.length > 10) {
        lines.push(`  ... and ${changes.modifiedFiles.length - 10} more files`);
      }
    }

    return lines.join('\n');
  }
}
