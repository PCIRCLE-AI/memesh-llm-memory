import { z } from 'zod';
import { ValidationError } from '../../errors/index.js';
import { handleError, logError } from '../../utils/errorHandler.js';
import { GitSaveWorkInputSchema, GitListVersionsInputSchema, GitShowChangesInputSchema, GitGoBackInputSchema, GitSetupInputSchema, formatValidationError, } from '../validation.js';
export class GitHandlers {
    gitAssistant;
    constructor(gitAssistant) {
        this.gitAssistant = gitAssistant;
    }
    async handleGitSaveWork(args) {
        try {
            let validatedInput;
            try {
                validatedInput = GitSaveWorkInputSchema.parse(args);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'GitHandlers',
                        method: 'handleGitSaveWork',
                        schema: 'GitSaveWorkInputSchema',
                        providedArgs: args,
                    });
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
        }
        catch (error) {
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
    async handleGitListVersions(args) {
        try {
            let validatedInput;
            try {
                validatedInput = GitListVersionsInputSchema.parse(args);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'GitHandlers',
                        method: 'handleGitListVersions',
                        schema: 'GitListVersionsInputSchema',
                        providedArgs: args,
                    });
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
        }
        catch (error) {
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
    async handleGitStatus(_args) {
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
        }
        catch (error) {
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
    async handleGitShowChanges(args) {
        try {
            let validatedInput;
            try {
                validatedInput = GitShowChangesInputSchema.parse(args);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'GitHandlers',
                        method: 'handleGitShowChanges',
                        schema: 'GitShowChangesInputSchema',
                        providedArgs: args,
                    });
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
        }
        catch (error) {
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
    async handleGitGoBack(args) {
        try {
            let validatedInput;
            try {
                validatedInput = GitGoBackInputSchema.parse(args);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'GitHandlers',
                        method: 'handleGitGoBack',
                        schema: 'GitGoBackInputSchema',
                        providedArgs: args,
                    });
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
        }
        catch (error) {
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
    async handleGitCreateBackup(_args) {
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
        }
        catch (error) {
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
    async handleGitSetup(args) {
        try {
            let validatedInput;
            try {
                validatedInput = GitSetupInputSchema.parse(args);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'GitHandlers',
                        method: 'handleGitSetup',
                        schema: 'GitSetupInputSchema',
                        providedArgs: args,
                    });
                }
                throw error;
            }
            if (validatedInput.existingGit) {
                await this.gitAssistant.configureExistingProject();
            }
            else {
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
        }
        catch (error) {
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
    async handleGitHelp(_args) {
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
        }
        catch (error) {
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
//# sourceMappingURL=GitHandlers.js.map