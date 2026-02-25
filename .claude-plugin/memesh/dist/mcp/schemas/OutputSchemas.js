export const OutputSchemas = {
    buddyDo: {
        type: 'object',
        properties: {
            message: {
                type: 'string',
                description: 'Formatted task proposal with analysis, approach, and related context',
            },
            confirmationRequired: {
                type: 'boolean',
                description: 'Whether user confirmation is needed before proceeding',
            },
            stats: {
                type: 'object',
                properties: {
                    durationMs: { type: 'number' },
                    taskType: { type: 'string' },
                    relatedContextCount: { type: 'number' },
                },
            },
        },
        required: ['message', 'confirmationRequired'],
    },
    buddyRemember: {
        type: 'object',
        properties: {
            query: { type: 'string' },
            count: { type: 'number' },
            memories: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        content: { type: 'string' },
                        type: { type: 'string' },
                        timestamp: { type: 'string' },
                        relevance: { type: 'number' },
                    },
                },
            },
            suggestions: {
                type: 'array',
                items: { type: 'string' },
            },
        },
        required: ['query', 'count'],
    },
    buddyHelp: {
        type: 'object',
        properties: {
            commands: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        description: { type: 'string' },
                        usage: { type: 'string' },
                        examples: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                    },
                    required: ['name', 'description'],
                },
            },
        },
        required: ['commands'],
    },
    hookToolUse: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            recorded: {
                type: 'object',
                properties: {
                    toolName: { type: 'string' },
                    timestamp: { type: 'string' },
                    success: { type: 'boolean' },
                },
            },
        },
        required: ['success', 'message'],
    },
    buddyRecordMistake: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            mistakeId: { type: 'string' },
            message: { type: 'string' },
            details: {
                type: 'object',
                properties: {
                    action: { type: 'string' },
                    errorType: { type: 'string' },
                    userCorrection: { type: 'string' },
                    correctMethod: { type: 'string' },
                    impact: { type: 'string' },
                    preventionMethod: { type: 'string' },
                    timestamp: { type: 'string' },
                },
                required: ['action', 'errorType', 'userCorrection', 'correctMethod', 'impact', 'preventionMethod', 'timestamp'],
            },
        },
        required: ['success', 'message'],
    },
    createEntities: {
        type: 'object',
        properties: {
            created: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of successfully created entity names',
            },
            count: { type: 'number' },
            errors: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        name: { type: 'string' },
                        error: { type: 'string' },
                    },
                    required: ['name', 'error'],
                },
            },
        },
        required: ['created', 'count'],
    },
    generateTests: {
        type: 'object',
        properties: {
            testCode: { type: 'string' },
            message: { type: 'string' },
        },
        required: ['testCode', 'message'],
    },
    cloudSync: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            action: { type: 'string', enum: ['push', 'pull', 'status'] },
            message: { type: 'string' },
            pushed: { type: 'number' },
            pulled: { type: 'number' },
            errors: { type: 'number' },
            dryRun: { type: 'boolean' },
            connected: { type: 'boolean' },
            local: { type: 'object', properties: { count: { type: 'number' } } },
            cloud: { type: 'object', properties: { count: { type: 'number' } } },
            delta: { type: 'number' },
            hasMore: { type: 'boolean' },
            hint: { type: 'string' },
        },
        required: ['success'],
    },
    agentRegister: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            message: { type: 'string' },
            agent: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    type: { type: 'string' },
                    name: { type: 'string' },
                    version: { type: 'string' },
                    status: { type: 'string' },
                    capabilities: { type: 'object' },
                    createdAt: { type: 'string' },
                    lastHeartbeat: { type: 'string' },
                    pendingMessages: { type: 'number' },
                },
                required: ['id', 'type', 'status'],
            },
            error: { type: 'string' },
            hint: { type: 'string' },
        },
        required: ['success'],
    },
    memeshMetrics: {
        type: 'object',
        properties: {
            session: {
                type: 'object',
                properties: {
                    current: { type: 'object' },
                    lastSessionCached: { type: 'boolean' },
                },
            },
            routing: {
                type: 'object',
                properties: {
                    configLoaded: { type: 'boolean' },
                    modelRules: { type: 'number' },
                    backgroundRules: { type: 'number' },
                    planningEnforcement: { type: 'boolean' },
                    dryRunGate: { type: 'boolean' },
                    recentAuditEntries: { type: 'array', items: { type: 'string' } },
                },
            },
            memory: {
                type: 'object',
                properties: {
                    knowledgeGraphExists: { type: 'boolean' },
                    dbSizeKB: { type: 'number' },
                },
            },
        },
    },
};
//# sourceMappingURL=OutputSchemas.js.map