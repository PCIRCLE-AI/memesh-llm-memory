/**
 * Git Assistant Handler Module
 *
 * Handles all Git-related MCP tool calls.
 * Extracted from server.ts for better modularity.
 */

import { z } from 'zod';
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
 * Encapsulates all Git Assistant tool handlers
 */
export class GitHandlers {
  private gitAssistant: GitAssistantIntegration;

  constructor(gitAssistant: GitAssistantIntegration) {
    this.gitAssistant = gitAssistant;
  }

  /**
   * Handle git-save-work tool
   */
  async handleGitSaveWork(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
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
            type: 'text',
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
            type: 'text',
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
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
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
            type: 'text',
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
            type: 'text',
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
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      await this.gitAssistant.status();

      return {
        content: [
          {
            type: 'text',
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
            type: 'text',
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
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
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
            type: 'text',
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
            type: 'text',
            text: `❌ Failed to show changes: ${handled.message}`,
          },
        ],
      };
    }
  }

  /**
   * Handle git-go-back tool
   */
  async handleGitGoBack(
    args: unknown
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
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
            type: 'text',
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
            type: 'text',
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
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      const backupPath = await this.gitAssistant.createBackup();

      return {
        content: [
          {
            type: 'text',
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
            type: 'text',
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
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
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
            type: 'text',
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
            type: 'text',
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
  ): Promise<{ content: Array<{ type: string; text: string }> }> {
    try {
      await this.gitAssistant.showHelp();

      return {
        content: [
          {
            type: 'text',
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
            type: 'text',
            text: `❌ Failed to show help: ${handled.message}`,
          },
        ],
      };
    }
  }
}
