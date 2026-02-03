export declare const OutputSchemas: {
    buddyDo: {
        type: "object";
        properties: {
            routing: {
                type: string;
                properties: {
                    approved: {
                        type: string;
                    };
                    message: {
                        type: string;
                    };
                    capabilityFocus: {
                        type: string;
                        items: {
                            type: string;
                        };
                    };
                    complexity: {
                        type: string;
                        enum: string[];
                    };
                    estimatedTokens: {
                        type: string;
                    };
                    estimatedCost: {
                        type: string;
                    };
                };
                required: string[];
            };
            enhancedPrompt: {
                type: string;
                properties: {
                    systemPrompt: {
                        type: string;
                    };
                    userPrompt: {
                        type: string;
                    };
                    suggestedModel: {
                        type: string;
                    };
                };
            };
            stats: {
                type: string;
                properties: {
                    durationMs: {
                        type: string;
                    };
                    estimatedTokens: {
                        type: string;
                    };
                };
            };
        };
        required: string[];
    };
    buddyRemember: {
        type: "object";
        properties: {
            query: {
                type: string;
            };
            count: {
                type: string;
            };
            memories: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                        };
                        content: {
                            type: string;
                        };
                        type: {
                            type: string;
                        };
                        timestamp: {
                            type: string;
                        };
                        relevance: {
                            type: string;
                        };
                    };
                };
            };
            suggestions: {
                type: string;
                items: {
                    type: string;
                };
            };
        };
        required: string[];
    };
    buddyHelp: {
        type: "object";
        properties: {
            commands: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        name: {
                            type: string;
                        };
                        description: {
                            type: string;
                        };
                        usage: {
                            type: string;
                        };
                        examples: {
                            type: string;
                            items: {
                                type: string;
                            };
                        };
                    };
                    required: string[];
                };
            };
        };
        required: string[];
    };
    getSessionHealth: {
        type: "object";
        properties: {
            status: {
                type: string;
                enum: string[];
            };
            tokenUsagePercentage: {
                type: string;
            };
            warnings: {
                type: string;
                items: {
                    type: string;
                };
            };
            recommendations: {
                type: string;
                items: {
                    type: string;
                };
            };
            timestamp: {
                type: string;
            };
        };
        required: string[];
    };
    getWorkflowGuidance: {
        type: "object";
        properties: {
            currentPhase: {
                type: string;
            };
            recommendations: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        action: {
                            type: string;
                        };
                        priority: {
                            type: string;
                            enum: string[];
                        };
                        confidence: {
                            type: string;
                        };
                        suggestedAgent: {
                            type: string;
                        };
                        reasoning: {
                            type: string;
                        };
                    };
                    required: string[];
                };
            };
            nextSteps: {
                type: string;
                items: {
                    type: string;
                };
            };
        };
        required: string[];
    };
    generateSmartPlan: {
        type: "object";
        properties: {
            planId: {
                type: string;
            };
            featureDescription: {
                type: string;
            };
            tasks: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                        };
                        title: {
                            type: string;
                        };
                        description: {
                            type: string;
                        };
                        estimatedDuration: {
                            type: string;
                        };
                        requiredCapabilities: {
                            type: string;
                            items: {
                                type: string;
                            };
                        };
                        dependencies: {
                            type: string;
                            items: {
                                type: string;
                            };
                        };
                        testCriteria: {
                            type: string;
                            items: {
                                type: string;
                            };
                        };
                    };
                    required: string[];
                };
            };
            totalEstimatedDuration: {
                type: string;
            };
            risks: {
                type: string;
                items: {
                    type: string;
                };
            };
        };
        required: string[];
    };
    hookToolUse: {
        type: "object";
        properties: {
            success: {
                type: string;
            };
            message: {
                type: string;
            };
            recorded: {
                type: string;
                properties: {
                    toolName: {
                        type: string;
                    };
                    timestamp: {
                        type: string;
                    };
                    success: {
                        type: string;
                    };
                };
            };
        };
        required: string[];
    };
    buddyRecordMistake: {
        type: "object";
        properties: {
            success: {
                type: string;
            };
            mistakeId: {
                type: string;
            };
            message: {
                type: string;
            };
            details: {
                type: string;
                properties: {
                    action: {
                        type: string;
                    };
                    errorType: {
                        type: string;
                    };
                    userCorrection: {
                        type: string;
                    };
                    correctMethod: {
                        type: string;
                    };
                    impact: {
                        type: string;
                    };
                    preventionMethod: {
                        type: string;
                    };
                    timestamp: {
                        type: string;
                    };
                };
                required: string[];
            };
        };
        required: string[];
    };
    createEntities: {
        type: "object";
        properties: {
            created: {
                type: string;
                items: {
                    type: string;
                };
                description: string;
            };
            count: {
                type: string;
            };
            errors: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        name: {
                            type: string;
                        };
                        error: {
                            type: string;
                        };
                    };
                    required: string[];
                };
            };
        };
        required: string[];
    };
    a2aSendTask: {
        type: "object";
        properties: {
            success: {
                type: string;
            };
            targetAgentId: {
                type: string;
            };
            task: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    state: {
                        type: string;
                        enum: string[];
                    };
                    name: {
                        type: string;
                    };
                    priority: {
                        type: string;
                        enum: string[];
                    };
                    createdAt: {
                        type: string;
                    };
                    updatedAt: {
                        type: string;
                    };
                };
                required: string[];
            };
        };
        required: string[];
    };
    a2aGetTask: {
        type: "object";
        properties: {
            task: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    state: {
                        type: string;
                        enum: string[];
                    };
                    name: {
                        type: string;
                    };
                    description: {
                        type: string;
                    };
                    priority: {
                        type: string;
                        enum: string[];
                    };
                    createdAt: {
                        type: string;
                    };
                    updatedAt: {
                        type: string;
                    };
                    sessionId: {
                        type: string;
                    };
                    messageCount: {
                        type: string;
                    };
                    artifactCount: {
                        type: string;
                    };
                };
                required: string[];
            };
        };
        required: string[];
    };
    a2aListTasks: {
        type: "object";
        properties: {
            tasks: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        id: {
                            type: string;
                        };
                        state: {
                            type: string;
                            enum: string[];
                        };
                        name: {
                            type: string;
                        };
                        priority: {
                            type: string;
                            enum: string[];
                        };
                        createdAt: {
                            type: string;
                        };
                        updatedAt: {
                            type: string;
                        };
                        messageCount: {
                            type: string;
                        };
                        artifactCount: {
                            type: string;
                        };
                    };
                    required: string[];
                };
            };
            count: {
                type: string;
            };
        };
        required: string[];
    };
    a2aListAgents: {
        type: "object";
        properties: {
            agents: {
                type: string;
                items: {
                    type: string;
                    properties: {
                        agentId: {
                            type: string;
                        };
                        baseUrl: {
                            type: string;
                        };
                        port: {
                            type: string;
                        };
                        status: {
                            type: string;
                            enum: string[];
                        };
                        lastHeartbeat: {
                            type: string;
                        };
                        capabilities: {
                            type: string;
                        };
                        metadata: {
                            type: string;
                        };
                    };
                    required: string[];
                };
            };
            count: {
                type: string;
            };
        };
        required: string[];
    };
    a2aReportResult: {
        type: "object";
        properties: {
            success: {
                type: string;
            };
            taskId: {
                type: string;
            };
            status: {
                type: string;
                enum: string[];
            };
        };
        required: string[];
    };
    generateTests: {
        type: "object";
        properties: {
            testCode: {
                type: string;
            };
            message: {
                type: string;
            };
        };
        required: string[];
    };
};
export type BuddyDoOutput = {
    routing: {
        approved: boolean;
        message: string;
        capabilityFocus?: string[];
        complexity?: 'simple' | 'medium' | 'complex';
        estimatedTokens?: number;
        estimatedCost?: number;
    };
    enhancedPrompt?: {
        systemPrompt?: string;
        userPrompt?: string;
        suggestedModel?: string;
    };
    stats?: {
        durationMs?: number;
        estimatedTokens?: number;
    };
};
export type BuddyRememberOutput = {
    query: string;
    count: number;
    memories?: Array<{
        id?: string;
        content?: string;
        type?: string;
        timestamp?: string;
        relevance?: number;
    }>;
    suggestions?: string[];
};
export type BuddyHelpOutput = {
    commands: Array<{
        name: string;
        description: string;
        usage?: string;
        examples?: string[];
    }>;
};
export type SessionHealthOutput = {
    status: 'healthy' | 'degraded' | 'unhealthy';
    tokenUsagePercentage: number;
    timestamp: string;
    warnings?: string[];
    recommendations?: string[];
};
export type WorkflowGuidanceOutput = {
    currentPhase: string;
    recommendations: Array<{
        action: string;
        priority: 'low' | 'medium' | 'high' | 'critical';
        confidence?: number;
        suggestedAgent?: string;
        reasoning?: string;
    }>;
    nextSteps?: string[];
};
export type SmartPlanOutput = {
    planId: string;
    featureDescription: string;
    tasks: Array<{
        id: string;
        title: string;
        description: string;
        estimatedDuration?: string;
        requiredCapabilities?: string[];
        dependencies?: string[];
        testCriteria?: string[];
    }>;
    totalEstimatedDuration?: string;
    risks?: string[];
};
export type HookToolUseOutput = {
    success: boolean;
    message: string;
    recorded?: {
        toolName?: string;
        timestamp?: string;
        success?: boolean;
    };
};
export type BuddyRecordMistakeOutput = {
    success: boolean;
    message: string;
    mistakeId?: string;
    details?: {
        action: string;
        errorType: string;
        userCorrection: string;
        correctMethod: string;
        impact: string;
        preventionMethod: string;
        timestamp: string;
    };
};
export type CreateEntitiesOutput = {
    created: string[];
    count: number;
    errors?: Array<{
        name: string;
        error: string;
    }>;
};
export type A2ASendTaskOutput = {
    success: boolean;
    targetAgentId: string;
    task: {
        id: string;
        state: 'SUBMITTED' | 'WORKING' | 'INPUT_REQUIRED' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'REJECTED';
        createdAt: string;
        updatedAt: string;
        name?: string;
        priority?: 'low' | 'normal' | 'high' | 'urgent';
    };
};
export type A2AGetTaskOutput = {
    task: {
        id: string;
        state: 'SUBMITTED' | 'WORKING' | 'INPUT_REQUIRED' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'REJECTED';
        createdAt: string;
        updatedAt: string;
        name?: string;
        description?: string;
        priority?: 'low' | 'normal' | 'high' | 'urgent';
        sessionId?: string;
        messageCount?: number;
        artifactCount?: number;
    };
};
export type A2AListTasksOutput = {
    tasks: Array<{
        id: string;
        state: 'SUBMITTED' | 'WORKING' | 'INPUT_REQUIRED' | 'COMPLETED' | 'FAILED' | 'CANCELED' | 'REJECTED';
        createdAt: string;
        updatedAt: string;
        messageCount: number;
        artifactCount: number;
        name?: string;
        priority?: 'low' | 'normal' | 'high' | 'urgent';
    }>;
    count: number;
};
export type A2AListAgentsOutput = {
    agents: Array<{
        agentId: string;
        baseUrl: string;
        port: number;
        status: 'active' | 'inactive' | 'stale';
        lastHeartbeat: string;
        capabilities?: Record<string, unknown>;
        metadata?: Record<string, unknown>;
    }>;
    count: number;
};
export type GenerateTestsOutput = {
    testCode: string;
    message: string;
};
//# sourceMappingURL=OutputSchemas.d.ts.map