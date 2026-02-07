import { ValidationError, NotFoundError, OperationError } from '../errors/index.js';
import { handleCloudSync, CloudSyncInputSchema } from './tools/memesh-cloud-sync.js';
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
            hint: 'Example valid names: buddy-do, memesh-remember, memesh-create-entities',
        });
    }
}
export class ToolRouter {
    rateLimiter;
    toolHandlers;
    buddyHandlers;
    knowledgeGraph;
    allowedOrigins;
    transportMode;
    constructor(config) {
        this.rateLimiter = config.rateLimiter;
        this.toolHandlers = config.toolHandlers;
        this.buddyHandlers = config.buddyHandlers;
        this.knowledgeGraph = config.knowledgeGraph;
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
    static TOOL_ALIASES = {
        'buddy-record-mistake': 'memesh-record-mistake',
        'create-entities': 'memesh-create-entities',
        'hook-tool-use': 'memesh-hook-tool-use',
        'generate-tests': 'memesh-generate-tests',
    };
    resolveAlias(toolName) {
        const canonicalName = ToolRouter.TOOL_ALIASES[toolName];
        if (canonicalName) {
            console.warn(`⚠️  DEPRECATION WARNING: Tool '${toolName}' is deprecated and will be removed in v3.0.0.\n` +
                `   Please use '${canonicalName}' instead.\n` +
                `   Migration guide: https://github.com/PCIRCLE-AI/claude-code-buddy/blob/main/docs/UPGRADE.md#v280-migration-guide-2026-02-08`);
            return canonicalName;
        }
        return toolName;
    }
    async dispatch(toolName, args) {
        const resolvedToolName = this.resolveAlias(toolName);
        if (resolvedToolName === 'buddy-do') {
            return await this.buddyHandlers.handleBuddyDo(args);
        }
        if (resolvedToolName === 'buddy-remember') {
            return await this.buddyHandlers.handleBuddyRemember(args);
        }
        if (resolvedToolName === 'buddy-help') {
            return await this.buddyHandlers.handleBuddyHelp(args);
        }
        if (resolvedToolName === 'memesh-hook-tool-use') {
            return await this.toolHandlers.handleHookToolUse(args);
        }
        if (resolvedToolName === 'memesh-record-mistake') {
            return await this.toolHandlers.handleBuddyRecordMistake(args);
        }
        if (resolvedToolName === 'memesh-create-entities') {
            return await this.toolHandlers.handleCreateEntities(args);
        }
        if (resolvedToolName === 'memesh-generate-tests') {
            return await this.toolHandlers.handleGenerateTests(args);
        }
        if (resolvedToolName === 'memesh-cloud-sync') {
            const validationResult = CloudSyncInputSchema.safeParse(args);
            if (!validationResult.success) {
                throw new ValidationError(`Invalid input for ${resolvedToolName}: ${validationResult.error.message}`, { component: 'ToolRouter', method: 'dispatch', toolName: resolvedToolName, zodError: validationResult.error });
            }
            return handleCloudSync(validationResult.data, this.knowledgeGraph);
        }
        const safeName = sanitizeToolNameForError(resolvedToolName);
        throw new NotFoundError(`Unknown tool: ${safeName}`, 'tool', safeName);
    }
}
//# sourceMappingURL=ToolRouter.js.map