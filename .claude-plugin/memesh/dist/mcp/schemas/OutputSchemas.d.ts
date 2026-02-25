export declare const OutputSchemas: {
    buddyDo: {
        type: "object";
        properties: {
            message: {
                type: string;
                description: string;
            };
            confirmationRequired: {
                type: string;
                description: string;
            };
            stats: {
                type: string;
                properties: {
                    durationMs: {
                        type: string;
                    };
                    taskType: {
                        type: string;
                    };
                    relatedContextCount: {
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
    cloudSync: {
        type: "object";
        properties: {
            success: {
                type: string;
            };
            action: {
                type: string;
                enum: string[];
            };
            message: {
                type: string;
            };
            pushed: {
                type: string;
            };
            pulled: {
                type: string;
            };
            errors: {
                type: string;
            };
            dryRun: {
                type: string;
            };
            connected: {
                type: string;
            };
            local: {
                type: string;
                properties: {
                    count: {
                        type: string;
                    };
                };
            };
            cloud: {
                type: string;
                properties: {
                    count: {
                        type: string;
                    };
                };
            };
            delta: {
                type: string;
            };
            hasMore: {
                type: string;
            };
            hint: {
                type: string;
            };
        };
        required: string[];
    };
    agentRegister: {
        type: "object";
        properties: {
            success: {
                type: string;
            };
            message: {
                type: string;
            };
            agent: {
                type: string;
                properties: {
                    id: {
                        type: string;
                    };
                    type: {
                        type: string;
                    };
                    name: {
                        type: string;
                    };
                    version: {
                        type: string;
                    };
                    status: {
                        type: string;
                    };
                    capabilities: {
                        type: string;
                    };
                    createdAt: {
                        type: string;
                    };
                    lastHeartbeat: {
                        type: string;
                    };
                    pendingMessages: {
                        type: string;
                    };
                };
                required: string[];
            };
            error: {
                type: string;
            };
            hint: {
                type: string;
            };
        };
        required: string[];
    };
    memeshMetrics: {
        type: "object";
        properties: {
            session: {
                type: string;
                properties: {
                    current: {
                        type: string;
                    };
                    lastSessionCached: {
                        type: string;
                    };
                };
            };
            routing: {
                type: string;
                properties: {
                    configLoaded: {
                        type: string;
                    };
                    modelRules: {
                        type: string;
                    };
                    backgroundRules: {
                        type: string;
                    };
                    planningEnforcement: {
                        type: string;
                    };
                    dryRunGate: {
                        type: string;
                    };
                    recentAuditEntries: {
                        type: string;
                        items: {
                            type: string;
                        };
                    };
                };
            };
            memory: {
                type: string;
                properties: {
                    knowledgeGraphExists: {
                        type: string;
                    };
                    dbSizeKB: {
                        type: string;
                    };
                };
            };
        };
    };
};
export type BuddyDoOutput = {
    message: string;
    confirmationRequired: boolean;
    stats?: {
        durationMs?: number;
        taskType?: string;
        relatedContextCount?: number;
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
export type GenerateTestsOutput = {
    testCode: string;
    message: string;
};
//# sourceMappingURL=OutputSchemas.d.ts.map