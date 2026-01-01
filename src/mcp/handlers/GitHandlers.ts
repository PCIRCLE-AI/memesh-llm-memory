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
import { handleError, logError, formatMCPError } from '../../utils/errorHandler.js';
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

      const handled = handleError(error, {
        component: 'GitHandlers',
        method: 'handleGitSaveWork',
        operation: 'saving work',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Failed to save work: ${handled.message}`,
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

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(versions, null, 2),
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

      const handled = handleError(error, {
        component: 'GitHandlers',
        method: 'handleGitListVersions',
        operation: 'listing versions',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Failed to list versions: ${handled.message}`,
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

      const handled = handleError(error, {
        component: 'GitHandlers',
        method: 'handleGitStatus',
        operation: 'getting git status',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Failed to get status: ${handled.message}`,
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

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(changes, null, 2),
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

      const handled = handleError(error, {
        component: 'GitHandlers',
        method: 'handleGitShowChanges',
        operation: 'showing changes',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Failed to show changes: ${handled.message}`,
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

      const handled = handleError(error, {
        component: 'GitHandlers',
        method: 'handleGitGoBack',
        operation: 'going back to version',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Failed to go back: ${handled.message}`,
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

      const handled = handleError(error, {
        component: 'GitHandlers',
        method: 'handleGitCreateBackup',
        operation: 'creating backup',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Failed to create backup: ${handled.message}`,
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

      const handled = handleError(error, {
        component: 'GitHandlers',
        method: 'handleGitSetup',
        operation: 'setting up git',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Git setup failed: ${handled.message}`,
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

      const handled = handleError(error, {
        component: 'GitHandlers',
        method: 'handleGitHelp',
        operation: 'showing help',
      });

      return {
        content: [
          {
            type: 'text' as const,
            text: `❌ Failed to show help: ${handled.message}`,
          },
        ],
      };
    }
  }
}
