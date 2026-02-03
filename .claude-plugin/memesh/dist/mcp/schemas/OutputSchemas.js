export const OutputSchemas = {
    buddyDo: {
        type: 'object',
        properties: {
            routing: {
                type: 'object',
                properties: {
                    approved: { type: 'boolean' },
                    message: { type: 'string' },
                    capabilityFocus: {
                        type: 'array',
                        items: { type: 'string' },
                    },
                    complexity: {
                        type: 'string',
                        enum: ['simple', 'medium', 'complex'],
                    },
                    estimatedTokens: { type: 'number' },
                    estimatedCost: { type: 'number' },
                },
                required: ['approved', 'message'],
            },
            enhancedPrompt: {
                type: 'object',
                properties: {
                    systemPrompt: { type: 'string' },
                    userPrompt: { type: 'string' },
                    suggestedModel: { type: 'string' },
                },
            },
            stats: {
                type: 'object',
                properties: {
                    durationMs: { type: 'number' },
                    estimatedTokens: { type: 'number' },
                },
            },
        },
        required: ['routing'],
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
    getSessionHealth: {
        type: 'object',
        properties: {
            status: {
                type: 'string',
                enum: ['healthy', 'degraded', 'unhealthy'],
            },
            tokenUsagePercentage: { type: 'number' },
            warnings: {
                type: 'array',
                items: { type: 'string' },
            },
            recommendations: {
                type: 'array',
                items: { type: 'string' },
            },
            timestamp: { type: 'string' },
        },
        required: ['status', 'tokenUsagePercentage', 'timestamp'],
    },
    getWorkflowGuidance: {
        type: 'object',
        properties: {
            currentPhase: { type: 'string' },
            recommendations: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        action: { type: 'string' },
                        priority: {
                            type: 'string',
                            enum: ['low', 'medium', 'high', 'critical'],
                        },
                        confidence: { type: 'number' },
                        suggestedAgent: { type: 'string' },
                        reasoning: { type: 'string' },
                    },
                    required: ['action', 'priority'],
                },
            },
            nextSteps: {
                type: 'array',
                items: { type: 'string' },
            },
        },
        required: ['currentPhase', 'recommendations'],
    },
    generateSmartPlan: {
        type: 'object',
        properties: {
            planId: { type: 'string' },
            featureDescription: { type: 'string' },
            tasks: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        estimatedDuration: { type: 'string' },
                        requiredCapabilities: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                        dependencies: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                        testCriteria: {
                            type: 'array',
                            items: { type: 'string' },
                        },
                    },
                    required: ['id', 'title', 'description'],
                },
            },
            totalEstimatedDuration: { type: 'string' },
            risks: {
                type: 'array',
                items: { type: 'string' },
            },
        },
        required: ['planId', 'featureDescription', 'tasks'],
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
    a2aSendTask: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            targetAgentId: { type: 'string' },
            task: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    state: {
                        type: 'string',
                        enum: ['SUBMITTED', 'WORKING', 'INPUT_REQUIRED', 'COMPLETED', 'FAILED', 'CANCELED', 'REJECTED'],
                    },
                    name: { type: 'string' },
                    priority: {
                        type: 'string',
                        enum: ['low', 'normal', 'high', 'urgent'],
                    },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                },
                required: ['id', 'state', 'createdAt', 'updatedAt'],
            },
        },
        required: ['success', 'targetAgentId', 'task'],
    },
    a2aGetTask: {
        type: 'object',
        properties: {
            task: {
                type: 'object',
                properties: {
                    id: { type: 'string' },
                    state: {
                        type: 'string',
                        enum: ['SUBMITTED', 'WORKING', 'INPUT_REQUIRED', 'COMPLETED', 'FAILED', 'CANCELED', 'REJECTED'],
                    },
                    name: { type: 'string' },
                    description: { type: 'string' },
                    priority: {
                        type: 'string',
                        enum: ['low', 'normal', 'high', 'urgent'],
                    },
                    createdAt: { type: 'string' },
                    updatedAt: { type: 'string' },
                    sessionId: { type: 'string' },
                    messageCount: { type: 'number' },
                    artifactCount: { type: 'number' },
                },
                required: ['id', 'state', 'createdAt', 'updatedAt'],
            },
        },
        required: ['task'],
    },
    a2aListTasks: {
        type: 'object',
        properties: {
            tasks: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        state: {
                            type: 'string',
                            enum: ['SUBMITTED', 'WORKING', 'INPUT_REQUIRED', 'COMPLETED', 'FAILED', 'CANCELED', 'REJECTED'],
                        },
                        name: { type: 'string' },
                        priority: {
                            type: 'string',
                            enum: ['low', 'normal', 'high', 'urgent'],
                        },
                        createdAt: { type: 'string' },
                        updatedAt: { type: 'string' },
                        messageCount: { type: 'number' },
                        artifactCount: { type: 'number' },
                    },
                    required: ['id', 'state', 'createdAt', 'updatedAt', 'messageCount', 'artifactCount'],
                },
            },
            count: { type: 'number' },
        },
        required: ['tasks', 'count'],
    },
    a2aListAgents: {
        type: 'object',
        properties: {
            agents: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        agentId: { type: 'string' },
                        baseUrl: { type: 'string' },
                        port: { type: 'number' },
                        status: {
                            type: 'string',
                            enum: ['active', 'inactive', 'stale'],
                        },
                        lastHeartbeat: { type: 'string' },
                        capabilities: { type: 'object' },
                        metadata: { type: 'object' },
                    },
                    required: ['agentId', 'baseUrl', 'port', 'status', 'lastHeartbeat'],
                },
            },
            count: { type: 'number' },
        },
        required: ['agents', 'count'],
    },
    a2aReportResult: {
        type: 'object',
        properties: {
            success: { type: 'boolean' },
            taskId: { type: 'string' },
            status: {
                type: 'string',
                enum: ['COMPLETED', 'FAILED'],
            },
        },
        required: ['success', 'taskId', 'status'],
    },
    generateTests: {
        type: 'object',
        properties: {
            testCode: { type: 'string' },
            message: { type: 'string' },
        },
        required: ['testCode', 'message'],
    },
};
//# sourceMappingURL=OutputSchemas.js.map