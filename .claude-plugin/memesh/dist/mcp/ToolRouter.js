import { ValidationError, NotFoundError, OperationError } from '../errors/index.js';
import { handleBuddySecretStore, handleBuddySecretGet, handleBuddySecretList, handleBuddySecretDelete, } from './handlers/index.js';
import { a2aListTasks, A2AListTasksInputSchema } from './tools/a2a-list-tasks.js';
import { a2aReportResult, A2AReportResultInputSchema } from './tools/a2a-report-result.js';
const TOOL_NAME_REGEX = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;
const TOOL_NAME_MAX_LENGTH = 64;
function sanitizeToolNameForError(toolName) {
    if (typeof toolName !== 'string') {
        return '[non-string]';
    }
    const cleaned = toolName
        .replace(/[\x00-\x1F\x7F-\x9F]/g, '')
        .replace(/['"\\]/g, (ch) => `\\${ch}`)
        .substring(0, TOOL_NAME_MAX_LENGTH);
    return cleaned.length < toolName.length ? `${cleaned}...` : cleaned;
}
function validateToolName(toolName) {
    if (typeof toolName !== 'string') {
        throw new ValidationError('Tool name must be a string', {
            component: 'ToolRouter',
            method: 'validateToolName',
            providedType: typeof toolName,
        });
    }
    if (toolName.length === 0) {
        throw new ValidationError('Tool name cannot be empty', {
            component: 'ToolRouter',
            method: 'validateToolName',
        });
    }
    if (toolName.length > TOOL_NAME_MAX_LENGTH) {
        throw new ValidationError(`Tool name exceeds maximum length of ${TOOL_NAME_MAX_LENGTH} characters`, {
            component: 'ToolRouter',
            method: 'validateToolName',
            providedLength: toolName.length,
            maxLength: TOOL_NAME_MAX_LENGTH,
        });
    }
    if (!TOOL_NAME_REGEX.test(toolName)) {
        const safeName = sanitizeToolNameForError(toolName);
        throw new ValidationError(`Invalid tool name: '${safeName}'. Tool names must contain only lowercase alphanumeric characters, hyphens, and underscores, and must start and end with an alphanumeric character.`, {
            component: 'ToolRouter',
            method: 'validateToolName',
            providedName: safeName,
            pattern: TOOL_NAME_REGEX.source,
            hint: 'Example valid names: buddy-do, get-workflow-guidance, a2a-send-task',
        });
    }
}
export class ToolRouter {
    rateLimiter;
    toolHandlers;
    buddyHandlers;
    a2aHandlers;
    secretManager;
    taskQueue;
    mcpTaskDelegator;
    allowedOrigins;
    transportMode;
    constructor(config) {
        this.rateLimiter = config.rateLimiter;
        this.toolHandlers = config.toolHandlers;
        this.buddyHandlers = config.buddyHandlers;
        this.a2aHandlers = config.a2aHandlers;
        this.secretManager = config.secretManager;
        this.taskQueue = config.taskQueue;
        this.mcpTaskDelegator = config.mcpTaskDelegator;
        this.allowedOrigins = config.allowedOrigins;
        this.transportMode = config.transportMode || 'stdio';
    }
    validateRequestOrigin(origin) {
        if (this.transportMode === 'stdio') {
            return;
        }
        if (this.transportMode === 'http') {
            if (!this.allowedOrigins || this.allowedOrigins.length === 0) {
                throw new ValidationError('CSRF protection: No allowed origins configured for HTTP mode', {
                    component: 'ToolRouter',
                    method: 'validateRequestOrigin',
                    transportMode: this.transportMode,
                    hint: 'Configure allowedOrigins in ToolRouterConfig for HTTP transport',
                });
            }
            if (!origin) {
                throw new ValidationError('CSRF protection: Missing origin header', {
                    component: 'ToolRouter',
                    method: 'validateRequestOrigin',
                    transportMode: this.transportMode,
                });
            }
            if (!this.allowedOrigins.includes(origin)) {
                throw new ValidationError('CSRF protection: Invalid request origin', {
                    component: 'ToolRouter',
                    method: 'validateRequestOrigin',
                    providedOrigin: origin,
                    allowedOrigins: this.allowedOrigins,
                });
            }
        }
    }
    async routeToolCall(params, requestHeaders, requestId) {
        this.validateRequestOrigin(requestHeaders?.['origin']);
        if (!params ||
            typeof params !== 'object' ||
            !('name' in params) ||
            typeof params.name !== 'string' ||
            params.name.trim() === '' ||
            !('arguments' in params) ||
            !params.arguments ||
            typeof params.arguments !== 'object') {
            throw new ValidationError('Invalid request parameters', {
                component: 'ToolRouter',
                method: 'routeToolCall',
                requestId,
                providedParams: params,
                requiredFields: ['name (string, non-empty)', 'arguments (object)'],
            });
        }
        validateToolName(params.name);
        if (!this.rateLimiter.consume(1)) {
            const status = this.rateLimiter.getStatus();
            throw new OperationError('Rate limit exceeded. Please try again in a moment.', {
                component: 'ToolRouter',
                method: 'routeToolCall',
                requestId,
                rateLimitStatus: status,
                hint: 'Too many requests. The server allows up to 30 requests per minute.',
            });
        }
        const toolName = params.name;
        const args = params.arguments;
        return await this.dispatch(toolName, args);
    }
    async dispatch(toolName, args) {
        if (toolName === 'buddy-do') {
            return await this.buddyHandlers.handleBuddyDo(args);
        }
        if (toolName === 'buddy-remember') {
            return await this.buddyHandlers.handleBuddyRemember(args);
        }
        if (toolName === 'buddy-help') {
            return await this.buddyHandlers.handleBuddyHelp(args);
        }
        if (toolName === 'get-workflow-guidance') {
            return await this.toolHandlers.handleGetWorkflowGuidance(args);
        }
        if (toolName === 'get-session-health') {
            return await this.toolHandlers.handleGetSessionHealth();
        }
        if (toolName === 'hook-tool-use') {
            return await this.toolHandlers.handleHookToolUse(args);
        }
        if (toolName === 'buddy-record-mistake') {
            return await this.toolHandlers.handleBuddyRecordMistake(args);
        }
        if (toolName === 'create-entities') {
            return await this.toolHandlers.handleCreateEntities(args);
        }
        if (toolName === 'generate-tests') {
            return await this.toolHandlers.handleGenerateTests(args);
        }
        if (toolName === 'buddy-secret-store') {
            if (!this.secretManager) {
                throw new OperationError('Secret management is not configured', {
                    component: 'ToolRouter',
                    method: 'dispatch',
                    toolName,
                });
            }
            return await handleBuddySecretStore(args, this.secretManager);
        }
        if (toolName === 'buddy-secret-get') {
            if (!this.secretManager) {
                throw new OperationError('Secret management is not configured', {
                    component: 'ToolRouter',
                    method: 'dispatch',
                    toolName,
                });
            }
            return await handleBuddySecretGet(args, this.secretManager);
        }
        if (toolName === 'buddy-secret-list') {
            if (!this.secretManager) {
                throw new OperationError('Secret management is not configured', {
                    component: 'ToolRouter',
                    method: 'dispatch',
                    toolName,
                });
            }
            return await handleBuddySecretList(args, this.secretManager);
        }
        if (toolName === 'buddy-secret-delete') {
            if (!this.secretManager) {
                throw new OperationError('Secret management is not configured', {
                    component: 'ToolRouter',
                    method: 'dispatch',
                    toolName,
                });
            }
            return await handleBuddySecretDelete(args, this.secretManager);
        }
        if (toolName === 'a2a-send-task') {
            return await this.a2aHandlers.handleA2ASendTask(args);
        }
        if (toolName === 'a2a-get-task') {
            return await this.a2aHandlers.handleA2AGetTask(args);
        }
        if (toolName === 'a2a-list-tasks') {
            if (!this.mcpTaskDelegator) {
                throw new OperationError('MCPTaskDelegator is not configured', {
                    component: 'ToolRouter',
                    method: 'dispatch',
                    toolName,
                });
            }
            const validationResult = A2AListTasksInputSchema.safeParse(args);
            if (!validationResult.success) {
                throw new ValidationError(`Invalid input for ${toolName}: ${validationResult.error.message}`, {
                    component: 'ToolRouter',
                    method: 'dispatch',
                    toolName,
                    zodError: validationResult.error,
                });
            }
            return await a2aListTasks(validationResult.data, this.mcpTaskDelegator);
        }
        if (toolName === 'a2a-list-agents') {
            return await this.a2aHandlers.handleA2AListAgents(args);
        }
        if (toolName === 'a2a-report-result') {
            if (!this.taskQueue || !this.mcpTaskDelegator) {
                throw new OperationError('TaskQueue or MCPTaskDelegator is not configured', {
                    component: 'ToolRouter',
                    method: 'dispatch',
                    toolName,
                });
            }
            const validationResult = A2AReportResultInputSchema.safeParse(args);
            if (!validationResult.success) {
                throw new ValidationError(`Invalid input for ${toolName}: ${validationResult.error.message}`, {
                    component: 'ToolRouter',
                    method: 'dispatch',
                    toolName,
                    zodError: validationResult.error,
                });
            }
            return await a2aReportResult(validationResult.data, this.taskQueue, this.mcpTaskDelegator);
        }
        const safeName = sanitizeToolNameForError(toolName);
        throw new NotFoundError(`Unknown tool: ${safeName}`, 'tool', safeName);
    }
}
//# sourceMappingURL=ToolRouter.js.map