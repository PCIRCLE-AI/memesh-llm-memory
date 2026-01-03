import { ValidationError, NotFoundError, OperationError } from '../errors/index.js';
import { logError } from '../utils/errorHandler.js';
import { z } from 'zod';
import { TaskInputSchema, formatValidationError } from './validation.js';
import { CreateBackupInputSchema, ListBackupsInputSchema, RestoreBackupInputSchema, CleanBackupsInputSchema, BackupStatsInputSchema, executeCreateBackup, executeListBackups, executeRestoreBackup, executeCleanBackups, executeBackupStats, } from './tools/database-backup.js';
export class ToolRouter {
    router;
    formatter;
    agentRegistry;
    rateLimiter;
    gitHandlers;
    toolHandlers;
    buddyHandlers;
    constructor(config) {
        this.router = config.router;
        this.formatter = config.formatter;
        this.agentRegistry = config.agentRegistry;
        this.rateLimiter = config.rateLimiter;
        this.gitHandlers = config.gitHandlers;
        this.toolHandlers = config.toolHandlers;
        this.buddyHandlers = config.buddyHandlers;
    }
    async routeToolCall(params) {
        if (!params ||
            typeof params !== 'object' ||
            !('name' in params) ||
            typeof params.name !== 'string' ||
            !('arguments' in params) ||
            !params.arguments ||
            typeof params.arguments !== 'object') {
            throw new ValidationError('Invalid request parameters', {
                component: 'ToolRouter',
                method: 'routeToolCall',
                providedParams: params,
                requiredFields: ['name (string)', 'arguments (object)'],
            });
        }
        if (!this.rateLimiter.consume(1)) {
            const status = this.rateLimiter.getStatus();
            throw new OperationError('Rate limit exceeded. Please try again in a moment.', {
                component: 'ToolRouter',
                method: 'routeToolCall',
                rateLimitStatus: status,
                hint: 'Too many requests. The server allows up to 30 requests per minute.',
            });
        }
        const toolName = params.name;
        const args = params.arguments;
        return await this.dispatch(toolName, args);
    }
    async dispatch(toolName, args) {
        if (toolName === 'buddy_agents') {
            return await this.toolHandlers.handleListAgents();
        }
        if (toolName === 'buddy_skills') {
            return await this.toolHandlers.handleListSkills(args);
        }
        if (toolName === 'buddy_uninstall') {
            return await this.toolHandlers.handleUninstall(args);
        }
        if (toolName === 'buddy_do') {
            return await this.buddyHandlers.handleBuddyDo(args);
        }
        if (toolName === 'buddy_stats') {
            return await this.buddyHandlers.handleBuddyStats(args);
        }
        if (toolName === 'buddy_remember') {
            return await this.buddyHandlers.handleBuddyRemember(args);
        }
        if (toolName === 'buddy_help') {
            return await this.buddyHandlers.handleBuddyHelp(args);
        }
        if (toolName === 'get-workflow-guidance') {
            return await this.toolHandlers.handleGetWorkflowGuidance(args);
        }
        if (toolName === 'get-session-health') {
            return await this.toolHandlers.handleGetSessionHealth();
        }
        if (toolName === 'reload-context') {
            return await this.toolHandlers.handleReloadContext(args);
        }
        if (toolName === 'record-token-usage') {
            return await this.toolHandlers.handleRecordTokenUsage(args);
        }
        if (toolName === 'generate-smart-plan') {
            return await this.toolHandlers.handleGenerateSmartPlan(args);
        }
        if (toolName === 'git-save-work') {
            return await this.gitHandlers.handleGitSaveWork(args);
        }
        if (toolName === 'git-list-versions') {
            return await this.gitHandlers.handleGitListVersions(args);
        }
        if (toolName === 'git-status') {
            return await this.gitHandlers.handleGitStatus(args);
        }
        if (toolName === 'git-show-changes') {
            return await this.gitHandlers.handleGitShowChanges(args);
        }
        if (toolName === 'git-go-back') {
            return await this.gitHandlers.handleGitGoBack(args);
        }
        if (toolName === 'git-create-backup') {
            return await this.gitHandlers.handleGitCreateBackup(args);
        }
        if (toolName === 'git-setup') {
            return await this.gitHandlers.handleGitSetup(args);
        }
        if (toolName === 'git-help') {
            return await this.gitHandlers.handleGitHelp(args);
        }
        if (toolName === 'recall-memory') {
            return await this.toolHandlers.handleRecallMemory(args);
        }
        if (toolName === 'create-entities') {
            return await this.toolHandlers.handleCreateEntities(args);
        }
        if (toolName === 'add-observations') {
            return await this.toolHandlers.handleAddObservations(args);
        }
        if (toolName === 'create-relations') {
            return await this.toolHandlers.handleCreateRelations(args);
        }
        if (toolName === 'devops-generate-ci-config') {
            return await this.toolHandlers.handleGenerateCIConfig(args);
        }
        if (toolName === 'devops-analyze-deployment') {
            return await this.toolHandlers.handleAnalyzeDeployment(args);
        }
        if (toolName === 'devops-setup-ci') {
            return await this.toolHandlers.handleSetupCI(args);
        }
        if (toolName === 'workflow-create') {
            return await this.toolHandlers.handleCreateWorkflow(args);
        }
        if (toolName === 'workflow-list') {
            return await this.toolHandlers.handleListWorkflows(args);
        }
        if (toolName === 'create_database_backup') {
            try {
                const validatedInput = CreateBackupInputSchema.parse(args);
                return await executeCreateBackup(validatedInput, this.formatter);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'ToolRouter',
                        method: 'dispatch',
                        schema: 'CreateBackupInputSchema',
                        providedArgs: args,
                    });
                }
                throw error;
            }
        }
        if (toolName === 'list_database_backups') {
            try {
                const validatedInput = ListBackupsInputSchema.parse(args);
                return await executeListBackups(validatedInput, this.formatter);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'ToolRouter',
                        method: 'dispatch',
                        schema: 'ListBackupsInputSchema',
                        providedArgs: args,
                    });
                }
                throw error;
            }
        }
        if (toolName === 'restore_database_backup') {
            try {
                const validatedInput = RestoreBackupInputSchema.parse(args);
                return await executeRestoreBackup(validatedInput, this.formatter);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'ToolRouter',
                        method: 'dispatch',
                        schema: 'RestoreBackupInputSchema',
                        providedArgs: args,
                    });
                }
                throw error;
            }
        }
        if (toolName === 'clean_database_backups') {
            try {
                const validatedInput = CleanBackupsInputSchema.parse(args);
                return await executeCleanBackups(validatedInput, this.formatter);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'ToolRouter',
                        method: 'dispatch',
                        schema: 'CleanBackupsInputSchema',
                        providedArgs: args,
                    });
                }
                throw error;
            }
        }
        if (toolName === 'get_backup_stats') {
            try {
                const validatedInput = BackupStatsInputSchema.parse(args);
                return await executeBackupStats(validatedInput, this.formatter);
            }
            catch (error) {
                if (error instanceof z.ZodError) {
                    throw new ValidationError(formatValidationError(error), {
                        component: 'ToolRouter',
                        method: 'dispatch',
                        schema: 'BackupStatsInputSchema',
                        providedArgs: args,
                    });
                }
                throw error;
            }
        }
        return await this.handleAgentInvocation(toolName, args);
    }
    async handleAgentInvocation(agentName, args) {
        let validatedInput;
        try {
            validatedInput = TaskInputSchema.parse(args);
        }
        catch (error) {
            if (error instanceof z.ZodError) {
                logError(error, {
                    component: 'ToolRouter',
                    method: 'handleAgentInvocation',
                    operation: 'validating task input schema',
                    data: { agentName, schema: 'TaskInputSchema' },
                });
                throw new ValidationError(formatValidationError(error), {
                    component: 'ToolRouter',
                    method: 'handleAgentInvocation',
                    schema: 'TaskInputSchema',
                    providedArgs: args,
                });
            }
            logError(error, {
                component: 'ToolRouter',
                method: 'handleAgentInvocation',
                operation: 'parsing task input',
                data: { agentName },
            });
            throw error;
        }
        const taskDescription = validatedInput.taskDescription || validatedInput.task_description;
        const priority = validatedInput.priority;
        try {
            if (!this.isValidAgent(agentName)) {
                throw new NotFoundError(`Unknown agent: ${agentName}`, 'agent', agentName, { availableAgents: this.agentRegistry.getAllAgents().map(a => a.name) });
            }
            const task = {
                id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                description: taskDescription,
                priority,
            };
            const startTime = Date.now();
            const result = await this.router.routeTask(task);
            const duration = Date.now() - startTime;
            const agentResponse = {
                agentType: result.routing.selectedAgent,
                taskDescription: task.description,
                status: result.approved ? 'success' : 'error',
                enhancedPrompt: result.routing.enhancedPrompt,
                metadata: {
                    duration,
                    tokensUsed: result.analysis.estimatedTokens,
                    model: result.routing.enhancedPrompt.suggestedModel,
                },
            };
            if (!result.approved) {
                agentResponse.status = 'error';
                agentResponse.error = new Error(result.message);
            }
            const formattedOutput = this.formatter.format(agentResponse);
            return {
                content: [
                    {
                        type: 'text',
                        text: formattedOutput,
                    },
                ],
            };
        }
        catch (error) {
            logError(error, {
                component: 'ToolRouter',
                method: 'handleAgentInvocation',
                operation: `routing task to agent: ${agentName}`,
                data: { agentName, taskDescription: taskDescription.substring(0, 100) },
            });
            const errorResponse = {
                agentType: agentName,
                taskDescription: taskDescription,
                status: 'error',
                error: error instanceof Error ? error : new Error(String(error)),
            };
            const formattedError = this.formatter.format(errorResponse);
            return {
                content: [
                    {
                        type: 'text',
                        text: formattedError,
                    },
                ],
                isError: true,
            };
        }
    }
    isValidAgent(name) {
        return this.agentRegistry.hasAgent(name);
    }
}
//# sourceMappingURL=ToolRouter.js.map