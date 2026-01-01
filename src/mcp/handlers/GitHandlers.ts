/**
 * Git Assistant Handler Module
 *
 * Handles all Git-related MCP tool calls.
 * Extracted from server.ts for better modularity.
 */

import { z } from 'zod';
import { GitAssistantIntegration } from '../../integrations/GitAssistantIntegration.js';
import { ValidationError } from '../../errors/index.js';
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to save work: ${errorMessage}`,
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to list versions: ${errorMessage}`,
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to get status: ${errorMessage}`,
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to show changes: ${errorMessage}`,
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to go back: ${errorMessage}`,
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to create backup: ${errorMessage}`,
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Git setup failed: ${errorMessage}`,
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
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Failed to show help: ${errorMessage}`,
          },
        ],
      };
    }
  }
}
